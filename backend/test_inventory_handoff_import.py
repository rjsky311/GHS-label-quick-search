import json
import subprocess
import sys
from pathlib import Path

from inventory_handoff_import import (
    build_inventory_handoff_import_items,
    import_inventory_handoff_to_admin_queue,
)
from pilot_store import PilotStore


def make_store(tmp_path: Path) -> PilotStore:
    return PilotStore(tmp_path / "inventory-handoff-import.db").connect()


def sample_handoff_payload() -> dict:
    return {
        "schemaVersion": 1,
        "dryRun": True,
        "publicDataChanged": False,
        "source": "inventory-workbook-audit",
        "workbook": "inventory.xlsx",
        "handoffRecords": {
            "workbookChineseNameCandidates": [
                {
                    "schema_version": 1,
                    "review_required": True,
                    "approved_for_public_use": False,
                    "public_data_changed": False,
                    "source": "inventory-workbook-audit",
                    "candidate_type": "missing-chinese-name",
                    "issue_type": "missing-chinese-name",
                    "evidence_type": "Inventory workbook Chinese name",
                    "review_notes": "Verify against SDS first.",
                    "cas_number": "123-45-5",
                    "name_en": "Unreviewed Example",
                    "name_zh": "\u5f85\u5be9\u4e2d\u6587\u540d",
                    "sheet": "Inventory",
                    "row": 2,
                }
            ],
            "unknownSeedDictionary": [
                {
                    "sheet": "Inventory",
                    "row": 3,
                    "raw": "987-65-4",
                    "normalized": "987-65-4",
                    "nameEn": "Outside Seed",
                    "nameZh": "\u6e05\u518a\u4e2d\u6587",
                }
            ],
        },
    }


def test_builds_admin_queue_items_from_inventory_handoff():
    items = build_inventory_handoff_import_items(sample_handoff_payload())

    assert [item["issue_type"] for item in items] == [
        "missing-chinese-name",
        "unresolved-search",
    ]
    assert items[0]["status"] == "candidate_found"
    assert items[0]["candidate"]["name_zh"] == "\u5f85\u5be9\u4e2d\u6587\u540d"
    assert items[0]["candidate"]["public_data_changed"] is False
    assert items[1]["status"] == "open"
    assert "review-only" in items[1]["expected_output"]


def test_dry_run_reports_admin_queue_plan_without_writes(tmp_path):
    store = make_store(tmp_path)
    try:
        report = import_inventory_handoff_to_admin_queue(
            sample_handoff_payload(),
            store=store,
        )

        assert report["dryRun"] is True
        assert report["publicDataChanged"] is False
        assert report["adminQueueChanged"] is False
        assert report["summary"]["wouldCreate"] == 2
        assert store.list_correction_requests(statuses=("open", "candidate_found")) == []
    finally:
        store.close()


def test_apply_creates_review_only_correction_requests_and_skips_duplicates(tmp_path):
    store = make_store(tmp_path)
    try:
        first = import_inventory_handoff_to_admin_queue(
            sample_handoff_payload(),
            store=store,
            apply=True,
        )
        second = import_inventory_handoff_to_admin_queue(
            sample_handoff_payload(),
            store=store,
            apply=True,
        )
        items = store.list_correction_requests(statuses=("open", "candidate_found"))

        assert first["summary"]["created"] == 2
        assert second["summary"]["created"] == 0
        assert second["summary"]["skippedExisting"] == 2
        assert len(items) == 2
        candidate_request = next(
            item for item in items if item["issueType"] == "missing-chinese-name"
        )
        assert candidate_request["status"] == "candidate_found"
        assert candidate_request["source"] == "inventory-workbook-audit"
        assert candidate_request["candidate"]["name_zh"] == "\u5f85\u5be9\u4e2d\u6587\u540d"
        assert candidate_request["candidate"]["approved_for_public_use"] is False
    finally:
        store.close()


def test_dry_run_deduplicates_repeated_handoff_rows(tmp_path):
    payload = sample_handoff_payload()
    payload["handoffRecords"]["unknownSeedDictionary"].append(
        dict(payload["handoffRecords"]["unknownSeedDictionary"][0])
    )
    store = make_store(tmp_path)
    try:
        report = import_inventory_handoff_to_admin_queue(payload, store=store)

        assert report["dryRun"] is True
        assert report["summary"]["plannedItems"] == 3
        assert report["summary"]["wouldCreate"] == 2
        assert report["summary"]["skippedExisting"] == 1
        assert [item["action"] for item in report["items"]] == [
            "create_correction_request",
            "create_correction_request",
            "skip_existing",
        ]
        assert store.list_correction_requests(statuses=("open", "candidate_found")) == []
    finally:
        store.close()


def test_inventory_handoff_import_cli_dry_run(tmp_path):
    handoff_dir = tmp_path / "handoff"
    handoff_dir.mkdir()
    (handoff_dir / "audit.json").write_text(
        json.dumps(sample_handoff_payload(), ensure_ascii=False),
        encoding="utf-8",
    )

    completed = subprocess.run(
        [
            sys.executable,
            "scripts/import_inventory_handoff.py",
            str(handoff_dir),
            "--db-path",
            str(tmp_path / "pilot.db"),
        ],
        cwd=Path(__file__).parent,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(completed.stdout)

    assert payload["dryRun"] is True
    assert payload["summary"]["plannedItems"] == 2
    assert payload["summary"]["wouldCreate"] == 2
