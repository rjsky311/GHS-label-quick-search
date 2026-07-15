"""Bounded, structured observability events for platform log collection."""

from __future__ import annotations

import json
import logging
import math
import re
from datetime import datetime, timezone
from typing import Any, Optional


LOGGER = logging.getLogger("ghs.observability")
LOGGER.setLevel(logging.INFO)
MAX_EVENT_STRING_LENGTH = 240
MAX_EVENT_META_KEYS = 24
MAX_EVENT_META_ARRAY_ITEMS = 25
MAX_EVENT_META_JSON_CHARS = 2000
EVENT_TYPE_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_.:-]{0,79}$")
CAS_IDENTIFIER_PATTERN = re.compile(r"^\d{2,7}-\d{2}-\d$")
ALLOWED_FRONTEND_EVENT_TYPES = {
  "batch_input_normalized",
    "pdf_export_blocked",
    "pdf_export_complete",
    "pdf_export_start",
    "print_blocked",
  "print_complete",
  "print_handoff_qa",
  "print_autofit_retry",
  "print_continuation_tightening_retry",
  "print_start",
  "search_unresolved",
}


def _truncate(value: Any, limit: int = MAX_EVENT_STRING_LENGTH) -> str:
    text = str(value or "").strip()
    return text[:limit]


def _sanitize_meta_value(value: Any) -> Any:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value if math.isfinite(value) else None
    if isinstance(value, str):
        return _truncate(value)
    if isinstance(value, list):
        return [
            sanitized
            for item in value[:MAX_EVENT_META_ARRAY_ITEMS]
            if (sanitized := _sanitize_meta_value(item)) is not None
        ]
    if isinstance(value, dict):
        try:
            redacted = {
                str(key): sanitized
                for key, item in value.items()
                if not re.search(
                    r"token|secret|password|authorization|cookie|email",
                    str(key),
                    re.I,
                )
                and (sanitized := _sanitize_meta_value(item)) is not None
            }
            encoded = json.dumps(redacted, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            return None
        return _truncate(encoded)
    return None


def sanitize_event_meta(meta: Any) -> dict[str, Any]:
    if not isinstance(meta, dict):
        return {}
    sanitized: dict[str, Any] = {}
    for raw_key, raw_value in list(meta.items())[:MAX_EVENT_META_KEYS]:
        key = _truncate(raw_key, 80)
        if not key or re.search(r"token|secret|password|authorization|cookie|email", key, re.I):
            continue
        value = _sanitize_meta_value(raw_value)
        if value is not None:
            sanitized[key] = value
    return sanitized


def _sanitize_cas_identifier(value: Any) -> str:
    candidate = _truncate(value, 32)
    return candidate if CAS_IDENTIFIER_PATTERN.fullmatch(candidate) else ""


def _event_record(
    event_type: str,
    *,
    source: str,
    event_id: Optional[str] = None,
    ts: Optional[str] = None,
    query: Optional[str] = None,
    query_type: Optional[str] = None,
    cas: Optional[str] = None,
    status: Optional[str] = None,
    count: int = 1,
    meta: Any = None,
) -> dict[str, Any]:
    return {
        "id": _truncate(event_id) or f"evt_{datetime.now(timezone.utc).timestamp():.6f}",
        "ts": _truncate(ts) or datetime.now(timezone.utc).isoformat(),
        "source": _truncate(source) or "backend",
        "type": _truncate(event_type, 80),
        "query": _sanitize_cas_identifier(query),
        "queryType": _truncate(query_type, 80),
        "cas": _sanitize_cas_identifier(cas),
        "status": _truncate(status, 80),
        "count": max(1, min(int(count or 1), 1000)),
        "meta": sanitize_event_meta(meta),
    }


def emit_structured_event(
    event_type: str,
    *,
    source: str = "backend",
    payload: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    record = _event_record(
        event_type,
        source=source,
        event_id=(payload or {}).get("id"),
        ts=(payload or {}).get("ts"),
        query=(payload or {}).get("query"),
        query_type=(payload or {}).get("queryType") or (payload or {}).get("query_type"),
        cas=(payload or {}).get("cas"),
        status=(payload or {}).get("status"),
        count=(payload or {}).get("count", 1),
        meta=(payload or {}).get("meta", payload or {}),
    )
    LOGGER.info(
        json.dumps(
            {"event": record},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
    )
    return record


def record_telemetry_event(payload: dict[str, Any]) -> dict[str, Any]:
    event_type = _truncate(payload.get("type"), 80)
    if event_type not in ALLOWED_FRONTEND_EVENT_TYPES:
        raise ValueError("unsupported telemetry event type")
    return emit_structured_event(
        event_type,
        source=_truncate(payload.get("source")) or "frontend",
        payload=payload,
    )
