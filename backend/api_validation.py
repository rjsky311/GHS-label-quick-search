import json
import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from pilot_store import (
    APPROVED_ALIAS_STATUS,
    CORRECTION_REQUEST_STATUSES,
    CORRECTION_REQUEST_TYPES,
    DEFAULT_MISS_QUERY_RETENTION_DAYS,
    MANUAL_ENTRY_STATUSES,
    MISS_QUERY_STATUSES,
)

WORKSPACE_DOC_TYPES = {
    "lab_profile",
    "print_custom_label_fields",
    "print_recents",
    "print_templates",
    "prepared_recents",
    "prepared_presets",
}
ALLOWED_REFERENCE_URL_SCHEMES = {"http", "https"}
REFERENCE_LINK_TYPES = {"sds", "regulatory", "occupational", "reference"}
REFERENCE_LINK_TYPE_PRIORITY = {
    "sds": 0,
    "regulatory": 1,
    "occupational": 2,
    "reference": 3,
}
MAX_EXPORT_ROWS = 500
MAX_PUBLIC_CAS_QUERY_LENGTH = 64
MAX_PUBLIC_SEARCH_QUERY_LENGTH = 240
MAX_EXPORT_PAYLOAD_JSON_CHARS = 4_000_000
MAX_EXPORT_ROW_JSON_CHARS = 40_000
MAX_EXPORT_DICT_KEYS = 80
MAX_EXPORT_LIST_ITEMS = 120
MAX_EXPORT_KEY_CHARS = 120
MAX_EXPORT_SCALAR_CHARS = 8_000
MAX_EXPORT_NESTING_DEPTH = 6
MAX_MISS_QUERY_LENGTH = 160
MAX_MISS_QUERY_KIND_LENGTH = 40
MAX_MISS_ENDPOINT_LENGTH = 80
MAX_MISS_CONTEXT_ITEMS = 20
MAX_MISS_CONTEXT_JSON_CHARS = 2000
MAX_MISS_CONTEXT_SCALAR_CHARS = 160
ALLOWED_MISS_CONTEXT_KEYS = {
    "locale",
    "normalizedCas",
    "resultCount",
    "searchMode",
    "source",
}
MAX_WORKSPACE_DOCUMENT_JSON_CHARS = 200000
MAX_ADMIN_CAS_LENGTH = 32
MAX_ADMIN_NAME_LENGTH = 240
MAX_ADMIN_NOTES_LENGTH = 1000
MAX_ADMIN_SOURCE_LENGTH = 80
MAX_ALIAS_TEXT_LENGTH = 240
MAX_REFERENCE_PRIORITY = 1000
MAX_CORRECTION_TEXT_LENGTH = 2000
MAX_CORRECTION_CONTEXT_CHARS = 2000
MAX_CORRECTION_CANDIDATE_JSON_CHARS = 4000
MAX_CORRECTION_SOURCE_LENGTH = 80
ALLOWED_ALIAS_LOCALES = {"en", "zh"}
ALLOWED_ALIAS_STATUSES = {APPROVED_ALIAS_STATUS, "pending", "needs_evidence", "rejected"}
ALLOWED_MANUAL_ENTRY_STATUSES = MANUAL_ENTRY_STATUSES
ALLOWED_REFERENCE_STATUSES = {"active", "inactive"}
ALLOWED_CORRECTION_REQUEST_STATUSES = CORRECTION_REQUEST_STATUSES
ALLOWED_CORRECTION_REQUEST_TYPES = CORRECTION_REQUEST_TYPES
ALLOWED_CORRECTION_CANDIDATE_KEYS = {
    "schema_version",
    "review_required",
    "approved_for_public_use",
    "source",
    "candidate_type",
    "issue_type",
    "request_id",
    "cas_number",
    "name_en",
    "name_zh",
    "query_text",
    "evidence_type",
    "evidence_url",
    "review_notes",
    "current_output",
    "expected_output",
    "converted_to_manual_entry",
    "manual_entry_status",
    "manual_entry_source",
    "public_data_changed",
}
CORRECTION_CANDIDATE_TEXT_LIMITS = {
    "name_en": MAX_ADMIN_NAME_LENGTH,
    "name_zh": MAX_ADMIN_NAME_LENGTH,
    "query_text": MAX_ADMIN_NAME_LENGTH,
    "cas_number": MAX_ADMIN_CAS_LENGTH,
    "source": MAX_ADMIN_SOURCE_LENGTH,
    "candidate_type": 80,
    "issue_type": 80,
    "evidence_type": 160,
    "evidence_url": 2048,
    "review_notes": MAX_ADMIN_NOTES_LENGTH,
    "current_output": MAX_CORRECTION_TEXT_LENGTH,
    "expected_output": MAX_CORRECTION_TEXT_LENGTH,
    "manual_entry_status": 40,
    "manual_entry_source": MAX_ADMIN_SOURCE_LENGTH,
}


