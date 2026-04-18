import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from pilot_store import PilotStore  # noqa: E402


def build_store(db_path: str | None) -> PilotStore:
    path = Path(db_path) if db_path else ROOT_DIR / "data" / "pilot.db"
    return PilotStore(path).connect()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Manage dictionary-growth overlays for the GHS pilot backend."
    )
    parser.add_argument("--db-path", help="Override the SQLite database path.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("report", help="Print dictionary-growth summary as JSON.")

    export_parser = subparsers.add_parser("export", help="Export full dictionary-growth data.")
    export_parser.add_argument("--output", help="Write JSON to a file instead of stdout.")

    entry_parser = subparsers.add_parser("add-entry", help="Add or update a manual dictionary entry.")
    entry_parser.add_argument("--cas", required=True)
    entry_parser.add_argument("--name-en", default="")
    entry_parser.add_argument("--name-zh", default="")
    entry_parser.add_argument("--notes", default="")
    entry_parser.add_argument("--source", default="manual")

    alias_parser = subparsers.add_parser("add-alias", help="Add or approve a dictionary alias.")
    alias_parser.add_argument("--alias", required=True)
    alias_parser.add_argument("--locale", choices=["en", "zh"], required=True)
    alias_parser.add_argument("--cas", required=True)
    alias_parser.add_argument("--status", default="approved")
    alias_parser.add_argument("--source", default="manual")
    alias_parser.add_argument("--confidence", type=float, default=1.0)
    alias_parser.add_argument("--notes", default="")

    link_parser = subparsers.add_parser("add-reference", help="Add or update a manual reference link.")
    link_parser.add_argument("--cas", required=True)
    link_parser.add_argument("--label", required=True)
    link_parser.add_argument("--url", required=True)
    link_parser.add_argument("--link-type", default="reference")
    link_parser.add_argument("--priority", type=int, default=50)
    link_parser.add_argument("--source", default="manual")
    link_parser.add_argument("--status", default="active")
    link_parser.add_argument("--cid", type=int)

    args = parser.parse_args()
    store = build_store(args.db_path)

    try:
        if args.command == "report":
            print(json.dumps(store.get_dictionary_summary(limit=50), ensure_ascii=False, indent=2))
            return 0

        if args.command == "export":
            snapshot = store.export_dictionary_snapshot()
            payload = json.dumps(snapshot, ensure_ascii=False, indent=2)
            if args.output:
                Path(args.output).write_text(payload, encoding="utf-8")
            else:
                print(payload)
            return 0

        if args.command == "add-entry":
            record = store.upsert_dictionary_entry(
                args.cas,
                name_en=args.name_en or None,
                name_zh=args.name_zh or None,
                notes=args.notes,
                source=args.source,
            )
            print(json.dumps(record, ensure_ascii=False, indent=2))
            return 0

        if args.command == "add-alias":
            record = store.upsert_alias(
                args.alias,
                args.locale,
                args.cas,
                status=args.status,
                source=args.source,
                confidence=args.confidence,
                notes=args.notes,
            )
            print(json.dumps(record, ensure_ascii=False, indent=2))
            return 0

        if args.command == "add-reference":
            record = store.upsert_reference_link(
                args.cas,
                label=args.label,
                url=args.url,
                link_type=args.link_type,
                priority=args.priority,
                source=args.source,
                status=args.status,
                cid=args.cid,
            )
            print(json.dumps(record, ensure_ascii=False, indent=2))
            return 0
    finally:
        store.close()

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
