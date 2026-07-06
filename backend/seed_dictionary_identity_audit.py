from __future__ import annotations

import csv
import json
import re
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

import httpx

from chemical_dict import CAS_TO_EN, CAS_TO_ZH
from export_helpers import spreadsheet_safe

AUDIT_SOURCE = "seed-dictionary-identity-audit"
PUBCHEM_BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}
AUDIT_STATUSES = (
    "title_match",
    "synonym_match",
    "mismatch",
    "no_record",
    "upstream_error",
)
REPORT_FILENAME = "seed-dictionary-identity-audit.json"
MISMATCH_CSV_FILENAME = "seed-dictionary-identity-mismatches.csv"
CHECKPOINT_SCHEMA_VERSION = 1
REPORT_SCHEMA_VERSION = 1

_TRAILING_PARENTHETICAL_SUFFIX_RE = re.compile(r"\s*\([^)]{1,40}\)\s*$")
_IDENTITY_COMPACT_RE = re.compile(r"[^a-z0-9]+")


class PubChemUpstreamError(RuntimeError):
    pass


class PubChemRateLimiter:
    def __init__(
        self,
        min_interval_seconds: float,
        *,
        monotonic: Callable[[], float] = time.monotonic,
        sleeper: Callable[[float], None] = time.sleep,
    ):
        self.min_interval_seconds = max(0.0, float(min_interval_seconds or 0))
        self._monotonic = monotonic
        self._sleeper = sleeper
        self._last_request_start: Optional[float] = None

    def wait(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        now = self._monotonic()
        if self._last_request_start is None:
            self._last_request_start = now
            return
        wait_seconds = self.min_interval_seconds - (now - self._last_request_start)
        if wait_seconds > 0:
            self._sleeper(wait_seconds)
            now += wait_seconds
        self._last_request_start = now


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_identity_name(name: Optional[str]) -> str:
    text = (name or "").strip().lower()
    text = _TRAILING_PARENTHETICAL_SUFFIX_RE.sub("", text).strip()
    return _IDENTITY_COMPACT_RE.sub("", text)


def _csv_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        return spreadsheet_safe("; ".join(_csv_value(item) for item in value))
    return spreadsheet_safe(str(value))


def _sleep_for_rate_limit(seconds: float, sleeper: Callable[[float], None]) -> None:
    if seconds > 0:
        sleeper(seconds)


def fetch_pubchem_json(
    client: Any,
    url: str,
    *,
    timeout: float = 20.0,
    max_retries: int = 2,
    rate_limit_seconds: float = 0.25,
    rate_limiter: Optional[PubChemRateLimiter] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> Optional[dict[str, Any]]:
    attempt = 0
    while True:
        if rate_limiter is not None:
            rate_limiter.wait()
        else:
            _sleep_for_rate_limit(rate_limit_seconds, sleeper)
        transient_error = ""
        try:
            response = client.get(url, timeout=timeout)
            status_code = int(getattr(response, "status_code", 0) or 0)
            if status_code == 200:
                try:
                    return response.json()
                except Exception as exc:  # pragma: no cover - exact JSON exception varies
                    transient_error = f"invalid JSON: {exc}"
            elif status_code == 404:
                return None
            elif status_code in TRANSIENT_STATUS_CODES:
                transient_error = f"HTTP {status_code}"
            elif 400 <= status_code < 500:
                return None
            else:
                transient_error = f"HTTP {status_code}"
        except Exception as exc:  # pragma: no cover - exercised by real httpx errors
            transient_error = f"{type(exc).__name__}: {exc}"

        attempt += 1
        if attempt > max_retries:
            raise PubChemUpstreamError(transient_error)

        retry_after = None
        headers = getattr(locals().get("response", None), "headers", {}) or {}
        if hasattr(headers, "get"):
            retry_after = headers.get("Retry-After")
        delay = min(8.0, 0.5 * (2 ** (attempt - 1)))
        if retry_after:
            try:
                delay = max(delay, min(8.0, float(retry_after)))
            except (TypeError, ValueError):
                pass
        sleeper(delay)


def _extract_substance_cids(payload: Optional[dict[str, Any]]) -> list[int]:
    cids: list[int] = []
    if not payload:
        return cids
    for item in payload.get("InformationList", {}).get("Information", []):
        value = item.get("CID")
        if isinstance(value, list):
            for cid in value:
                try:
                    cids.append(int(cid))
                except (TypeError, ValueError):
                    continue
        elif value is not None:
            try:
                cids.append(int(value))
            except (TypeError, ValueError):
                continue
    return cids


def _extract_compound_cids(payload: Optional[dict[str, Any]]) -> list[int]:
    cids: list[int] = []
    if not payload:
        return cids
    for cid in payload.get("IdentifierList", {}).get("CID", []):
        try:
            cids.append(int(cid))
        except (TypeError, ValueError):
            continue
    return cids


def _majority_cid(cids: list[int], source: str) -> Optional[dict[str, Any]]:
    if not cids:
        return None
    counter = Counter(cids)
    cid, votes = counter.most_common(1)[0]
    total = len(cids)
    return {
        "cid": cid,
        "cidSource": source,
        "cidVoteCount": votes,
        "cidVoteTotal": total,
        "cidVoteRatio": votes / total if total else None,
    }


def fetch_cid_majority(
    cas_number: str,
    *,
    client: Any,
    timeout: float = 20.0,
    max_retries: int = 2,
    rate_limit_seconds: float = 0.25,
    rate_limiter: Optional[PubChemRateLimiter] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> Optional[dict[str, Any]]:
    substance_url = f"{PUBCHEM_BASE_URL}/substance/xref/rn/{cas_number}/cids/JSON"
    substance_payload = fetch_pubchem_json(
        client,
        substance_url,
        timeout=timeout,
        max_retries=max_retries,
        rate_limit_seconds=rate_limit_seconds,
        rate_limiter=rate_limiter,
        sleeper=sleeper,
    )
    substance_match = _majority_cid(
        _extract_substance_cids(substance_payload),
        "substance_xref_rn",
    )
    if substance_match:
        return substance_match

    compound_url = f"{PUBCHEM_BASE_URL}/compound/xref/rn/{cas_number}/cids/JSON"
    compound_payload = fetch_pubchem_json(
        client,
        compound_url,
        timeout=timeout,
        max_retries=max_retries,
        rate_limit_seconds=rate_limit_seconds,
        rate_limiter=rate_limiter,
        sleeper=sleeper,
    )
    return _majority_cid(_extract_compound_cids(compound_payload), "compound_xref_rn")


def fetch_pubchem_title(
    cid: int,
    *,
    client: Any,
    timeout: float = 20.0,
    max_retries: int = 2,
    rate_limit_seconds: float = 0.25,
    rate_limiter: Optional[PubChemRateLimiter] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> str:
    url = f"{PUBCHEM_BASE_URL}/compound/cid/{cid}/property/Title/JSON"
    payload = fetch_pubchem_json(
        client,
        url,
        timeout=timeout,
        max_retries=max_retries,
        rate_limit_seconds=rate_limit_seconds,
        rate_limiter=rate_limiter,
        sleeper=sleeper,
    )
    if not payload:
        return ""
    properties = payload.get("PropertyTable", {}).get("Properties", [])
    if not properties:
        return ""
    return str(properties[0].get("Title") or "").strip()


def fetch_pubchem_synonyms(
    cid: int,
    *,
    client: Any,
    timeout: float = 20.0,
    max_retries: int = 2,
    rate_limit_seconds: float = 0.25,
    rate_limiter: Optional[PubChemRateLimiter] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> list[str]:
    url = f"{PUBCHEM_BASE_URL}/compound/cid/{cid}/synonyms/JSON"
    payload = fetch_pubchem_json(
        client,
        url,
        timeout=timeout,
        max_retries=max_retries,
        rate_limit_seconds=rate_limit_seconds,
        rate_limiter=rate_limiter,
        sleeper=sleeper,
    )
    if not payload:
        return []
    synonyms: list[str] = []
    for item in payload.get("InformationList", {}).get("Information", []):
        for synonym in item.get("Synonym", []) or []:
            text = str(synonym or "").strip()
            if text:
                synonyms.append(text)
    return synonyms


def classify_seed_identity(
    dictionary_name_en: str,
    pubchem_title: str,
    synonyms: list[str],
) -> tuple[str, Optional[str]]:
    dictionary_norm = normalize_identity_name(dictionary_name_en)
    title_norm = normalize_identity_name(pubchem_title)
    if dictionary_norm and title_norm and dictionary_norm == title_norm:
        return "title_match", None

    for synonym in synonyms:
        if dictionary_norm and normalize_identity_name(synonym) == dictionary_norm:
            return "synonym_match", synonym

    return "mismatch", None


def _base_result(cas_number: str, dictionary_name_en: str) -> dict[str, Any]:
    return {
        "cas_number": cas_number,
        "dictionaryNameEn": dictionary_name_en,
        "review_required": False,
        "public_data_changed": False,
    }


def _make_client(client: Any = None) -> tuple[Any, bool]:
    if client is not None:
        return client, False
    return httpx.Client(headers={"User-Agent": "GHS-label-quick-search seed-identity-audit"}), True


def audit_seed_entry(
    cas_number: str,
    dictionary_name_en: str,
    *,
    client: Any = None,
    timeout: float = 20.0,
    max_retries: int = 2,
    rate_limit_seconds: float = 0.25,
    rate_limiter: Optional[PubChemRateLimiter] = None,
    sleeper: Callable[[float], None] = time.sleep,
) -> dict[str, Any]:
    http_client, should_close = _make_client(client)
    entry_rate_limiter = rate_limiter or PubChemRateLimiter(
        rate_limit_seconds,
        sleeper=sleeper,
    )
    try:
        try:
            cid_match = fetch_cid_majority(
                cas_number,
                client=http_client,
                timeout=timeout,
                max_retries=max_retries,
                rate_limit_seconds=rate_limit_seconds,
                rate_limiter=entry_rate_limiter,
                sleeper=sleeper,
            )
            if cid_match is None:
                result = _base_result(cas_number, dictionary_name_en)
                result.update(
                    {
                        "status": "no_record",
                        "cid": None,
                        "cidSource": None,
                        "cidVoteCount": 0,
                        "cidVoteTotal": 0,
                        "cidVoteRatio": None,
                        "pubchemTitle": "",
                        "matchedSynonym": None,
                        "error": "",
                    }
                )
                return result

            cid = int(cid_match["cid"])
            title = fetch_pubchem_title(
                cid,
                client=http_client,
                timeout=timeout,
                max_retries=max_retries,
                rate_limit_seconds=rate_limit_seconds,
                rate_limiter=entry_rate_limiter,
                sleeper=sleeper,
            )
            synonyms = fetch_pubchem_synonyms(
                cid,
                client=http_client,
                timeout=timeout,
                max_retries=max_retries,
                rate_limit_seconds=rate_limit_seconds,
                rate_limiter=entry_rate_limiter,
                sleeper=sleeper,
            )
            status, matched_synonym = classify_seed_identity(
                dictionary_name_en,
                title,
                synonyms,
            )
            result = _base_result(cas_number, dictionary_name_en)
            result.update(
                {
                    "status": status,
                    "cid": cid,
                    **cid_match,
                    "pubchemTitle": title,
                    "matchedSynonym": matched_synonym,
                    "synonymCount": len(synonyms),
                    "error": "",
                }
            )
            if status == "mismatch":
                result["review_required"] = True
            return result
        except PubChemUpstreamError as exc:
            result = _base_result(cas_number, dictionary_name_en)
            result.update(
                {
                    "status": "upstream_error",
                    "cid": None,
                    "cidSource": None,
                    "cidVoteCount": 0,
                    "cidVoteTotal": 0,
                    "cidVoteRatio": None,
                    "pubchemTitle": "",
                    "matchedSynonym": None,
                    "error": str(exc),
                }
            )
            return result
    finally:
        if should_close and hasattr(http_client, "close"):
            http_client.close()


def load_checkpoint(path: Optional[Path | str]) -> dict[str, Any]:
    if not path:
        return {"schemaVersion": CHECKPOINT_SCHEMA_VERSION, "source": AUDIT_SOURCE, "completed": {}}
    checkpoint_path = Path(path)
    if not checkpoint_path.exists():
        return {"schemaVersion": CHECKPOINT_SCHEMA_VERSION, "source": AUDIT_SOURCE, "completed": {}}
    payload = json.loads(checkpoint_path.read_text(encoding="utf-8"))
    payload.setdefault("schemaVersion", CHECKPOINT_SCHEMA_VERSION)
    payload.setdefault("source", AUDIT_SOURCE)
    payload.setdefault("completed", {})
    return payload


def write_checkpoint(path: Path | str, completed: dict[str, dict[str, Any]]) -> None:
    checkpoint_path = Path(path)
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    checkpoint_path.write_text(
        json.dumps(
            {
                "schemaVersion": CHECKPOINT_SCHEMA_VERSION,
                "source": AUDIT_SOURCE,
                "updatedAt": utc_now_iso(),
                "completed": completed,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )


def find_duplicate_chinese_identity_notes(
    *,
    cas_to_zh: dict[str, str] = CAS_TO_ZH,
    cas_to_en: dict[str, str] = CAS_TO_EN,
) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for cas, name_zh in cas_to_zh.items():
        zh = (name_zh or "").strip()
        if not zh:
            continue
        grouped[zh].append({"cas_number": cas, "name_en": cas_to_en.get(cas, "")})

    notes: list[dict[str, Any]] = []
    for name_zh, rows in grouped.items():
        normalized_english = {
            normalize_identity_name(row["name_en"])
            for row in rows
            if row.get("name_en")
        }
        if len(rows) > 1 and len(normalized_english) > 1:
            notes.append(
                {
                    "name_zh": name_zh,
                    "cas_numbers": [row["cas_number"] for row in rows],
                    "name_en_values": [row["name_en"] for row in rows],
                    "review_required": True,
                    "public_data_changed": False,
                }
            )
    return sorted(notes, key=lambda item: (-len(item["cas_numbers"]), item["name_zh"]))


def _action_queue_item(result: dict[str, Any]) -> dict[str, Any]:
    ratio = result.get("cidVoteRatio")
    return {
        "key": f"seed-identity-mismatch:{result.get('cas_number')}",
        "severity": "high",
        "title": "Review seed dictionary identity mismatch",
        "nextAction": (
            "Verify the CAS/name pair bidirectionally against PubChem plus SDS, "
            "supplier label, or another authoritative source before opening a "
            "separate dictionary-fix slice."
        ),
        "cas_number": result.get("cas_number"),
        "dictionaryNameEn": result.get("dictionaryNameEn", ""),
        "pubchemTitle": result.get("pubchemTitle", ""),
        "cid": result.get("cid"),
        "cidVoteRatio": ratio,
        "review_required": True,
        "public_data_changed": False,
    }


def build_audit_report(
    results: list[dict[str, Any]],
    *,
    generated_at: Optional[str] = None,
) -> dict[str, Any]:
    details = {status: [] for status in AUDIT_STATUSES}
    summary = {"total": len(results), **{status: 0 for status in AUDIT_STATUSES}}
    for result in results:
        status = result.get("status", "upstream_error")
        if status not in details:
            status = "upstream_error"
        summary[status] += 1
        details[status].append(result)

    mismatches = details["mismatch"]
    action_queue = sorted(
        (_action_queue_item(result) for result in mismatches),
        key=lambda item: (-(item.get("cidVoteRatio") or 0), item.get("cas_number") or ""),
    )

    return {
        "schemaVersion": REPORT_SCHEMA_VERSION,
        "source": AUDIT_SOURCE,
        "reviewOnly": True,
        "generatedAt": generated_at or utc_now_iso(),
        "summary": summary,
        "details": details,
        "actionQueue": action_queue,
        "localNotes": {
            "sameChineseNameDifferentEnglishIdentity": find_duplicate_chinese_identity_notes()
        },
    }


def write_audit_outputs(report: dict[str, Any], output_dir: Path | str) -> dict[str, str]:
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)
    report_path = directory / REPORT_FILENAME
    mismatch_path = directory / MISMATCH_CSV_FILENAME
    output_files = {"report": str(report_path), "mismatchesCsv": str(mismatch_path)}
    report["outputFiles"] = output_files
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    fields = (
        "cas_number",
        "dictionaryNameEn",
        "pubchemTitle",
        "cid",
        "cidVoteRatio",
        "cidVoteCount",
        "cidVoteTotal",
        "cidSource",
        "matchedSynonym",
        "review_required",
        "public_data_changed",
    )
    with mismatch_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in report.get("details", {}).get("mismatch", []):
            writer.writerow({field: _csv_value(row.get(field, "")) for field in fields})

    return output_files


def audit_seed_dictionary(
    *,
    entries: Optional[dict[str, str]] = None,
    client: Any = None,
    checkpoint_path: Optional[Path | str] = None,
    output_dir: Optional[Path | str] = None,
    timeout: float = 20.0,
    max_retries: int = 2,
    rate_limit_seconds: float = 0.25,
    sleeper: Callable[[float], None] = time.sleep,
) -> dict[str, Any]:
    seed_entries = entries or CAS_TO_EN
    checkpoint = load_checkpoint(checkpoint_path)
    completed: dict[str, dict[str, Any]] = dict(checkpoint.get("completed", {}))
    results: list[dict[str, Any]] = []

    http_client, should_close = _make_client(client)
    rate_limiter = PubChemRateLimiter(rate_limit_seconds, sleeper=sleeper)
    try:
        for cas_number, dictionary_name_en in sorted(seed_entries.items()):
            checkpoint_result = completed.get(cas_number)
            if checkpoint_result and checkpoint_result.get("status") != "upstream_error":
                results.append(checkpoint_result)
                continue

            result = audit_seed_entry(
                cas_number,
                dictionary_name_en,
                client=http_client,
                timeout=timeout,
                max_retries=max_retries,
                rate_limit_seconds=rate_limit_seconds,
                rate_limiter=rate_limiter,
                sleeper=sleeper,
            )
            completed[cas_number] = result
            results.append(result)
            if checkpoint_path:
                write_checkpoint(checkpoint_path, completed)
    finally:
        if should_close and hasattr(http_client, "close"):
            http_client.close()

    report = build_audit_report(results)
    if output_dir:
        write_audit_outputs(report, output_dir)
    return report
