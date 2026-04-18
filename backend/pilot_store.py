from __future__ import annotations

import json
import re
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

DEFAULT_SCOPE = "default"
DEFAULT_DOC_KEY = "default"
APPROVED_ALIAS_STATUS = "approved"
ACTIVE_REFERENCE_STATUS = "active"

_CJK_RE = re.compile(r"[\u4e00-\u9fff]")
_WHITESPACE_RE = re.compile(r"\s+")
_EN_COMPACT_RE = re.compile(r"[^a-z0-9]+")
_ZH_COMPACT_RE = re.compile(r"[\s\u3000()（）\[\]{}\-_/.,;:]+")
_CAS_LIKE_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def infer_locale(text: Optional[str]) -> str:
    return "zh" if text and _CJK_RE.search(text) else "en"


def normalize_query_text(text: Optional[str], *, locale: Optional[str] = None) -> str:
    locale = locale or infer_locale(text)
    normalized = _WHITESPACE_RE.sub(" ", (text or "").strip())
    if locale == "en":
        return normalized.lower()
    return normalized


def normalize_compact_text(text: Optional[str], *, locale: Optional[str] = None) -> str:
    locale = locale or infer_locale(text)
    normalized = normalize_query_text(text, locale=locale)
    if locale == "en":
        return _EN_COMPACT_RE.sub("", normalized)
    return _ZH_COMPACT_RE.sub("", normalized)


