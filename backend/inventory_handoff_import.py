from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable, Optional

from pilot_store import CORRECTION_REQUEST_REVIEW_STATUSES, PilotStore

HANDOFF_IMPORT_SOURCE = "inventory-workbook-audit"
HANDOFF_IMPORT_REPORT_SOURCE = "inventory-handoff-admin-import"


def load_inventory_handoff_payload(path: str | Path) -> dict[str, Any]:
    source_path = Path(path)
    if source_path.is_dir():
        source_path = source_path / "audit.json"
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("inventory handoff payload must be a JSON object")
    return payload


def _clean(value: Any, *, limit: int = 1000) -> str:
    return str(value or "").replace("\x00", "").strip()[:limit]


def _candidate_from_handoff_record(record: dict[str, Any]) -> dict[str, Any]:
    candidate = {
        "schema_version": 1,
        "review_required": True,
        "approved_for_public_use": False,
        "public_data_changed": False,
        "source": HANDOFF_IMPORT_SOURCE,
        "candidate_type": "missing-chinese-name",
        "issue_type": "missing-chinese-name",
        "cas_number": _clean(record.get("cas_number") or record.get("normalized"), limit=32),
        "name_en": _clean(record.get("name_en") or record.get("nameEn"), limit=240),
        "name_zh": _clean(record.get("name_zh") or record.get("nameZh"), limit=240),
        "evidence_type": _clean(
            record.get("evidence_type") or "Inventory workbook Chinese name",
            limit=160,
        ),
        "review_notes": _clean(
            record.get("review_notes")
            or "Inventory workbook candidate only. Verify against SDS, supplier label, or authoritative local source before approving a manual dictionary entry.",
            limit=1000,
        ),
    }
    return {key: value for key, value in candidate.items() if value not in {"", None}}


def _handoff_context(record: dict[str, Any]) -> str:
    sheet = _clean(record.get("sheet"), limit=120)
    row = _clean(record.get("row"), limit=40)
    raw = _clean(record.get("raw"), limit=120)
    parts = ["Inventory workbook handoff"]
    if sheet:
        parts.append(f"sheet={sheet}")
    if row:
        parts.append(f"row={row}")
    if raw:
        parts.append(f"raw={raw}")
    return "; ".join(parts)


def _missing_chinese_name_request(record: dict[str, Any]) -> dict[str, Any]:
    candidate = _candidate_from_handoff_record(record)
    cas_number = candidate.get("cas_number", "")
    name_en = candidate.get("name_en", "")
    name_zh = candidate.get("name_zh", "")
    return {
        "kind": "workbook-chinese-name-candidate",
        "issue_type": "missing-chinese-name",
        "status": "candidate_found",
        "cas_number": cas_number,
        "chemical_name": name_en,
        "query_text": cas_number or name_en,
        "current_output": "Seed dictionary is missing a reviewed Traditional Chinese name for this workbook row.",
        "expected_output": f"Review candidate Chinese name: {name_zh}",
        "evidence_type": candidate.get("evidence_type", "Inventory workbook Chinese name"),
        "local_context": _handoff_context(record),
        "candidate": candidate,
        "source": HANDOFF_IMPORT_SOURCE,
    }


def _unknown_seed_request(record: dict[str, Any]) -> dict[str, Any]:
    cas_number = _clean(record.get("normalized") or record.get("cas_number"), limit=32)
    name_en = _clean(record.get("nameEn") or record.get("name_en"), limit=240)
    name_zh = _clean(record.get("nameZh") or record.get("name_zh"), limit=240)
    expected = (
        "Decide whether this workbook CAS/name pair needs a manual entry, alias, "
        "correction request, or no action. Do not import workbook identity fields directly."
    )
    if name_zh:
        expected += f" Workbook Chinese text is review-only: {name_zh}"
    return {
        "kind": "unknown-seed-dictionary-row",
        "issue_type": "unresolved-search",
        "status": "open",
        "cas_number": cas_number,
        "chemical_name": name_en,
        "query_text": cas_number or name_en,
        "current_output": "This workbook CAS row is outside the seed dictionary.",
        "expected_output": expected,
        "evidence_type": "Inventory workbook seed-dictionary gap",
        "local_context": _handoff_context(record),
        "candidate": {},
        "source": HANDOFF_IMPORT_SOURCE,
    }


