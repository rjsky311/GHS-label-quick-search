import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from h_code_coverage_audit import (  # noqa: E402
    audit_h_code_coverage,
    normalize_results_payload,
    parse_cas_values,
)


DEFAULT_API_URL = "https://ghs-backend.zeabur.app/api"
DEFAULT_CAS_VALUES = (
    "64-17-5",
    "67-56-1",
    "67-64-1",
    "75-07-0",
    "75-21-8",
    "50-00-0",
    "7647-01-0",
    "7664-93-9",
    "7722-84-1",
    "7782-50-5",
    "108-88-3",
)
DEFAULT_MIN_UNIQUE_H_CODE_COUNT = 20


def read_json_payload(input_path: str) -> Any:
    return json.loads(Path(input_path).read_text(encoding="utf-8"))


def fetch_batch_results(
    *,
    api_url: str,
    cas_numbers: list[str],
    timeout: float,
) -> list[dict[str, Any]]:
    endpoint = f"{api_url.rstrip('/')}/search"
    body = json.dumps({"cas_numbers": cas_numbers}).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API request failed with HTTP {exc.code}: {detail}") from exc
    return normalize_results_payload(payload)


def write_payload(payload: dict[str, Any], output: str | None) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if output:
        Path(output).write_text(text + "\n", encoding="utf-8")
        return
    sys.stdout.write(text + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Dry-run audit for H-code Traditional Chinese wording coverage. "
            "It checks observed PubChem/backend hazard statement codes across "
            "primary and alternate classifications, and flags payload fields "
            "that have degraded to the missing-wording placeholder."
        )
    )
    parser.add_argument(
        "--input",
        help="Read a saved ChemicalResult, result list, or {results: [...]} JSON file.",
    )
    parser.add_argument(
        "--cas",
        action="append",
        default=[],
        help=(
            "CAS number(s) to query. May be repeated or comma-separated. "
            "Ignored when --input is provided."
        ),
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"Backend API base URL. Default: {DEFAULT_API_URL}",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--output", help="Write JSON report to this path.")
    parser.add_argument(
        "--fail-on-gaps",
        action="store_true",
        help="Exit with status 1 when missing wording or placeholder payload is found.",
    )
    parser.add_argument(
        "--min-h-code-count",
        type=int,
        default=DEFAULT_MIN_UNIQUE_H_CODE_COUNT,
        help=(
            "Minimum unique H-code count expected when any result is found. "
            "Use 0 only for narrow debugging fixtures."
        ),
    )

    args = parser.parse_args()

    if args.input:
        results = normalize_results_payload(read_json_payload(args.input))
        source = {"mode": "input", "input": args.input}
    else:
        cas_numbers = parse_cas_values(args.cas) or list(DEFAULT_CAS_VALUES)
        results = fetch_batch_results(
            api_url=args.api_url,
            cas_numbers=cas_numbers,
            timeout=max(1.0, args.timeout),
        )
        source = {
            "mode": "api",
            "apiUrl": args.api_url.rstrip("/"),
            "casNumbers": cas_numbers,
        }

    report = audit_h_code_coverage(
        results,
        min_unique_code_count=max(0, args.min_h_code_count),
    )
    report["source"] = source
    write_payload(report, args.output)
    if args.fail_on_gaps and report["summary"]["blockedForCompleteLabels"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
