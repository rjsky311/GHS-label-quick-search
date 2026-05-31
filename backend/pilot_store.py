from __future__ import annotations

import json
import re
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

DEFAULT_SCOPE = "default"
DEFAULT_DOC_KEY = "default"
APPROVED_MANUAL_ENTRY_STATUS = "approved"
MANUAL_ENTRY_STATUS_ORDER = ("approved", "pending", "needs_evidence", "rejected")
MANUAL_ENTRY_STATUSES = set(MANUAL_ENTRY_STATUS_ORDER)
MANUAL_ENTRY_REVIEW_STATUSES = ("pending", "needs_evidence")
APPROVED_ALIAS_STATUS = "approved"
ALIAS_STATUSES = ("approved", "pending", "needs_evidence", "rejected")
ALIAS_REVIEW_STATUSES = ("pending", "needs_evidence")
ACTIVE_REFERENCE_STATUS = "active"
REFERENCE_LINK_STATUSES = {"active", "inactive"}
MISS_QUERY_STATUSES = {"open", "needs_evidence", "resolved", "ignored"}
CORRECTION_REQUEST_STATUS_ORDER = (
    "open",
    "candidate_found",
    "approved",
    "rejected",
    "ignored",
)
CORRECTION_REQUEST_STATUSES = set(CORRECTION_REQUEST_STATUS_ORDER)
CORRECTION_REQUEST_REVIEW_STATUSES = ("open", "candidate_found")
INVENTORY_HANDOFF_CORRECTION_SOURCE = "inventory-workbook-audit"
CORRECTION_REQUEST_TYPES = {
    "missing-chinese-name",
    "unresolved-search",
    "no-ghs-data",
    "ghs-text-no-pictograms",
    "source-conflict",
    "reference-link",
    "other-data-quality",
}
DEFAULT_MISS_QUERY_RETENTION_DAYS = 90

_CJK_RE = re.compile(r"[\u4e00-\u9fff]")
_WHITESPACE_RE = re.compile(r"\s+")
_EN_COMPACT_RE = re.compile(r"[^a-z0-9]+")
_ZH_COMPACT_RE = re.compile(r"[\s\u3000()（）\[\]{}\-_/.,;:]+")
_CAS_LIKE_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _miss_query_retention_cutoff(
    retention_days: int = DEFAULT_MISS_QUERY_RETENTION_DAYS,
    *,
    now: Optional[datetime] = None,
) -> str:
    days = int(retention_days)
    if days < 1:
        raise ValueError("retention_days must be at least 1")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return (current - timedelta(days=days)).isoformat()


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


def normalize_manual_entry_status(status: Optional[str]) -> str:
    normalized = (status or APPROVED_MANUAL_ENTRY_STATUS).strip().lower()
    if normalized not in MANUAL_ENTRY_STATUSES:
        raise ValueError("manual entry status must be approved, pending, needs_evidence, or rejected")
    return normalized


def normalize_reference_link_status(status: Optional[str]) -> str:
    normalized = (status or ACTIVE_REFERENCE_STATUS).strip().lower()
    if normalized not in REFERENCE_LINK_STATUSES:
        raise ValueError("reference link status must be active or inactive")
    return normalized


def normalize_correction_request_status(status: Optional[str]) -> str:
    normalized = (status or "open").strip().lower()
    if normalized not in CORRECTION_REQUEST_STATUSES:
        raise ValueError(
            "correction request status must be open, candidate_found, approved, rejected, or ignored"
        )
    return normalized