def build_inventory_handoff_import_items(
    payload: dict[str, Any],
    *,
    include_candidate_names: bool = True,
    include_unknown_seed: bool = True,
) -> list[dict[str, Any]]:
    records = payload.get("handoffRecords") or {}
    if not isinstance(records, dict):
        raise ValueError("inventory handoff payload has invalid handoffRecords")

    items: list[dict[str, Any]] = []
    if include_candidate_names:
        for record in records.get("workbookChineseNameCandidates", []):
            if isinstance(record, dict):
                items.append(_missing_chinese_name_request(record))
    if include_unknown_seed:
        for record in records.get("unknownSeedDictionary", []):
            if isinstance(record, dict):
                items.append(_unknown_seed_request(record))
    return items


def _request_key(item: dict[str, Any]) -> tuple[str, str, str, str, str]:
    candidate = item.get("candidate") or {}
    return (
        item.get("issue_type") or "",
        item.get("cas_number") or "",
        item.get("source") or "",
        candidate.get("name_zh") or "",
        item.get("chemical_name") or item.get("query_text") or "",
    )


def _existing_request_keys(
    store: PilotStore,
    *,
    statuses: Iterable[str] = CORRECTION_REQUEST_REVIEW_STATUSES,
) -> set[tuple[str, str, str, str, str]]:
    existing_items = store.list_correction_requests(
        limit=10000,
        statuses=statuses,
        include_context=True,
    )
    keys: set[tuple[str, str, str, str, str]] = set()
    for item in existing_items:
        candidate = item.get("candidate") or {}
        keys.add(
            (
                item.get("issueType") or item.get("issue_type") or "",
                item.get("casNumber") or item.get("cas_number") or "",
                item.get("source") or "",
                candidate.get("name_zh") or "",
                item.get("chemicalName") or item.get("queryText") or "",
            )
        )
    return keys


def import_inventory_handoff_to_admin_queue(
    payload: dict[str, Any],
    *,
    store: Optional[PilotStore] = None,
    apply: bool = False,
    include_candidate_names: bool = True,
    include_unknown_seed: bool = True,
    skip_existing: bool = True,
) -> dict[str, Any]:
    items = build_inventory_handoff_import_items(
        payload,
        include_candidate_names=include_candidate_names,
        include_unknown_seed=include_unknown_seed,
    )
    existing_keys = _existing_request_keys(store) if store and skip_existing else set()

    planned: list[dict[str, Any]] = []
    created: list[dict[str, Any]] = []
    skipped_existing = 0
    for item in items:
        key = _request_key(item)
        plan_item = {
            "kind": item["kind"],
            "issueType": item["issue_type"],
            "status": item["status"],
            "casNumber": item.get("cas_number", ""),
            "chemicalName": item.get("chemical_name", ""),
            "queryText": item.get("query_text", ""),
            "source": item["source"],
            "candidateNameZh": (item.get("candidate") or {}).get("name_zh", ""),
        }
        if key in existing_keys:
            skipped_existing += 1
            planned.append({**plan_item, "action": "skip_existing"})
            continue

        planned.append({**plan_item, "action": "create_correction_request"})
        if apply:
            if store is None:
                raise ValueError("store is required when apply=True")
            record = store.record_correction_request(
                issue_type=item["issue_type"],
                cas_number=item.get("cas_number"),
                chemical_name=item.get("chemical_name"),
                query_text=item.get("query_text"),
                current_output=item.get("current_output"),
                expected_output=item.get("expected_output"),
                evidence_type=item.get("evidence_type"),
                local_context=item.get("local_context"),
                candidate=item.get("candidate") or {},
                source=item["source"],
                status=item["status"],
            )
            created.append(record)
        if skip_existing:
            existing_keys.add(key)

    return {
        "schemaVersion": 1,
        "source": HANDOFF_IMPORT_REPORT_SOURCE,
        "dryRun": not apply,
        "adminQueueChanged": bool(apply and created),
        "publicDataChanged": False,
        "summary": {
            "candidateNameItems": sum(
                1 for item in items if item["kind"] == "workbook-chinese-name-candidate"
            ),
            "unknownSeedItems": sum(
                1 for item in items if item["kind"] == "unknown-seed-dictionary-row"
            ),
            "plannedItems": len(items),
            "wouldCreate": sum(
                1 for item in planned if item["action"] == "create_correction_request"
            ),
            "created": len(created),
            "skippedExisting": skipped_existing,
        },
        "items": planned,
        "createdRecords": created,
    }
