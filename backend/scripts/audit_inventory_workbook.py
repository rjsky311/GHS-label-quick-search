import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from inventory_workbook_audit import audit_inventory_workbook  # noqa: E402

ACTION_QUEUE_FIELDS = (
    "key",
    "count",
    "severity",
    "blocksBatchUse",
    "title",
    "nextAction",
    "targetExampleKeys",
    "review_required",
    "public_data_changed",
)
HANDOFF_CSV_FIELDS = {
    "invalidCas": ("sheet", "row", "raw", "normalized", "reason"),
    "workbookChineseNameCandidates": (
        "sheet",
        "row",
        "cas_number",
        "name_en",
        "name_zh",
        "evidence_type",
        "review_required",
        "approved_for_public_use",
        "public_data_changed",
        "review_notes",
    ),
    "unknownSeedDictionary": ("sheet", "row", "raw", "normalized", "nameEn", "nameZh"),
    "missingSeedChineseName": (
        "sheet",
        "row",
        "raw",
        "normalized",
        "nameEn",
        "workbookNameZh",
    ),
    "casCleanupSignals": (
        "sheet",
        "row",
        "raw",
        "rawNormalized",
        "normalized",
        "wasRehyphenated",
        "wasLeadingZeroCanonicalized",
    ),
    "duplicates": ("sheet", "row", "raw", "normalized", "reason"),
}
HANDOFF_FILENAMES = {
    "invalidCas": "invalid-cas.csv",
    "workbookChineseNameCandidates": "workbook-chinese-name-candidates.csv",
    "unknownSeedDictionary": "unknown-seed-dictionary.csv",
    "missingSeedChineseName": "missing-seed-chinese-name.csv",
    "casCleanupSignals": "cas-cleanup-signals.csv",
    "duplicates": "duplicates.csv",
}


def write_payload(payload: dict, output: str | None) -> None:
    if output:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
        Path(output).write_text(text, encoding="utf-8")
        return
    text = json.dumps(payload, ensure_ascii=True, indent=2)
    sys.stdout.write(text + "\n")


def csv_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (list, tuple)):
        return "; ".join(csv_value(item) for item in value)
    if value is None:
        return ""
    return str(value)


def write_csv(path: Path, rows: list[dict[str, Any]], fields: tuple[str, ...]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({field: csv_value(row.get(field, "")) for field in fields})


def write_handoff_readme(payload: dict[str, Any], output_dir: Path) -> None:
    summary = payload.get("summary", {})
    action_lines = [
        f"- `{item.get('key')}` ({item.get('severity')}, {item.get('count')}): "
        f"{item.get('nextAction')}"
        for item in payload.get("actionQueue", [])
    ]
    if not action_lines:
        action_lines = ["- No action queue items were produced for this workbook."]

    file_lines = [
        f"- `{filename}`: {len(payload.get('handoffRecords', {}).get(key, []))} rows"
        for key, filename in HANDOFF_FILENAMES.items()
    ]
    text = "\n".join(
        [
            "# Inventory Workbook Audit Handoff",
            "",
            "This packet is a dry-run maintainer aid. It does not approve or "
            "change public dictionary data.",
            "",
            "## Summary",
            "",
            f"- Workbook: `{payload.get('workbook', '')}`",
            f"- Valid CAS rows: {summary.get('validCasRowCount', 0)}",
            f"- Unique valid CAS numbers: {summary.get('uniqueValidCasCount', 0)}",
            f"- Invalid CAS cells: {summary.get('invalidCasCount', 0)}",
            f"- Unknown seed-dictionary rows: {summary.get('unknownSeedDictionaryRows', 0)}",
            f"- Missing seed Chinese-name rows: {summary.get('missingSeedChineseNameRows', 0)}",
            f"- Workbook Chinese-name candidates: {summary.get('workbookChineseNameCandidateRows', 0)}",
            f"- CAS cleanup signals: {summary.get('casCleanupSignalRows', 0)}",
            f"- Duplicate valid CAS rows: {summary.get('duplicateValidCasRows', 0)}",
            "",
            "## Action Queue",
            "",
            *action_lines,
            "",
            "## Generated Files",
            "",
            "- `audit.json`: full audit payload with summary, examples, actionQueue, and handoffRecords",
            "- `action-queue.csv`: one row per maintainer action",
            *file_lines,
            "",
            "## Rules",
            "",
            "- Fix invalid CAS rows in the source workbook before batch use.",
            "- Treat workbook Chinese names as review-only candidate evidence.",
            "- Verify candidate names against SDS, supplier labels, or regulatory evidence.",
            "- Use CAS cleanup rows as parser and production-QA fixtures.",
        ]
    )
    (output_dir / "README.md").write_text(text + "\n", encoding="utf-8")


def write_handoff_packet(payload: dict[str, Any], output_dir: str | None) -> None:
    if not output_dir:
        return
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "audit.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_csv(directory / "action-queue.csv", payload.get("actionQueue", []), ACTION_QUEUE_FIELDS)
    records = payload.get("handoffRecords", {})
    for key, filename in HANDOFF_FILENAMES.items():
        write_csv(directory / filename, records.get(key, []), HANDOFF_CSV_FIELDS[key])
    write_handoff_readme(payload, directory)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Dry-run audit for lab inventory workbooks. The command extracts CAS "
            "columns, validates/re-hyphenates CAS numbers, and reports review-only "
            "Chinese-name candidates without changing public dictionary data."
        )
    )
    parser.add_argument("workbook", help="Path to the XLSX workbook to audit.")
    parser.add_argument("--output", help="Write audit JSON to this file.")
    parser.add_argument(
        "--handoff-dir",
        help=(
            "Write a maintainer handoff packet: audit.json, action-queue.csv, "
            "category CSVs, and README.md. This implies full handoff records."
        ),
    )
    parser.add_argument(
        "--include-handoff-records",
        action="store_true",
        help="Include full handoffRecords in the JSON payload without writing CSV files.",
    )
    parser.add_argument("--max-examples", type=int, default=20)
    parser.add_argument("--max-header-scan-rows", type=int, default=40)

    args = parser.parse_args()
    payload = audit_inventory_workbook(
        args.workbook,
        max_examples=max(0, args.max_examples),
        max_header_scan_rows=max(1, args.max_header_scan_rows),
        include_handoff_records=bool(args.include_handoff_records or args.handoff_dir),
    )
    write_handoff_packet(payload, args.handoff_dir)
    write_payload(payload, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
