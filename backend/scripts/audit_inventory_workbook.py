import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from inventory_workbook_audit import audit_inventory_workbook  # noqa: E402


def write_payload(payload: dict, output: str | None) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if output:
        Path(output).write_text(text, encoding="utf-8")
        return
    print(text)


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
    parser.add_argument("--max-examples", type=int, default=20)
    parser.add_argument("--max-header-scan-rows", type=int, default=40)

    args = parser.parse_args()
    payload = audit_inventory_workbook(
        args.workbook,
        max_examples=max(0, args.max_examples),
        max_header_scan_rows=max(1, args.max_header_scan_rows),
    )
    write_payload(payload, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
