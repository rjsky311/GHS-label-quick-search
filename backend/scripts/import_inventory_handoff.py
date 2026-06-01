import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from inventory_handoff_import import (  # noqa: E402
    import_inventory_handoff_to_admin_queue,
    load_inventory_handoff_payload,
)
from pilot_store import PilotStore  # noqa: E402


def write_payload(payload: dict, output: str | None) -> None:
    if output:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
        Path(output).write_text(text, encoding="utf-8")
        return
    text = json.dumps(payload, ensure_ascii=True, indent=2)
    sys.stdout.write(text + "\n")


def build_store(db_path: str | None) -> PilotStore:
    path = Path(db_path) if db_path else ROOT_DIR / "data" / "pilot.db"
    return PilotStore(path).connect()


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Dry-run or apply an inventory workbook audit handoff packet into "
            "the admin correction queue. This never approves public dictionary data."
        )
    )
    parser.add_argument(
        "handoff",
        help="Path to a handoff directory or audit.json with handoffRecords.",
    )
    parser.add_argument("--db-path", help="Override the SQLite pilot database path.")
    parser.add_argument("--output", help="Write import report JSON to this file.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write non-duplicate correction requests to the pilot admin queue.",
    )
    parser.add_argument(
        "--skip-candidate-names",
        action="store_true",
        help="Do not import workbook Chinese-name candidates.",
    )
    parser.add_argument(
        "--skip-unknown-seed",
        action="store_true",
        help="Do not import CAS rows that are outside the seed dictionary.",
    )
    parser.add_argument(
        "--allow-duplicates",
        action="store_true",
        help="Allow repeated imports of matching open/candidate correction requests.",
    )

    args = parser.parse_args()
    payload = load_inventory_handoff_payload(args.handoff)
    store = build_store(args.db_path)
    try:
        report = import_inventory_handoff_to_admin_queue(
            payload,
            store=store,
            apply=args.apply,
            include_candidate_names=not args.skip_candidate_names,
            include_unknown_seed=not args.skip_unknown_seed,
            skip_existing=not args.allow_duplicates,
        )
        write_payload(report, args.output)
        return 0
    finally:
        store.close()


if __name__ == "__main__":
    raise SystemExit(main())
