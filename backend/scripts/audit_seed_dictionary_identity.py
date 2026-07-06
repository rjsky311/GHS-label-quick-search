import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from chemical_dict import CAS_TO_EN  # noqa: E402
from seed_dictionary_identity_audit import audit_seed_dictionary  # noqa: E402


def build_entries(limit: int | None = None) -> dict[str, str]:
    entries = dict(sorted(CAS_TO_EN.items()))
    if limit is not None:
        return dict(list(entries.items())[: max(0, int(limit))])
    return entries


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Seed dictionary identity audit. This maintainer-only dry run "
            "cross-checks local CAS_TO_EN identities against PubChem and writes "
            "review-only reports without changing public dictionary data."
        )
    )
    parser.add_argument("--checkpoint", help="Checkpoint JSON path for resumable runs.")
    parser.add_argument(
        "--output-dir",
        help=(
            "Directory for the JSON report, active mismatch CSV, and reviewed "
            "exemption CSV."
        ),
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Audit only the first N sorted CAS entries; useful for smoke checks.",
    )
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument(
        "--rate-limit-seconds",
        type=float,
        default=0.25,
        help="Minimum delay before each PubChem request. Keep >=0.25 for full runs.",
    )

    args = parser.parse_args()
    report = audit_seed_dictionary(
        entries=build_entries(args.limit),
        checkpoint_path=args.checkpoint,
        output_dir=args.output_dir,
        timeout=max(1.0, args.timeout),
        max_retries=max(0, args.max_retries),
        rate_limit_seconds=max(0.0, args.rate_limit_seconds),
    )
    sys.stdout.write(
        json.dumps(
            {
                "source": report.get("source"),
                "reviewOnly": report.get("reviewOnly"),
                "summary": report.get("summary", {}),
                "outputFiles": report.get("outputFiles", {}),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
