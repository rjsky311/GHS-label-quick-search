import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from candidate_discovery import (  # noqa: E402
    DEFAULT_SOURCE_ORDER,
    SUPPORTED_CANDIDATE_SOURCES,
    build_discovery_report,
    discover_candidates_for_item,
    discover_candidates_from_correction_requests,
)
from pilot_store import PilotStore  # noqa: E402


def build_store(db_path: str | None) -> PilotStore:
    path = Path(db_path) if db_path else ROOT_DIR / "data" / "pilot.db"
    return PilotStore(path).connect()


def parse_sources(value: str) -> list[str]:
    sources = [part.strip().lower() for part in value.split(",") if part.strip()]
    allowed = set(SUPPORTED_CANDIDATE_SOURCES)
    unsupported = [source for source in sources if source not in allowed]
    if unsupported:
        raise argparse.ArgumentTypeError(
            f"unsupported source(s): {', '.join(unsupported)}"
        )
    return sources or list(DEFAULT_SOURCE_ORDER)


def write_payload(payload: dict, output: str | None) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if output:
        Path(output).write_text(text, encoding="utf-8")
        return
    print(text)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Dry-run candidate discovery for missing Chinese names and unresolved searches. "
            "This command does not write approved dictionary data."
        )
    )
    parser.add_argument("--db-path", help="Override the SQLite pilot database path.")
    parser.add_argument(
        "--sources",
        type=parse_sources,
        default=list(DEFAULT_SOURCE_ORDER),
        help=(
            "Comma-separated candidate sources. Supported: manual,local,wikidata. "
            "Default: manual,local. Including wikidata performs a bounded network lookup."
        ),
    )
    parser.add_argument("--output", help="Write the dry-run report JSON to this file.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--cas", help="Discover candidates for one CAS number.")
    mode.add_argument(
        "--from-correction-requests",
        action="store_true",
        help="Discover candidates for open/candidate correction requests.",
    )
    parser.add_argument("--name-en", default="", help="Optional English name context.")
    parser.add_argument("--query-text", default="", help="Optional unresolved query context.")
    parser.add_argument(
        "--status",
        default="open,candidate_found",
        help="Correction request statuses to inspect when using --from-correction-requests.",
    )
    parser.add_argument("--limit", type=int, default=100)

    args = parser.parse_args()
    store = build_store(args.db_path)
    try:
        if args.cas:
            item = discover_candidates_for_item(
                cas_number=args.cas,
                name_en=args.name_en,
                query_text=args.query_text,
                store=store,
                sources=args.sources,
            )
            payload = build_discovery_report([item], sources=args.sources)
            write_payload(payload, args.output)
            return 0

        statuses = [part.strip() for part in args.status.split(",") if part.strip()]
        payload = discover_candidates_from_correction_requests(
            store,
            statuses=statuses,
            sources=args.sources,
            limit=args.limit,
        )
        write_payload(payload, args.output)
        return 0
    finally:
        store.close()


if __name__ == "__main__":
    raise SystemExit(main())