class PilotStore:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self._conn: Optional[sqlite3.Connection] = None
        self._lock = threading.RLock()

    def connect(self) -> "PilotStore":
        with self._lock:
            if self._conn is not None:
                return self

            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA foreign_keys=ON")
            self._conn = conn
            self._init_schema_locked()
            return self

    def close(self) -> None:
        with self._lock:
            if self._conn is not None:
                self._conn.close()
                self._conn = None

    def _init_schema_locked(self) -> None:
        conn = self._require_conn()
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS pilot_documents (
              scope TEXT NOT NULL,
              doc_type TEXT NOT NULL,
              doc_key TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              PRIMARY KEY (scope, doc_type, doc_key)
            );

            CREATE TABLE IF NOT EXISTS dictionary_entries (
              cas_number TEXT PRIMARY KEY,
              name_en TEXT,
              name_zh TEXT,
              name_en_norm TEXT,
              name_zh_norm TEXT,
              name_en_compact TEXT,
              name_zh_compact TEXT,
              notes TEXT,
              source TEXT NOT NULL DEFAULT 'manual',
              updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_dictionary_entries_name_en_norm
              ON dictionary_entries(name_en_norm);
            CREATE INDEX IF NOT EXISTS idx_dictionary_entries_name_zh_norm
              ON dictionary_entries(name_zh_norm);
            CREATE INDEX IF NOT EXISTS idx_dictionary_entries_name_en_compact
              ON dictionary_entries(name_en_compact);
            CREATE INDEX IF NOT EXISTS idx_dictionary_entries_name_zh_compact
              ON dictionary_entries(name_zh_compact);

            CREATE TABLE IF NOT EXISTS dictionary_aliases (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              alias_text TEXT NOT NULL,
              alias_norm TEXT NOT NULL,
              locale TEXT NOT NULL,
              cas_number TEXT NOT NULL,
              source TEXT NOT NULL DEFAULT 'manual',
              confidence REAL NOT NULL DEFAULT 1,
              status TEXT NOT NULL DEFAULT 'approved',
              notes TEXT,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL,
              hit_count INTEGER NOT NULL DEFAULT 1,
              UNIQUE(alias_norm, locale, cas_number)
            );
            CREATE INDEX IF NOT EXISTS idx_dictionary_aliases_lookup
              ON dictionary_aliases(status, locale, alias_norm);

            CREATE TABLE IF NOT EXISTS dictionary_miss_queries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              query_text TEXT NOT NULL,
              query_norm TEXT NOT NULL,
              query_kind TEXT NOT NULL,
              endpoint TEXT NOT NULL,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL,
              hit_count INTEGER NOT NULL DEFAULT 1,
              resolution_status TEXT NOT NULL DEFAULT 'open',
              resolved_cas TEXT,
              context_json TEXT
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_miss_queries_unique
              ON dictionary_miss_queries(query_norm, query_kind, endpoint);

            CREATE TABLE IF NOT EXISTS dictionary_reference_links (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              cas_number TEXT NOT NULL,
              cid INTEGER,
              link_type TEXT NOT NULL,
              label TEXT NOT NULL,
              url TEXT NOT NULL,
              source TEXT NOT NULL DEFAULT 'manual',
              priority INTEGER NOT NULL DEFAULT 50,
              status TEXT NOT NULL DEFAULT 'active',
              updated_at TEXT NOT NULL,
              UNIQUE(cas_number, link_type, url)
            );
            CREATE INDEX IF NOT EXISTS idx_dictionary_reference_links_lookup
              ON dictionary_reference_links(cas_number, status, priority);
            """
        )
        conn.commit()

    def _require_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self.connect()
        assert self._conn is not None
        return self._conn

    def _fetchone(self, sql: str, params: Iterable[Any] = ()) -> Optional[sqlite3.Row]:
        with self._lock:
            cursor = self._require_conn().execute(sql, tuple(params))
            return cursor.fetchone()

    def _fetchall(self, sql: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
        with self._lock:
            cursor = self._require_conn().execute(sql, tuple(params))
            return cursor.fetchall()

    def _execute(self, sql: str, params: Iterable[Any] = ()) -> None:
        with self._lock:
            conn = self._require_conn()
            conn.execute(sql, tuple(params))
            conn.commit()

    # Workspace documents -------------------------------------------------
    def get_document(
        self,
        doc_type: str,
        *,
        scope: str = DEFAULT_SCOPE,
        doc_key: str = DEFAULT_DOC_KEY,
    ) -> Optional[dict[str, Any]]:
        row = self._fetchone(
            """
            SELECT payload_json, updated_at
            FROM pilot_documents
            WHERE scope = ? AND doc_type = ? AND doc_key = ?
            """,
            (scope, doc_type, doc_key),
        )
        if row is None:
            return None
        return {
            "payload": json.loads(row["payload_json"]),
            "updatedAt": row["updated_at"],
        }

    def put_document(
        self,
        doc_type: str,
        payload: Any,
        *,
        scope: str = DEFAULT_SCOPE,
        doc_key: str = DEFAULT_DOC_KEY,
    ) -> dict[str, Any]:
        updated_at = utc_now_iso()
        payload_json = json.dumps(payload, ensure_ascii=False)
        self._execute(
            """
            INSERT INTO pilot_documents(scope, doc_type, doc_key, payload_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(scope, doc_type, doc_key) DO UPDATE SET
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
            """,
            (scope, doc_type, doc_key, payload_json, updated_at),
        )
        return {"payload": payload, "updatedAt": updated_at}

    def delete_document(
        self,
        doc_type: str,
        *,
        scope: str = DEFAULT_SCOPE,
        doc_key: str = DEFAULT_DOC_KEY,
    ) -> None:
        self._execute(
            """
            DELETE FROM pilot_documents
            WHERE scope = ? AND doc_type = ? AND doc_key = ?
            """,
            (scope, doc_type, doc_key),
        )

    # Manual dictionary entries ------------------------------------------
    def upsert_dictionary_entry(
        self,
        cas_number: str,
        *,
        name_en: Optional[str] = None,
        name_zh: Optional[str] = None,
        notes: str = "",
        source: str = "manual",
    ) -> dict[str, Any]:
        updated_at = utc_now_iso()
        name_en_norm = normalize_query_text(name_en, locale="en") if name_en else ""
        name_zh_norm = normalize_query_text(name_zh, locale="zh") if name_zh else ""
        name_en_compact = normalize_compact_text(name_en, locale="en") if name_en else ""
        name_zh_compact = normalize_compact_text(name_zh, locale="zh") if name_zh else ""
        self._execute(
            """
            INSERT INTO dictionary_entries(
              cas_number,
              name_en,
              name_zh,
              name_en_norm,
              name_zh_norm,
              name_en_compact,
              name_zh_compact,
              notes,
              source,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(cas_number) DO UPDATE SET
              name_en = excluded.name_en,
              name_zh = excluded.name_zh,
              name_en_norm = excluded.name_en_norm,
              name_zh_norm = excluded.name_zh_norm,
              name_en_compact = excluded.name_en_compact,
              name_zh_compact = excluded.name_zh_compact,
              notes = excluded.notes,
              source = excluded.source,
              updated_at = excluded.updated_at
            """,
            (
                cas_number,
                name_en,
                name_zh,
                name_en_norm,
                name_zh_norm,
                name_en_compact,
                name_zh_compact,
                notes,
                source,
                updated_at,
            ),
        )
        return self.get_manual_entry_by_cas(cas_number) or {}

    def get_manual_entry_by_cas(self, cas_number: str) -> Optional[dict[str, Any]]:
        row = self._fetchone(
            """
            SELECT cas_number, name_en, name_zh, notes, source, updated_at
            FROM dictionary_entries
            WHERE cas_number = ?
            """,
            (cas_number,),
        )
        return dict(row) if row is not None else None

    def get_manual_entry_by_name(
        self,
        name: str,
        locale: str,
        *,
        allow_compact: bool = True,
    ) -> Optional[dict[str, Any]]:
        if not name:
            return None
        if locale == "zh":
            norm_column = "name_zh_norm"
            compact_column = "name_zh_compact"
            normalized = normalize_query_text(name, locale="zh")
            compact = normalize_compact_text(name, locale="zh")
        else:
            norm_column = "name_en_norm"
            compact_column = "name_en_compact"
            normalized = normalize_query_text(name, locale="en")
            compact = normalize_compact_text(name, locale="en")

        row = self._fetchone(
            f"""
            SELECT cas_number, name_en, name_zh, notes, source, updated_at
            FROM dictionary_entries
            WHERE {norm_column} = ?
            LIMIT 1
            """,
            (normalized,),
        )
        if row is not None:
            return dict(row)

        if allow_compact and compact:
            row = self._fetchone(
                f"""
                SELECT cas_number, name_en, name_zh, notes, source, updated_at
                FROM dictionary_entries
                WHERE {compact_column} = ?
                LIMIT 1
                """,
                (compact,),
            )
            if row is not None:
                return dict(row)
        return None

    def list_manual_entries(self) -> list[dict[str, Any]]:
        rows = self._fetchall(
            """
            SELECT cas_number, name_en, name_zh, notes, source, updated_at
            FROM dictionary_entries
            ORDER BY cas_number
            """
        )
        return [dict(row) for row in rows]

    # Alias workflow ------------------------------------------------------
    def upsert_alias(
        self,
        alias_text: str,
        locale: str,
        cas_number: str,
        *,
        source: str = "manual",
        confidence: float = 1.0,
        status: str = APPROVED_ALIAS_STATUS,
        notes: str = "",
    ) -> Optional[dict[str, Any]]:
        alias_text = (alias_text or "").strip()
        if not alias_text:
            return None

        alias_norm = normalize_compact_text(alias_text, locale=locale)
        if not alias_norm:
            return None

        now = utc_now_iso()
        with self._lock:
            conn = self._require_conn()
            existing = conn.execute(
                """
                SELECT id, status, source, confidence, hit_count
                FROM dictionary_aliases
                WHERE alias_norm = ? AND locale = ? AND cas_number = ?
                """,
                (alias_norm, locale, cas_number),
            ).fetchone()

            if existing is None:
                conn.execute(
                    """
                    INSERT INTO dictionary_aliases(
                      alias_text,
                      alias_norm,
                      locale,
                      cas_number,
                      source,
                      confidence,
                      status,
                      notes,
                      first_seen_at,
                      last_seen_at,
                      hit_count
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    """,
                    (
                        alias_text,
                        alias_norm,
                        locale,
                        cas_number,
                        source,
                        confidence,
                        status,
                        notes,
                        now,
                        now,
                    ),
                )
            else:
                next_status = existing["status"]
                if next_status not in {"approved", "rejected"} and status:
                    next_status = status
                conn.execute(
                    """
                    UPDATE dictionary_aliases
                    SET
                      alias_text = ?,
                      source = ?,
                      confidence = ?,
                      status = ?,
                      notes = CASE
                        WHEN ? != '' THEN ?
                        ELSE notes
                      END,
                      last_seen_at = ?,
                      hit_count = ?
                    WHERE alias_norm = ? AND locale = ? AND cas_number = ?
                    """,
                    (
                        alias_text,
                        existing["source"] or source,
                        max(float(existing["confidence"] or 0), float(confidence or 0)),
                        next_status,
                        notes,
                        notes,
                        now,
                        int(existing["hit_count"] or 0) + 1,
                        alias_norm,
                        locale,
                        cas_number,
                    ),
                )
            conn.commit()

        return self.get_alias_exact(alias_text, locale, statuses=None)

    def get_alias_exact(
        self,
        alias_text: str,
        locale: str,
        *,
        statuses: Optional[Iterable[str]] = (APPROVED_ALIAS_STATUS,),
    ) -> Optional[dict[str, Any]]:
        if not alias_text:
            return None
        alias_norm = normalize_compact_text(alias_text, locale=locale)
        if not alias_norm:
            return None

        params: list[Any] = [alias_norm, locale]
        where_status = ""
        if statuses:
            status_list = list(statuses)
            where_status = f" AND status IN ({','.join('?' for _ in status_list)})"
            params.extend(status_list)

        row = self._fetchone(
            f"""
            SELECT alias_text, locale, cas_number, source, confidence, status, notes, last_seen_at, hit_count
            FROM dictionary_aliases
            WHERE alias_norm = ? AND locale = ?{where_status}
            ORDER BY
              CASE status
                WHEN 'approved' THEN 0
                WHEN 'pending' THEN 1
                ELSE 2
              END,
              confidence DESC,
              hit_count DESC
            LIMIT 1
            """,
            params,
        )
        if row is None:
            return None

        if statuses and APPROVED_ALIAS_STATUS in statuses:
            with self._lock:
                conn = self._require_conn()
                conn.execute(
                    """
                    UPDATE dictionary_aliases
                    SET last_seen_at = ?, hit_count = hit_count + 1
                    WHERE alias_norm = ? AND locale = ? AND cas_number = ?
                    """,
                    (utc_now_iso(), alias_norm, locale, row["cas_number"]),
                )
                conn.commit()

        return dict(row)

    def list_aliases(
        self,
        *,
        status: Optional[str] = None,
        locale: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT alias_text, locale, cas_number, source, confidence, status, notes, first_seen_at, last_seen_at, hit_count
            FROM dictionary_aliases
            WHERE 1 = 1
        """
        params: list[Any] = []
        if status:
            sql += " AND status = ?"
            params.append(status)
        if locale:
            sql += " AND locale = ?"
            params.append(locale)
        sql += " ORDER BY status, hit_count DESC, alias_text ASC"
        rows = self._fetchall(sql, params)
        return [dict(row) for row in rows]

    def capture_alias_candidates(
        self,
        cas_number: str,
        synonyms: Iterable[str],
        *,
        source: str = "pubchem_synonym",
        confidence: float = 0.35,
    ) -> None:
        seen_norms: set[tuple[str, str]] = set()
        for synonym in synonyms:
            alias_text = (synonym or "").strip()
            if not alias_text:
                continue
            if len(alias_text) > 120 or _CAS_LIKE_RE.match(alias_text):
                continue
            locale = infer_locale(alias_text)
            alias_norm = normalize_compact_text(alias_text, locale=locale)
            if not alias_norm:
                continue
            dedupe_key = (locale, alias_norm)
            if dedupe_key in seen_norms:
                continue
            seen_norms.add(dedupe_key)
            self.upsert_alias(
                alias_text,
                locale,
                cas_number,
                source=source,
                confidence=confidence,
                status="pending",
            )

    # Miss-query workflow -------------------------------------------------
    def record_miss_query(
        self,
        query_text: str,
        query_kind: str,
        endpoint: str,
        *,
        resolution_status: str = "open",
        resolved_cas: Optional[str] = None,
        context: Optional[dict[str, Any]] = None,
    ) -> Optional[dict[str, Any]]:
        query_text = (query_text or "").strip()
        if not query_text:
            return None
        locale = infer_locale(query_text)
        query_norm = normalize_query_text(query_text, locale=locale)
        now = utc_now_iso()
        context_json = json.dumps(context or {}, ensure_ascii=False)

        with self._lock:
            conn = self._require_conn()
            existing = conn.execute(
                """
                SELECT id, hit_count
                FROM dictionary_miss_queries
                WHERE query_norm = ? AND query_kind = ? AND endpoint = ?
                """,
                (query_norm, query_kind, endpoint),
            ).fetchone()

            if existing is None:
                conn.execute(
                    """
                    INSERT INTO dictionary_miss_queries(
                      query_text,
                      query_norm,
                      query_kind,
                      endpoint,
                      first_seen_at,
                      last_seen_at,
                      hit_count,
                      resolution_status,
                      resolved_cas,
                      context_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                    """,
                    (
                        query_text,
                        query_norm,
                        query_kind,
                        endpoint,
                        now,
                        now,
                        resolution_status,
                        resolved_cas,
                        context_json,
                    ),
                )
            else:
                conn.execute(
                    """
                    UPDATE dictionary_miss_queries
                    SET
                      query_text = ?,
                      last_seen_at = ?,
                      hit_count = ?,
                      resolution_status = ?,
                      resolved_cas = ?,
                      context_json = ?
                    WHERE query_norm = ? AND query_kind = ? AND endpoint = ?
                    """,
                    (
                        query_text,
                        now,
                        int(existing["hit_count"] or 0) + 1,
                        resolution_status,
                        resolved_cas,
                        context_json,
                        query_norm,
                        query_kind,
                        endpoint,
                    ),
                )
            conn.commit()

        return {
            "query": query_text,
            "queryNorm": query_norm,
            "queryKind": query_kind,
            "endpoint": endpoint,
            "resolutionStatus": resolution_status,
            "resolvedCas": resolved_cas,
        }

    def list_miss_queries(self, *, limit: int = 50) -> list[dict[str, Any]]:
        rows = self._fetchall(
            """
            SELECT
              query_text,
              query_kind,
              endpoint,
              first_seen_at,
              last_seen_at,
              hit_count,
              resolution_status,
              resolved_cas,
              context_json
            FROM dictionary_miss_queries
            ORDER BY hit_count DESC, last_seen_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        result = []
        for row in rows:
            item = dict(row)
            item["context"] = json.loads(item.pop("context_json") or "{}")
            result.append(item)
        return result

    # Reference links -----------------------------------------------------
    def upsert_reference_link(
        self,
        cas_number: str,
        *,
        link_type: str,
        label: str,
        url: str,
        source: str = "manual",
        priority: int = 50,
        status: str = ACTIVE_REFERENCE_STATUS,
        cid: Optional[int] = None,
    ) -> Optional[dict[str, Any]]:
        cas_number = (cas_number or "").strip()
        url = (url or "").strip()
        label = (label or "").strip()
        link_type = (link_type or "").strip()
        if not cas_number or not url or not label or not link_type:
            return None
        updated_at = utc_now_iso()
        self._execute(
            """
            INSERT INTO dictionary_reference_links(
              cas_number,
              cid,
              link_type,
              label,
              url,
              source,
              priority,
              status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(cas_number, link_type, url) DO UPDATE SET
              cid = excluded.cid,
              label = excluded.label,
              source = excluded.source,
              priority = excluded.priority,
              status = excluded.status,
              updated_at = excluded.updated_at
            """,
            (cas_number, cid, link_type, label, url, source, priority, status, updated_at),
        )
        links = self.list_reference_links(cas_number)
        for link in links:
            if link["url"] == url and link["linkType"] == link_type:
                return link
        return None

    def list_reference_links(
        self,
        cas_number: str,
        *,
        include_inactive: bool = False,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT cas_number, cid, link_type, label, url, source, priority, status, updated_at
            FROM dictionary_reference_links
            WHERE cas_number = ?
        """
        params: list[Any] = [cas_number]
        if not include_inactive:
            sql += " AND status = ?"
            params.append(ACTIVE_REFERENCE_STATUS)
        sql += " ORDER BY priority ASC, label ASC"
        rows = self._fetchall(sql, params)
        return [
            {
                "casNumber": row["cas_number"],
                "cid": row["cid"],
                "linkType": row["link_type"],
                "label": row["label"],
                "url": row["url"],
                "source": row["source"],
                "priority": row["priority"],
                "status": row["status"],
                "updatedAt": row["updated_at"],
            }
            for row in rows
        ]

    # Reporting -----------------------------------------------------------
    def get_dictionary_summary(self, *, limit: int = 10) -> dict[str, Any]:
        metrics = {
            "manualEntryCount": self._scalar("SELECT COUNT(*) FROM dictionary_entries"),
            "approvedAliasCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_aliases WHERE status = ?",
                (APPROVED_ALIAS_STATUS,),
            ),
            "pendingAliasCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_aliases WHERE status = ?",
                ("pending",),
            ),
            "missQueryCount": self._scalar("SELECT COUNT(*) FROM dictionary_miss_queries"),
            "openMissQueryCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_miss_queries WHERE resolution_status = ?",
                ("open",),
            ),
            "referenceLinkCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_reference_links WHERE status = ?",
                (ACTIVE_REFERENCE_STATUS,),
            ),
            "topMissQueries": self.list_miss_queries(limit=limit),
            "pendingAliases": self.list_aliases(status="pending")[:limit],
        }
        return metrics

    def export_dictionary_snapshot(self) -> dict[str, Any]:
        return {
            "exportedAt": utc_now_iso(),
            "manualEntries": self.list_manual_entries(),
            "aliases": self.list_aliases(),
            "missQueries": self.list_miss_queries(limit=500),
            "referenceLinks": [
                dict(row)
                for row in self._fetchall(
                    """
                    SELECT cas_number, cid, link_type, label, url, source, priority, status, updated_at
                    FROM dictionary_reference_links
                    ORDER BY cas_number, priority, label
                    """
                )
            ],
        }

    def _scalar(self, sql: str, params: Iterable[Any] = ()) -> int:
        row = self._fetchone(sql, params)
        if row is None:
            return 0
        return int(next(iter(row)))