def normalize_cas(cas: str) -> str:
    """Normalize CAS number format."""
    cas = cas.strip()
    cas = re.sub(r"^CAS[:\s-]*", "", cas, flags=re.IGNORECASE)
    cas = re.sub(r"[^\d-]", "", cas)

    if cas:
        parts = cas.split("-")
        if len(parts) == 3:
            parts[0] = parts[0].lstrip("0") or "0"
            parts[2] = parts[2].lstrip("0") or "0"
            if len(parts[1]) == 1:
                parts[1] = "0" + parts[1]
            cas = "-".join(parts)
        elif len(parts) == 1 and len(cas) >= 5:
            digits = re.sub(r"[^0-9]", "", cas)
            if len(digits) >= 5:
                check = digits[-1]
                middle = digits[-3:-1]
                first = digits[:-3].lstrip("0") or "0"
                cas = f"{first}-{middle}-{check}"

    return cas


def _is_safe_reference_url(value: str) -> bool:
    parsed = urlparse((value or "").strip())
    return parsed.scheme.lower() in ALLOWED_REFERENCE_URL_SCHEMES and bool(parsed.netloc)


def _safe_reference_link_type(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in REFERENCE_LINK_TYPES else "reference"


def _coerce_candidate_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _sanitize_correction_candidate_payload(
    value: Optional[Dict[str, Any]],
    *,
    allow_manual_review_metadata: bool = False,
) -> Dict[str, Any]:
    """Normalize candidate evidence so it can never imply public approval."""
    encoded = json.dumps(value or {}, ensure_ascii=False, sort_keys=True)
    if len(encoded) > MAX_CORRECTION_CANDIDATE_JSON_CHARS:
        raise ValueError("candidate payload is too large")
    if not value:
        return {}
    if not isinstance(value, dict):
        raise ValueError("candidate payload must be an object")

    sanitized: Dict[str, Any] = {}
    for raw_key, raw_value in value.items():
        key = str(raw_key or "").strip()
        if key not in ALLOWED_CORRECTION_CANDIDATE_KEYS:
            continue
        if raw_value is None:
            continue
        if key == "converted_to_manual_entry":
            if allow_manual_review_metadata:
                sanitized[key] = _coerce_candidate_bool(raw_value)
            continue
        if key in {"manual_entry_status", "manual_entry_source", "request_id"}:
            if not allow_manual_review_metadata:
                continue
            if key in {"manual_entry_status", "manual_entry_source"}:
                text = str(raw_value).replace("\x00", "").strip()
                if not text:
                    continue
                max_length = CORRECTION_CANDIDATE_TEXT_LIMITS.get(key, 80)
                if len(text) > max_length:
                    raise ValueError(f"{key} is too large")
                sanitized[key] = text
                continue
        if key == "request_id":
            try:
                request_id = int(raw_value)
            except (TypeError, ValueError):
                continue
            if request_id > 0:
                sanitized[key] = request_id
            continue
        if key == "schema_version":
            continue
        if key in {"review_required", "approved_for_public_use", "public_data_changed"}:
            continue

        text = str(raw_value).replace("\x00", "").strip()
        if not text:
            continue
        max_length = CORRECTION_CANDIDATE_TEXT_LIMITS.get(
            key,
            MAX_CORRECTION_TEXT_LENGTH,
        )
        if len(text) > max_length:
            raise ValueError(f"{key} is too large")
        if key == "cas_number":
            text = normalize_cas(text) or text
        if key == "evidence_url" and not _is_safe_reference_url(text):
            raise ValueError("candidate evidence URL must use http or https")
        sanitized[key] = text

    sanitized["schema_version"] = 1
    sanitized["review_required"] = True
    sanitized["approved_for_public_use"] = False
    sanitized["public_data_changed"] = False
    return sanitized


def _sanitize_dictionary_miss_context(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Keep public miss-query telemetry bounded to non-freeform metadata."""
    sanitized: Dict[str, Any] = {}
    for raw_key, raw_value in (value or {}).items():
        key = str(raw_key or "").strip()
        if key not in ALLOWED_MISS_CONTEXT_KEYS:
            continue
        if isinstance(raw_value, bool) or raw_value is None:
            sanitized[key] = raw_value
            continue
        if isinstance(raw_value, (int, float)):
            sanitized[key] = raw_value
            continue
        if isinstance(raw_value, str):
            text = raw_value.strip()
            if len(text) > MAX_MISS_CONTEXT_SCALAR_CHARS:
                raise ValueError("context scalar value is too large")
            sanitized[key] = text
    return sanitized


def _reference_link_type_rank(link: Dict[str, Any]) -> int:
    return REFERENCE_LINK_TYPE_PRIORITY.get(str(link.get("link_type") or ""), 99)


def _preferred_duplicate_reference_link(
    current: Dict[str, Any],
    candidate: Dict[str, Any],
) -> Dict[str, Any]:
    current_rank = _reference_link_type_rank(current)
    candidate_rank = _reference_link_type_rank(candidate)
    if candidate_rank != current_rank:
        return candidate if candidate_rank < current_rank else current
    if candidate["priority"] != current["priority"]:
        return candidate if candidate["priority"] < current["priority"] else current
    return candidate if candidate["label"] < current["label"] else current
