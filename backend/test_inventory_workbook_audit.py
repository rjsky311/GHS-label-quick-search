import json
import subprocess
import sys
from pathlib import Path

from openpyxl import Workbook

from inventory_workbook_audit import (
    audit_inventory_workbook,
    has_valid_cas_checksum,
    normalize_cas_token_detailed,
)


def save_workbook(path: Path, sheets: list[tuple[str, list[list[object]]]]) -> Path:
    workbook = Workbook()
    workbook.remove(workbook.active)
    for title, rows in sheets:
        sheet = workbook.create_sheet(title=title)
        for row in rows:
            sheet.append(row)
    workbook.save(path)
    return path


def test_normalizes_dirty_inventory_cas_tokens():
    numeric = normalize_cas_token_detailed(73183343.0)
    trailing = normalize_cas_token_detailed("7719-09-7.")
    leading_zero = normalize_cas_token_detailed("0118-12-7")

    assert numeric["normalized"] == "73183-34-3"
    assert numeric["wasRehyphenated"] is True
    assert numeric["valid"] is True
    assert trailing["normalized"] == "7719-09-7"
    assert trailing["valid"] is True
    assert leading_zero["normalized"] == "118-12-7"
    assert leading_zero["wasLeadingZeroCanonicalized"] is True
    assert leading_zero["valid"] is True
    assert has_valid_cas_checksum("123-45-5") is True


def test_audits_workbook_cas_columns_and_skips_unrelated_numbers(tmp_path):
    workbook_path = save_workbook(
        tmp_path / "inventory.xlsx",
        [
            (
                "\u4e2d\u7814\u9662\u85e5\u518a",
                [
                    ["CAS\u7de8\u865f", "\u82f1\u6587\u540d\u7a31", "\u4e2d\u6587\u540d\u7a31"],
                    ["7664-93-9", "Sulfuric acid", "\u786b\u9178"],
                    ["7719-09-7.", "Thionyl chloride", "\u6c2f\u4e9e\u786b\u91af"],
                    ["0118-12-7", "Leading zero example", "\u524d\u5c0e\u96f6\u6e2c\u8a66"],
                    ["#VALUE!", "Hydrogen bromide", "\u6eb4\u5316\u6c2b"],
                    [73183343.0, "Inventory numeric CAS", "\u6578\u5b57\u6e2c\u8a66"],
                ],
            ),
            (
                "Sheet26",
                [
                    ["CAS No", "Name"],
                    [1003094.0, "2-Bromothiophene"],
                ],
            ),
            (
                "NoHeader",
                [
                    ["barcode", "date", "quantity"],
                    [20200813, 20240101, 12],
                ],
            ),
        ],
    )

    report = audit_inventory_workbook(workbook_path, max_examples=10)

    assert report["dryRun"] is True
    assert report["publicDataChanged"] is False
    assert report["summary"]["sheetCount"] == 3
    assert report["summary"]["sheetsWithCasColumn"] == 2
    assert report["summary"]["skippedSheets"] == 1
    assert report["summary"]["casCellCount"] == 6
    assert report["summary"]["validCasRowCount"] == 5
    assert report["summary"]["uniqueValidCasCount"] == 5
    assert report["summary"]["invalidCasCount"] == 1
    assert report["summary"]["casCleanupSignalRows"] == 3
    assert report["summary"]["rehyphenatedCasCount"] == 2
    assert report["summary"]["leadingZeroCasCount"] == 1
    assert [item["key"] for item in report["actionQueue"]] == [
        "fix-invalid-cas",
        "confirm-cas-cleanup-coverage",
    ]
    assert report["actionQueue"][0]["blocksBatchUse"] is True
    assert report["actionQueue"][1]["public_data_changed"] is False
    assert report["actionQueue"][1]["targetExampleKeys"] == [
        "rehyphenatedCas",
        "leadingZeroCas",
    ]
    assert {
        item["normalized"] for item in report["examples"]["rehyphenatedCas"]
    } == {"73183-34-3", "1003-09-4"}
    assert report["examples"]["invalidCas"][0]["raw"] == "#VALUE!"
    assert report["examples"]["leadingZeroCas"][0]["rawNormalized"] == "0118-12-7"
    assert report["examples"]["leadingZeroCas"][0]["normalized"] == "118-12-7"
    assert any(
        sheet["status"] == "skipped_no_cas_header" and sheet["sheet"] == "NoHeader"
        for sheet in report["sheetSummaries"]
    )


def test_workbook_chinese_names_are_review_only_candidates(tmp_path):
    workbook_path = save_workbook(
        tmp_path / "candidate.xlsx",
        [
            (
                "\u5019\u9078",
                [
                    ["CAS\u7de8\u865f", "\u82f1\u6587\u540d\u7a31", "\u4e2d\u6587\u540d\u7a31"],
                    ["123-45-5", "Unreviewed Example", "\u5f85\u5be9\u4e2d\u6587\u540d"],
                ],
            )
        ],
    )

    report = audit_inventory_workbook(workbook_path, max_examples=10)
    candidate = report["examples"]["workbookChineseNameCandidates"][0]

    assert report["summary"]["unknownSeedDictionaryRows"] == 1
    assert report["summary"]["missingSeedChineseNameRows"] == 1
    assert report["summary"]["workbookChineseNameCandidateRows"] == 1
    assert [item["key"] for item in report["actionQueue"]] == [
        "review-workbook-chinese-candidates",
        "triage-unknown-seed-dictionary",
    ]
    assert candidate["review_required"] is True
    assert candidate["approved_for_public_use"] is False
    assert candidate["public_data_changed"] is False
    assert candidate["cas_number"] == "123-45-5"
    assert candidate["name_zh"] == "\u5f85\u5be9\u4e2d\u6587\u540d"
    assert candidate["sheet"] == "\u5019\u9078"
    assert candidate["row"] == 2


def test_inventory_workbook_audit_cli_outputs_json(tmp_path):
    workbook_path = save_workbook(
        tmp_path / "cli.xlsx",
        [
            (
                "Inventory",
                [
                    ["CAS", "Name"],
                    ["64-17-5", "Ethanol"],
                ],
            )
        ],
    )
    completed = subprocess.run(
        [
            sys.executable,
            "scripts/audit_inventory_workbook.py",
            str(workbook_path),
            "--max-examples",
            "2",
        ],
        cwd=Path(__file__).parent,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(completed.stdout)

    assert payload["source"] == "inventory-workbook-audit"
    assert payload["summary"]["validCasRowCount"] == 1
    assert payload["summary"]["uniqueValidCasCount"] == 1
    assert payload["actionQueue"] == []