def normalize_correction_request_type(issue_type: Optional[str]) -> str:
    normalized = (issue_type or "other-data-quality").strip().lower()
    if normalized not in CORRECTION_REQUEST_TYPES:
        raise ValueError("unsupported correction request type")
    return normalized


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
              status TEXT NOT NULL DEFAULT 'approved',
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

            CREATE TABLE IF NOT EXISTS dictionary_correction_requests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              issue_type TEXT NOT NULL,
              cas_number TEXT,
              chemical_name TEXT,
              query_text TEXT,
              current_output TEXT,
              expected_output TEXT,
              evidence_url TEXT,
              evidence_type TEXT,
              local_context TEXT,
              candidate_json TEXT,
              source TEXT NOT NULL DEFAULT 'public',
              status TEXT NOT NULL DEFAULT 'open',
              review_notes TEXT,
              duplicate_count INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_dictionary_correction_requests_review
              ON dictionary_correction_requests(status, updated_at);
            CREATE INDEX IF NOT EXISTS idx_dictionary_correction_requests_cas
              ON dictionary_correction_requests(cas_number, status);
            CREATE INDEX IF NOT EXISTS idx_dictionary_correction_requests_issue_type
              ON dictionary_correction_requests(issue_type, status);
            """
        )
        self._ensure_dictionary_entry_schema_locked()
        self._ensure_correction_request_schema_locked()
        conn.commit()

    def _ensure_dictionary_entry_schema_locked(self) -> None:
        conn = self._require_conn()
        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(dictionary_entries)").fetchall()
        }
        if "status" not in columns:
            conn.execute(
                "ALTER TABLE dictionary_entries "
                "ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'"
            )
        conn.execute(
            """
            UPDATE dictionary_entries
            SET status = ?
            WHERE status IS NULL OR TRIM(status) = ''
            """,
            (APPROVED_MANUAL_ENTRY_STATUS,),
        )

    def _ensure_correction_request_schema_locked(self) -> None:
        conn = self._require_conn()
        columns = {
            row["name"]
            for row in conn.execute(
                "PRAGMA table_info(dictionary_correction_requests)"
            ).fetchall()
        }
        if "duplicate_count" not in columns:
            conn.execute(
                "ALTER TABLE dictionary_correction_requests "
                "ADD COLUMN duplicate_count INTEGER NOT NULL DEFAULT 1"
            )
        conn.execute(
            """
            UPDATE dictionary_correction_requests
            SET duplicate_count = 1
            WHERE duplicate_count IS NULL OR duplicate_count < 1
            """
        )

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
        status: str = APPROVED_MANUAL_ENTRY_STATUS,
    ) -> dict[str, Any]:
        updated_at = utc_now_iso()
        status = normalize_manual_entry_status(status)
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
              status,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(cas_number) DO UPDATE SET
              name_en = excluded.name_en,
              name_zh = excluded.name_zh,
              name_en_norm = excluded.name_en_norm,
              name_zh_norm = excluded.name_zh_norm,
              name_en_compact = excluded.name_en_compact,
              name_zh_compact = excluded.name_zh_compact,
              notes = excluded.notes,
              source = excluded.source,
              status = excluded.status,
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
                status,
                updated_at,
            ),
        )
        return self.get_manual_entry_by_cas(cas_number, include_unapproved=True) or {}

    def get_manual_entry_by_cas(
        self,
        cas_number: str,
        *,
        include_unapproved: bool = False,
    ) -> Optional[dict[str, Any]]:
        sql = """
            SELECT cas_number, name_en, name_zh, notes, source, status, updated_at
            FROM dictionary_entries
            WHERE cas_number = ?
        """
        params: list[Any] = [cas_number]
        if not include_unapproved:
            sql += " AND status = ?"
            params.append(APPROVED_MANUAL_ENTRY_STATUS)
        row = self._fetchone(
            sql,
            params,
        )
        return dict(row) if row is not None else None

    def get_manual_entry_by_name(
        self,
        name: str,
        locale: str,
        *,
        allow_compact: bool = True,
        include_unapproved: bool = False,
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

        status_clause = "" if include_unapproved else " AND status = ?"
        status_params: list[Any] = [] if include_unapproved else [APPROVED_MANUAL_ENTRY_STATUS]

        row = self._fetchone(
            f"""
            SELECT cas_number, name_en, name_zh, notes, source, status, updated_at
            FROM dictionary_entries
            WHERE {norm_column} = ?
              {status_clause}
            LIMIT 1
            """,
            [normalized, *status_params],
        )
        if row is not None:
            return dict(row)

        if allow_compact and compact:
            row = self._fetchone(
                f"""
                SELECT cas_number, name_en, name_zh, notes, source, status, updated_at
                FROM dictionary_entries
                WHERE {compact_column} = ?
                  {status_clause}
                LIMIT 1
                """,
                [compact, *status_params],
            )
            if row is not None:
                return dict(row)
        return None

    def list_manual_entries(self, *, status: Optional[str] = None) -> list[dict[str, Any]]:
        sql = """
            SELECT cas_number, name_en, name_zh, notes, source, status, updated_at
            FROM dictionary_entries
        """
        params: list[Any] = []
        if status:
            sql += " WHERE status = ?"
            params.append(normalize_manual_entry_status(status))
        sql += " ORDER BY cas_number"
        rows = self._fetchall(
            sql,
            params,
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
                if status and source == "manual":
                    next_status = status
                elif next_status == "pending" and status:
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
                WHEN 'needs_evidence' THEN 2
                ELSE 3
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
        cas_number: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT id, alias_text, locale, cas_number, source, confidence, status, notes, first_seen_at, last_seen_at, hit_count
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
        if cas_number:
            sql += " AND cas_number = ?"
            params.append(cas_number)
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
    def _miss_query_row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        item = dict(row)
        item["context"] = json.loads(item.pop("context_json") or "{}")
        item["query"] = item.get("query_text")
        item["queryKind"] = item.get("query_kind")
        item["resolutionStatus"] = item.get("resolution_status")
        item["resolvedCas"] = item.get("resolved_cas")
        return item

    def _normalize_miss_query_status(self, value: Optional[str]) -> str:
        status = (value or "open").strip().lower()
        if status not in MISS_QUERY_STATUSES:
            raise ValueError("unsupported miss query resolution status")
        return status

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
        resolution_status = self._normalize_miss_query_status(resolution_status)
        resolved_cas = (resolved_cas or "").strip() or None

        with self._lock:
            conn = self._require_conn()
            existing = conn.execute(
                """
                SELECT id, hit_count, resolution_status, resolved_cas
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
                next_status = resolution_status
                next_resolved_cas = resolved_cas
                if (
                    resolution_status == "open"
                    and not resolved_cas
                    and existing["resolution_status"] != "open"
                ):
                    next_status = existing["resolution_status"]
                    next_resolved_cas = existing["resolved_cas"]
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
                        next_status,
                        next_resolved_cas,
                        context_json,
                        query_norm,
                        query_kind,
                        endpoint,
                    ),
                )
            conn.commit()

        row = self._fetchone(
            """
            SELECT
              id,
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
            WHERE query_norm = ? AND query_kind = ? AND endpoint = ?
            """,
            (query_norm, query_kind, endpoint),
        )
        return self._miss_query_row_to_dict(row) if row is not None else None

    def list_miss_queries(
        self,
        *,
        limit: int = 50,
        statuses: Optional[Iterable[str]] = None,
        include_context: bool = True,
    ) -> list[dict[str, Any]]:
        params: list[Any] = []
        where_status = ""
        if statuses:
            normalized_statuses = [
                self._normalize_miss_query_status(status) for status in statuses
            ]
            where_status = (
                "WHERE resolution_status IN ("
                + ",".join("?" for _ in normalized_statuses)
                + ")"
            )
            params.extend(normalized_statuses)
        params.append(limit)
        rows = self._fetchall(
            f"""
            SELECT
              id,
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
            {where_status}
            ORDER BY hit_count DESC, last_seen_at DESC
            LIMIT ?
            """,
            params,
        )
        items = [self._miss_query_row_to_dict(row) for row in rows]
        if include_context:
            return items
        return [
            {key: value for key, value in item.items() if key != "context"}
            | {"contextRedacted": True}
            for item in items
        ]

    def get_miss_query_status_counts(self) -> dict[str, int]:
        rows = self._fetchall(
            """
            SELECT resolution_status, COUNT(*) AS count
            FROM dictionary_miss_queries
            GROUP BY resolution_status
            """
        )
        counts = {status: 0 for status in sorted(MISS_QUERY_STATUSES)}
        for row in rows:
            counts[row["resolution_status"]] = int(row["count"])
        return counts

    def update_miss_query_resolution(
        self,
        miss_id: int,
        *,
        resolution_status: str,
        resolved_cas: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        status = self._normalize_miss_query_status(resolution_status)
        normalized_cas = (resolved_cas or "").strip() or None

        if status == "resolved" and not normalized_cas:
            raise ValueError("resolved miss queries require a CAS number")

        self._execute(
            """
            UPDATE dictionary_miss_queries
            SET resolution_status = ?, resolved_cas = ?
            WHERE id = ?
            """,
            (status, normalized_cas, miss_id),
        )
        row = self._fetchone(
            """
            SELECT
              id,
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
            WHERE id = ?
            """,
            (miss_id,),
        )
        return self._miss_query_row_to_dict(row) if row is not None else None

    def get_miss_query_retention_summary(
        self,
        *,
        retention_days: int = DEFAULT_MISS_QUERY_RETENTION_DAYS,
        now: Optional[datetime] = None,
    ) -> dict[str, Any]:
        cutoff_at = _miss_query_retention_cutoff(retention_days, now=now)
        purgeable_count = self._scalar(
            """
            SELECT COUNT(*)
            FROM dictionary_miss_queries
            WHERE last_seen_at < ?
              AND resolution_status != ?
            """,
            (cutoff_at, "needs_evidence"),
        )
        retained_needs_evidence_count = self._scalar(
            """
            SELECT COUNT(*)
            FROM dictionary_miss_queries
            WHERE last_seen_at < ?
              AND resolution_status = ?
            """,
            (cutoff_at, "needs_evidence"),
        )
        return {
            "retentionDays": int(retention_days),
            "cutoffAt": cutoff_at,
            "purgeableCount": purgeable_count,
            "retainedNeedsEvidenceCount": retained_needs_evidence_count,
        }

    def purge_stale_miss_queries(
        self,
        *,
        retention_days: int = DEFAULT_MISS_QUERY_RETENTION_DAYS,
        now: Optional[datetime] = None,
    ) -> dict[str, Any]:
        summary = self.get_miss_query_retention_summary(
            retention_days=retention_days,
            now=now,
        )
        with self._lock:
            conn = self._require_conn()
            cursor = conn.execute(
                """
                DELETE FROM dictionary_miss_queries
                WHERE last_seen_at < ?
                  AND resolution_status != ?
                """,
                (summary["cutoffAt"], "needs_evidence"),
            )
            conn.commit()
            deleted_count = int(cursor.rowcount or 0)
        return {
            **summary,
            "deletedCount": deleted_count,
            "purgedAt": utc_now_iso(),
        }

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
        status = normalize_reference_link_status(status)
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
        links = self.list_reference_links(cas_number, include_inactive=True)
        for link in links:
            if link["url"] == url and link["linkType"] == link_type:
                return link
        return None

    def list_reference_links(
        self,
        cas_number: Optional[str] = None,
        *,
        include_inactive: bool = False,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT id, cas_number, cid, link_type, label, url, source, priority, status, updated_at
            FROM dictionary_reference_links
            WHERE 1 = 1
        """
        params: list[Any] = []
        if cas_number:
            sql += " AND cas_number = ?"
            params.append(cas_number)
        if not include_inactive:
            sql += " AND status = ?"
            params.append(ACTIVE_REFERENCE_STATUS)
        sql += " ORDER BY cas_number ASC, priority ASC, label ASC"
        rows = self._fetchall(sql, params)
        return [
            {
                "id": row["id"],
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

    # Correction requests ------------------------------------------------
    def _correction_request_row_to_dict(
        self,
        row: sqlite3.Row,
        *,
        include_context: bool = True,
    ) -> dict[str, Any]:
        item = dict(row)
        item["candidate"] = json.loads(item.pop("candidate_json") or "{}")
        item["issueType"] = item.get("issue_type")
        item["casNumber"] = item.get("cas_number")
        item["chemicalName"] = item.get("chemical_name")
        item["queryText"] = item.get("query_text")
        item["currentOutput"] = item.get("current_output")
        item["expectedOutput"] = item.get("expected_output")
        item["evidenceUrl"] = item.get("evidence_url")
        item["evidenceType"] = item.get("evidence_type")
        item["reviewNotes"] = item.get("review_notes")
        item["duplicateCount"] = int(item.get("duplicate_count") or 1)
        item["createdAt"] = item.get("created_at")
        item["updatedAt"] = item.get("updated_at")
        if include_context:
            item["localContext"] = item.get("local_context")
            return item
        item.pop("local_context", None)
        item["localContextRedacted"] = True
        return item

    def _fetch_correction_request_by_id(
        self,
        request_id: int,
        *,
        include_context: bool = True,
    ) -> Optional[dict[str, Any]]:
        row = self._fetchone(
            """
            SELECT
              id,
              issue_type,
              cas_number,
              chemical_name,
              query_text,
              current_output,
              expected_output,
              evidence_url,
              evidence_type,
              local_context,
              candidate_json,
              source,
              status,
              review_notes,
              duplicate_count,
              created_at,
              updated_at
            FROM dictionary_correction_requests
            WHERE id = ?
            """,
            (request_id,),
        )
        return (
            self._correction_request_row_to_dict(row, include_context=include_context)
            if row is not None
            else None
        )

    def record_correction_request(
        self,
        *,
        issue_type: str,
        cas_number: Optional[str] = None,
        chemical_name: Optional[str] = None,
        query_text: Optional[str] = None,
        current_output: Optional[str] = None,
        expected_output: Optional[str] = None,
        evidence_url: Optional[str] = None,
        evidence_type: Optional[str] = None,
        local_context: Optional[str] = None,
        candidate: Optional[dict[str, Any]] = None,
        source: str = "public",
        status: str = "open",
    ) -> dict[str, Any]:
        now = utc_now_iso()
        normalized_issue_type = normalize_correction_request_type(issue_type)
        normalized_status = normalize_correction_request_status(status)
        candidate_json = json.dumps(candidate or {}, ensure_ascii=False, sort_keys=True)
        source = (source or "public").strip() or "public"
        normalized_cas_number = (cas_number or "").strip() or None
        normalized_chemical_name = (chemical_name or "").strip() or None
        normalized_query_text = (query_text or "").strip() or None
        normalized_current_output = (current_output or "").strip() or None
        normalized_expected_output = (expected_output or "").strip() or None
        normalized_evidence_url = (evidence_url or "").strip() or None
        normalized_evidence_type = (evidence_type or "").strip() or None
        normalized_local_context = (local_context or "").strip() or None

        with self._lock:
            conn = self._require_conn()
            existing = conn.execute(
                """
                SELECT id
                FROM dictionary_correction_requests
                WHERE issue_type = ?
                  AND COALESCE(cas_number, '') = ?
                  AND COALESCE(chemical_name, '') = ?
                  AND COALESCE(query_text, '') = ?
                  AND COALESCE(current_output, '') = ?
                  AND COALESCE(expected_output, '') = ?
                  AND COALESCE(evidence_url, '') = ?
                  AND COALESCE(evidence_type, '') = ?
                  AND COALESCE(candidate_json, '') = ?
                  AND source = ?
                  AND status IN (?, ?)
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
                """,
                (
                    normalized_issue_type,
                    normalized_cas_number or "",
                    normalized_chemical_name or "",
                    normalized_query_text or "",
                    normalized_current_output or "",
                    normalized_expected_output or "",
                    normalized_evidence_url or "",
                    normalized_evidence_type or "",
                    candidate_json,
                    source,
                    "open",
                    "candidate_found",
                ),
            ).fetchone()
            if existing is not None:
                request_id = int(existing["id"])
                conn.execute(
                    """
                    UPDATE dictionary_correction_requests
                    SET
                      duplicate_count = COALESCE(duplicate_count, 1) + 1,
                      local_context = COALESCE(local_context, ?),
                      updated_at = ?
                    WHERE id = ?
                    """,
                    (normalized_local_context, now, request_id),
                )
                conn.commit()
                record = self._fetch_correction_request_by_id(request_id)
                assert record is not None
                return record

            cursor = conn.execute(
                """
                INSERT INTO dictionary_correction_requests(
                  issue_type,
                  cas_number,
                  chemical_name,
                  query_text,
                  current_output,
                  expected_output,
                  evidence_url,
                  evidence_type,
                  local_context,
                  candidate_json,
                  source,
                  status,
                  review_notes,
                  created_at,
                  updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
                """,
                (
                    normalized_issue_type,
                    normalized_cas_number,
                    normalized_chemical_name,
                    normalized_query_text,
                    normalized_current_output,
                    normalized_expected_output,
                    normalized_evidence_url,
                    normalized_evidence_type,
                    normalized_local_context,
                    candidate_json,
                    source,
                    normalized_status,
                    now,
                    now,
                ),
            )
            conn.commit()
            request_id = int(cursor.lastrowid)

        record = self._fetch_correction_request_by_id(request_id)
        assert record is not None
        return record

    def list_correction_requests(
        self,
        *,
        limit: int = 100,
        statuses: Optional[Iterable[str]] = None,
        source: Optional[str] = None,
        include_context: bool = True,
        exclude_converted_manual_entries: bool = False,
    ) -> list[dict[str, Any]]:
        params: list[Any] = []
        where_clauses: list[str] = []
        if statuses:
            normalized_statuses = [
                normalize_correction_request_status(status) for status in statuses
            ]
            where_clauses.append(
                "status IN ("
                + ",".join("?" for _ in normalized_statuses)
                + ")"
            )
            params.extend(normalized_statuses)
        normalized_source = (source or "").strip()
        if normalized_source:
            where_clauses.append("source = ?")
            params.append(normalized_source)
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        limit_clause = "" if exclude_converted_manual_entries else "LIMIT ?"
        if not exclude_converted_manual_entries:
            params.append(limit)
        rows = self._fetchall(
            f"""
            SELECT
              id,
              issue_type,
              cas_number,
              chemical_name,
              query_text,
              current_output,
              expected_output,
              evidence_url,
              evidence_type,
              local_context,
              candidate_json,
              source,
              status,
              review_notes,
              duplicate_count,
              created_at,
              updated_at
            FROM dictionary_correction_requests
            {where_sql}
            ORDER BY updated_at DESC, id DESC
            {limit_clause}
            """,
            params,
        )
        items: list[dict[str, Any]] = []
        for row in rows:
            item = self._correction_request_row_to_dict(
                row,
                include_context=include_context,
            )
            if (
                exclude_converted_manual_entries
                and item.get("candidate", {}).get("converted_to_manual_entry") is True
            ):
                continue
            items.append(item)
            if len(items) >= limit:
                break
        return items

    def get_correction_request_status_counts(
        self,
        *,
        report_counts: bool = False,
    ) -> dict[str, int]:
        count_expr = (
            "COALESCE(SUM(COALESCE(duplicate_count, 1)), 0)"
            if report_counts
            else "COUNT(*)"
        )
        rows = self._fetchall(
            f"""
            SELECT status, {count_expr} AS count
            FROM dictionary_correction_requests
            GROUP BY status
            """
        )
        counts = {status: 0 for status in CORRECTION_REQUEST_STATUS_ORDER}
        for row in rows:
            counts[str(row["status"])] = int(row["count"])
        return counts

    def get_correction_request_issue_type_counts(
        self,
        *,
        statuses: Optional[Iterable[str]] = None,
        source: Optional[str] = None,
        report_counts: bool = False,
    ) -> dict[str, int]:
        params: list[Any] = []
        where_clauses: list[str] = []
        if statuses:
            normalized_statuses = [
                normalize_correction_request_status(status) for status in statuses
            ]
            where_clauses.append(
                "status IN ("
                + ",".join("?" for _ in normalized_statuses)
                + ")"
            )
            params.extend(normalized_statuses)
        normalized_source = (source or "").strip()
        if normalized_source:
            where_clauses.append("source = ?")
            params.append(normalized_source)
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        count_expr = (
            "COALESCE(SUM(COALESCE(duplicate_count, 1)), 0)"
            if report_counts
            else "COUNT(*)"
        )
        rows = self._fetchall(
            f"""
            SELECT issue_type, {count_expr} AS count
            FROM dictionary_correction_requests
            {where_sql}
            GROUP BY issue_type
            """,
            params,
        )
        counts = {issue_type: 0 for issue_type in sorted(CORRECTION_REQUEST_TYPES)}
        for row in rows:
            counts[str(row["issue_type"])] = int(row["count"])
        return counts

    def get_correction_request_source_counts(
        self,
        *,
        statuses: Optional[Iterable[str]] = None,
        report_counts: bool = False,
    ) -> dict[str, int]:
        params: list[Any] = []
        where_status = ""
        if statuses:
            normalized_statuses = [
                normalize_correction_request_status(status) for status in statuses
            ]
            where_status = (
                "WHERE status IN ("
                + ",".join("?" for _ in normalized_statuses)
                + ")"
            )
            params.extend(normalized_statuses)
        count_expr = (
            "COALESCE(SUM(COALESCE(duplicate_count, 1)), 0)"
            if report_counts
            else "COUNT(*)"
        )
        rows = self._fetchall(
            f"""
            SELECT source, {count_expr} AS count
            FROM dictionary_correction_requests
            {where_status}
            GROUP BY source
            """,
            params,
        )
        return {str(row["source"]): int(row["count"]) for row in rows}

    def get_converted_correction_candidate_count(self) -> int:
        rows = self._fetchall(
            """
            SELECT candidate_json
            FROM dictionary_correction_requests
            WHERE status = ?
              AND candidate_json IS NOT NULL
            """,
            ("candidate_found",),
        )
        count = 0
        for row in rows:
            try:
                candidate = json.loads(row["candidate_json"] or "{}")
            except json.JSONDecodeError:
                continue
            if candidate.get("converted_to_manual_entry") is True:
                count += 1
        return count

    def list_converted_correction_candidates(
        self,
        *,
        limit: int = 10,
        include_context: bool = False,
    ) -> list[dict[str, Any]]:
        rows = self._fetchall(
            """
            SELECT
              id,
              issue_type,
              cas_number,
              chemical_name,
              query_text,
              current_output,
              expected_output,
              evidence_url,
              evidence_type,
              local_context,
              candidate_json,
              source,
              status,
              review_notes,
              duplicate_count,
              created_at,
              updated_at
            FROM dictionary_correction_requests
            WHERE status = ?
              AND candidate_json IS NOT NULL
            ORDER BY updated_at DESC, id DESC
            """,
            ("candidate_found",),
        )
        converted: list[dict[str, Any]] = []
        for row in rows:
            try:
                candidate = json.loads(row["candidate_json"] or "{}")
            except json.JSONDecodeError:
                continue
            if candidate.get("converted_to_manual_entry") is not True:
                continue
            converted.append(
                self._correction_request_row_to_dict(
                    row,
                    include_context=include_context,
                )
            )
            if len(converted) >= limit:
                break
        return converted

    def get_pilot_triage_summary(self) -> dict[str, Any]:
        correction_status_counts = self.get_correction_request_status_counts()
        correction_report_status_counts = self.get_correction_request_status_counts(
            report_counts=True,
        )
        correction_issue_type_counts = self.get_correction_request_issue_type_counts(
            statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
        )
        correction_report_issue_type_counts = (
            self.get_correction_request_issue_type_counts(
                statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
                report_counts=True,
            )
        )
        correction_source_counts = self.get_correction_request_source_counts(
            statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
        )
        correction_report_source_counts = self.get_correction_request_source_counts(
            statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
            report_counts=True,
        )
        inventory_handoff_count = correction_source_counts.get(
            INVENTORY_HANDOFF_CORRECTION_SOURCE,
            0,
        )
        inventory_handoff_report_count = correction_report_source_counts.get(
            INVENTORY_HANDOFF_CORRECTION_SOURCE,
            0,
        )
        inventory_handoff_issue_type_counts = (
            self.get_correction_request_issue_type_counts(
                statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
                source=INVENTORY_HANDOFF_CORRECTION_SOURCE,
            )
        )
        miss_query_status_counts = self.get_miss_query_status_counts()
        manual_entry_status_counts = self.get_manual_entry_status_counts()
        alias_status_counts = self.get_alias_status_counts()
        reference_link_status_counts = self.get_reference_link_status_counts()
        miss_retention = self.get_miss_query_retention_summary()

        candidate_found_count = correction_status_counts.get("candidate_found", 0)
        converted_candidate_count = self.get_converted_correction_candidate_count()
        unconverted_candidate_count = max(
            candidate_found_count - converted_candidate_count,
            0,
        )
        pending_manual_count = sum(
            manual_entry_status_counts.get(status, 0)
            for status in MANUAL_ENTRY_REVIEW_STATUSES
        )
        pending_alias_count = sum(
            alias_status_counts.get(status, 0) for status in ALIAS_REVIEW_STATUSES
        )
        needs_evidence_count = (
            miss_query_status_counts.get("needs_evidence", 0)
            + manual_entry_status_counts.get("needs_evidence", 0)
            + alias_status_counts.get("needs_evidence", 0)
        )
        unresolved_search_count = sum(
            miss_query_status_counts.get(status, 0)
            for status in ("open", "needs_evidence")
        )
        open_correction_count = sum(
            correction_status_counts.get(status, 0)
            for status in CORRECTION_REQUEST_REVIEW_STATUSES
        )
        open_correction_report_count = sum(
            correction_report_status_counts.get(status, 0)
            for status in CORRECTION_REQUEST_REVIEW_STATUSES
        )

        stale_miss_query_count = int(miss_retention.get("purgeableCount", 0))
        inactive_reference_link_count = reference_link_status_counts.get("inactive", 0)

        attention_counts = {
            "openCorrectionRequests": open_correction_count,
            "inventoryHandoffRequests": inventory_handoff_count,
            "candidateFoundAwaitingManualReview": unconverted_candidate_count,
            "manualEntriesInReview": pending_manual_count,
            "aliasesInReview": pending_alias_count,
            "needsEvidenceWorkItems": needs_evidence_count,
            "unresolvedSearches": unresolved_search_count,
            "missingChineseNameReports": correction_issue_type_counts.get(
                "missing-chinese-name",
                0,
            ),
            "noGhsReports": correction_issue_type_counts.get("no-ghs-data", 0),
            "sourceConflictReports": correction_issue_type_counts.get(
                "source-conflict",
                0,
            ),
            "staleMissQueryRows": stale_miss_query_count,
            "inactiveReferenceLinks": inactive_reference_link_count,
        }
        attention_report_counts = {
            "openCorrectionReports": open_correction_report_count,
            "duplicateCorrectionReports": max(
                open_correction_report_count - open_correction_count,
                0,
            ),
            "inventoryHandoffReports": inventory_handoff_report_count,
            "missingChineseNameReports": correction_report_issue_type_counts.get(
                "missing-chinese-name",
                0,
            ),
            "noGhsReports": correction_report_issue_type_counts.get("no-ghs-data", 0),
            "sourceConflictReports": correction_report_issue_type_counts.get(
                "source-conflict",
                0,
            ),
        }
        primary_queue_item_counts = {
            "openCorrectionRequests": open_correction_count,
            "unresolvedSearches": unresolved_search_count,
            "manualEntriesInReview": pending_manual_count,
            "aliasesInReview": pending_alias_count,
            "staleMissQueryRows": stale_miss_query_count,
            "inactiveReferenceLinks": inactive_reference_link_count,
        }

        recommended_focus_target_labels = {
            "correction_requests": "Correction requests",
            "inventory_handoff": "Inventory handoff queue",
            "converted_candidates": "Converted candidates",
            "manual_entries": "Manual entries",
            "needs_evidence": "Needs-evidence work",
            "miss_queries": "Miss-query cleanup",
            "alias_review": "Alias review",
            "reference_links": "Reference links",
        }
        recommended_focus_rules = (
            (
                "inventory_handoff",
                "inventory_handoff",
                "Review inventory workbook handoff items before converting candidates into manual entries.",
                "Open the handoff queue, verify workbook names and seed-dictionary gaps against evidence, then convert, reject, or leave review-only.",
                attention_counts["inventoryHandoffRequests"],
            ),
            (
                "correction_intake",
                "correction_requests",
                "Review open correction requests before adding new data sources.",
                "Open the correction queue, then approve, reject, mark ignored, or add review notes.",
                attention_counts["openCorrectionRequests"],
            ),
            (
                "candidate_found",
                "converted_candidates",
                "Convert candidate-found evidence only when it should become a manual review entry.",
                "Convert to pending manual entry or keep the candidate review-only.",
                attention_counts["candidateFoundAwaitingManualReview"],
            ),
            (
                "manual_review",
                "manual_entries",
                "Approve or reject pending manual entries before public lookup changes.",
                "Approve, reject, or request evidence before public lookup/labels/exports use the row.",
                attention_counts["manualEntriesInReview"],
            ),
            (
                "needs_evidence",
                "needs_evidence",
                "Clear needs-evidence rows before treating the queue as resolved.",
                "Add source evidence, leave review-only, or reject stale work.",
                attention_counts["needsEvidenceWorkItems"],
            ),
            (
                "unresolved_searches",
                "miss_queries",
                "Resolve high-frequency search misses or mark them needs-evidence.",
                "Resolve to reviewed CAS, mark needs-evidence, or ignore low-signal misses.",
                attention_counts["unresolvedSearches"],
            ),
            (
                "missing_chinese_names",
                "correction_requests",
                "Backfill trusted Traditional Chinese names with source evidence.",
                "Create candidate evidence first; approve only through manual dictionary review.",
                attention_counts["missingChineseNameReports"],
            ),
            (
                "no_ghs_gaps",
                "correction_requests",
                "Review no-GHS reports without treating them as no-hazard conclusions.",
                "Check SDS/source evidence, then keep as report, reject, or route to data correction.",
                attention_counts["noGhsReports"],
            ),
            (
                "source_conflicts",
                "correction_requests",
                "Inspect source conflicts and keep SDS/local verification visible.",
                "Confirm the public primary selection separately from safety-data correction.",
                attention_counts["sourceConflictReports"],
            ),
            (
                "alias_review",
                "alias_review",
                "Review alias changes before they affect search resolution.",
                "Approve, reject, or request evidence for pending aliases.",
                attention_counts["aliasesInReview"],
            ),
            (
                "reference_link_review",
                "reference_links",
                "Review inactive reference links so stale SDS links do not look authoritative.",
                "Reactivate safe links, keep inactive for audit, or add a better reviewed source.",
                attention_counts["inactiveReferenceLinks"],
            ),
            (
                "telemetry_retention",
                "miss_queries",
                "Purge stale miss-query telemetry outside the retention window.",
                "Export or review the queue first, then purge rows outside retention.",
                attention_counts["staleMissQueryRows"],
            ),
        )
        recommended_focus = [
            {
                "key": key,
                "targetKey": target_key,
                "targetLabel": recommended_focus_target_labels.get(
                    target_key, "Related queue"
                ),
                "message": message,
                "nextAction": next_action,
                "count": int(count),
            }
            for key, target_key, message, next_action, count in recommended_focus_rules
            if int(count) > 0
        ]
        if not recommended_focus:
            recommended_focus.append(
                {
                    "key": "healthy",
                    "message": "No queued pilot curation work requires immediate action.",
                    "count": 0,
                }
            )

        open_work_item_count = sum(primary_queue_item_counts.values())
        attention_signal_count = sum(attention_counts.values())
        return {
            "openWorkItemCount": int(open_work_item_count),
            "attentionSignalCount": int(attention_signal_count),
            "attentionCounts": attention_counts,
            "attentionReportCounts": attention_report_counts,
            "primaryQueueItemCounts": primary_queue_item_counts,
            "correctionIssueTypeCounts": correction_issue_type_counts,
            "correctionIssueTypeReportCounts": correction_report_issue_type_counts,
            "correctionSourceCounts": correction_source_counts,
            "correctionSourceReportCounts": correction_report_source_counts,
            "inventoryHandoffIssueTypeCounts": inventory_handoff_issue_type_counts,
            "recommendedFocus": recommended_focus,
            "signals": {
                "hasCorrectionBacklog": open_correction_count > 0,
                "hasDuplicateCorrectionReports": attention_report_counts[
                    "duplicateCorrectionReports"
                ]
                > 0,
                "hasUnresolvedSearchBacklog": unresolved_search_count > 0,
                "hasManualReviewBacklog": pending_manual_count > 0,
                "hasSourceConflictReports": attention_counts["sourceConflictReports"] > 0,
                "hasRetentionWork": attention_counts["staleMissQueryRows"] > 0,
            },
        }

    def update_correction_request_status(
        self,
        request_id: int,
        *,
        status: str,
        review_notes: Optional[str] = None,
        candidate: Optional[dict[str, Any]] = None,
    ) -> Optional[dict[str, Any]]:
        normalized_status = normalize_correction_request_status(status)
        candidate_json = (
            json.dumps(candidate, ensure_ascii=False) if candidate is not None else None
        )
        self._execute(
            """
            UPDATE dictionary_correction_requests
            SET
              status = ?,
              review_notes = COALESCE(?, review_notes),
              candidate_json = COALESCE(?, candidate_json),
              updated_at = ?
            WHERE id = ?
            """,
            (
                normalized_status,
                (review_notes or "").strip() if review_notes is not None else None,
                candidate_json,
                utc_now_iso(),
                request_id,
            ),
        )
        return self._fetch_correction_request_by_id(request_id)

    # Reporting -----------------------------------------------------------
    def get_dictionary_summary(self, *, limit: int = 10) -> dict[str, Any]:
        pending_manual_entries = []
        for status in MANUAL_ENTRY_REVIEW_STATUSES:
            pending_manual_entries.extend(self.list_manual_entries(status=status))
        pending_aliases = []
        for status in ALIAS_REVIEW_STATUSES:
            pending_aliases.extend(self.list_aliases(status=status))
        metrics = {
            "manualEntryCount": self._scalar("SELECT COUNT(*) FROM dictionary_entries"),
            "approvedManualEntryCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_entries WHERE status = ?",
                (APPROVED_MANUAL_ENTRY_STATUS,),
            ),
            "pendingManualEntryCount": self._scalar(
                """
                SELECT COUNT(*)
                FROM dictionary_entries
                WHERE status IN (?, ?)
                """,
                MANUAL_ENTRY_REVIEW_STATUSES,
            ),
            "manualEntryStatusCounts": self.get_manual_entry_status_counts(),
            "approvedAliasCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_aliases WHERE status = ?",
                (APPROVED_ALIAS_STATUS,),
            ),
            "pendingAliasCount": self._scalar(
                """
                SELECT COUNT(*)
                FROM dictionary_aliases
                WHERE status IN (?, ?)
                """,
                ALIAS_REVIEW_STATUSES,
            ),
            "aliasStatusCounts": self.get_alias_status_counts(),
            "missQueryCount": self._scalar("SELECT COUNT(*) FROM dictionary_miss_queries"),
            "openMissQueryCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_miss_queries WHERE resolution_status = ?",
                ("open",),
            ),
            "missQueryStatusCounts": self.get_miss_query_status_counts(),
            "missQueryRetention": self.get_miss_query_retention_summary(),
            "correctionRequestCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_correction_requests"
            ),
            "correctionRequestReportCount": self._scalar(
                """
                SELECT COALESCE(SUM(COALESCE(duplicate_count, 1)), 0)
                FROM dictionary_correction_requests
                """
            ),
            "openCorrectionRequestCount": self._scalar(
                """
                SELECT COUNT(*)
                FROM dictionary_correction_requests
                WHERE status IN (?, ?)
                """,
                CORRECTION_REQUEST_REVIEW_STATUSES,
            ),
            "openCorrectionRequestReportCount": self._scalar(
                """
                SELECT COALESCE(SUM(COALESCE(duplicate_count, 1)), 0)
                FROM dictionary_correction_requests
                WHERE status IN (?, ?)
                """,
                CORRECTION_REQUEST_REVIEW_STATUSES,
            ),
            "correctionRequestStatusCounts": self.get_correction_request_status_counts(),
            "correctionRequestReportStatusCounts": (
                self.get_correction_request_status_counts(report_counts=True)
            ),
            "correctionRequestSourceCounts": self.get_correction_request_source_counts(
                statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
            ),
            "correctionRequestReportSourceCounts": (
                self.get_correction_request_source_counts(
                    statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
                    report_counts=True,
                )
            ),
            "convertedCorrectionCandidateCount": self.get_converted_correction_candidate_count(),
            "convertedCorrectionCandidates": self.list_converted_correction_candidates(
                limit=limit,
                include_context=False,
            ),
            "topCorrectionRequests": self.list_correction_requests(
                limit=limit,
                statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
                include_context=False,
                exclude_converted_manual_entries=True,
            ),
            "inventoryHandoffCorrectionRequests": self.list_correction_requests(
                limit=limit,
                statuses=CORRECTION_REQUEST_REVIEW_STATUSES,
                source=INVENTORY_HANDOFF_CORRECTION_SOURCE,
                include_context=False,
                exclude_converted_manual_entries=True,
            ),
            "referenceLinkCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_reference_links WHERE status = ?",
                (ACTIVE_REFERENCE_STATUS,),
            ),
            "inactiveReferenceLinkCount": self._scalar(
                "SELECT COUNT(*) FROM dictionary_reference_links WHERE status = ?",
                ("inactive",),
            ),
            "referenceLinkStatusCounts": self.get_reference_link_status_counts(),
            "topMissQueries": self.list_miss_queries(
                limit=limit,
                statuses=("open", "needs_evidence"),
                include_context=False,
            ),
            "pendingAliases": pending_aliases[:limit],
            "pendingManualEntries": pending_manual_entries[:limit],
        }
        metrics["pilotTriage"] = self.get_pilot_triage_summary()
        return metrics

    def get_manual_entry_status_counts(self) -> dict[str, int]:
        rows = self._fetchall(
            """
            SELECT status, COUNT(*) AS count
            FROM dictionary_entries
            GROUP BY status
            """
        )
        counts = {status: 0 for status in MANUAL_ENTRY_STATUS_ORDER}
        for row in rows:
            counts[str(row["status"])] = int(row["count"])
        return counts

    def get_alias_status_counts(self) -> dict[str, int]:
        rows = self._fetchall(
            """
            SELECT status, COUNT(*) AS count
            FROM dictionary_aliases
            GROUP BY status
            """
        )
        counts = {status: 0 for status in ALIAS_STATUSES}
        for row in rows:
            counts[str(row["status"])] = int(row["count"])
        return counts

    def get_reference_link_status_counts(self) -> dict[str, int]:
        rows = self._fetchall(
            """
            SELECT status, COUNT(*) AS count
            FROM dictionary_reference_links
            GROUP BY status
            """
        )
        counts = {status: 0 for status in sorted(REFERENCE_LINK_STATUSES)}
        for row in rows:
            counts[str(row["status"])] = int(row["count"])
        return counts

    def export_dictionary_snapshot(
        self,
        *,
        include_miss_context: bool = False,
        include_correction_context: bool = False,
    ) -> dict[str, Any]:
        miss_queries = self.list_miss_queries(
            limit=500,
            include_context=include_miss_context,
        )
        correction_requests = self.list_correction_requests(
            limit=500,
            include_context=include_correction_context,
        )
        return {
            "exportedAt": utc_now_iso(),
            "missQueryExportScope": {
                "contextIncluded": include_miss_context,
                "limit": 500,
            },
            "correctionRequestExportScope": {
                "contextIncluded": include_correction_context,
                "limit": 500,
            },
            "manualEntries": self.list_manual_entries(),
            "aliases": self.list_aliases(),
            "missQueries": miss_queries,
            "correctionRequests": correction_requests,
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
