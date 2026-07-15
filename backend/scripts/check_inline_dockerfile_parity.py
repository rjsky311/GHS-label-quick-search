#!/usr/bin/env python3
"""Read-only parity check for the Dockerfile pinned in the Zeabur service spec."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol


DEFAULT_GRAPHQL_ENDPOINT = "https://api.zeabur.com/graphql"
DEFAULT_SERVICE_ID = "6962687391818d5fd9705a67"
DEFAULT_REPORT_PATH = "build/inline-dockerfile-parity-report.json"
GRAPHQL_QUERY = """
query InlineDockerfileParity($serviceID: ObjectID!) {
  service(_id: $serviceID) {
    _id
    name
    spec {
      source {
        dockerfile
      }
    }
  }
}
""".strip()


class HttpResponse(Protocol):
    status_code: int

    def json(self) -> Any: ...


class HttpClient(Protocol):
    def post(self, url: str, **kwargs: Any) -> HttpResponse: ...


class _UrllibResponse:
    def __init__(self, status_code: int, payload: Any):
        self.status_code = status_code
        self._payload = payload

    def json(self) -> Any:
        return self._payload


class UrllibClient:
    def post(self, url: str, **kwargs: Any) -> _UrllibResponse:
        body = json.dumps(kwargs.get("json", {})).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=body,
            headers=kwargs.get("headers", {}),
            method="POST",
        )
        timeout = float(kwargs.get("timeout", 20))
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return _UrllibResponse(
                    response.status,
                    _decode_json(response.read()),
                )
        except urllib.error.HTTPError as exc:
            return _UrllibResponse(exc.code, _decode_json(exc.read()))


def _decode_json(raw: bytes) -> Any:
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def normalize_dockerfile(text: str) -> str:
    """Normalize line endings only; whitespace and content remain significant."""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def dockerfile_digest(text: str) -> str:
    return hashlib.sha256(normalize_dockerfile(text).encode("utf-8")).hexdigest()


def _base_report(canonical_text: str, service_id: str) -> dict[str, Any]:
    return {
        "ok": False,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "serviceId": service_id,
        "canonicalDigest": dockerfile_digest(canonical_text),
        "liveDigest": None,
        "statusCategory": "unknown",
        "failures": [],
    }


def _failure(report: dict[str, Any], status_category: str, message: str) -> dict[str, Any]:
    report["statusCategory"] = status_category
    report["failures"] = [message]
    return report


def check_parity(
    *,
    canonical_text: str,
    service_id: str,
    endpoint: str,
    token: str,
    http_client: HttpClient | None = None,
) -> dict[str, Any]:
    report = _base_report(canonical_text, service_id)
    if not token:
        return _failure(
            report,
            "missing-token",
            "ZEABUR_TOKEN is required for inline Dockerfile parity.",
        )

    client = http_client or UrllibClient()
    try:
        response = client.post(
            endpoint,
            json={
                "query": GRAPHQL_QUERY,
                "variables": {"serviceID": service_id},
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "User-Agent": "ghs-inline-dockerfile-parity/1",
            },
            timeout=20,
        )
    except Exception:
        return _failure(
            report,
            "unavailable",
            "Zeabur service spec could not be queried.",
        )

    if response.status_code != 200:
        return _failure(
            report,
            "unavailable",
            f"Zeabur service spec query returned HTTP {response.status_code}.",
        )

    try:
        payload = response.json()
    except Exception:
        payload = None
    if not isinstance(payload, dict):
        return _failure(
            report,
            "invalid-response",
            "Zeabur service spec query returned an invalid JSON response.",
        )
    if payload.get("errors"):
        return _failure(
            report,
            "unavailable",
            "Zeabur service spec query returned a GraphQL error.",
        )

    service = (payload.get("data") or {}).get("service")
    if not isinstance(service, dict) or service.get("_id") != service_id:
        return _failure(
            report,
            "service-mismatch",
            "Zeabur returned a different service identity.",
        )
    dockerfile = (
        ((service.get("spec") or {}).get("source") or {}).get("dockerfile")
    )
    if not isinstance(dockerfile, str) or not dockerfile:
        return _failure(
            report,
            "missing-dockerfile",
            "Zeabur service spec has no inline Dockerfile.",
        )

    report["liveDigest"] = dockerfile_digest(dockerfile)
    if report["canonicalDigest"] != report["liveDigest"]:
        return _failure(
            report,
            "changed",
            "Canonical and live inline Dockerfiles differ.",
        )
    report["ok"] = True
    report["statusCategory"] = "matched"
    report["failures"] = []
    return report


def _write_report(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f"{json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)}\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--service-id", default=os.environ.get("ZEABUR_BACKEND_SERVICE_ID", DEFAULT_SERVICE_ID))
    parser.add_argument("--graphql-endpoint", default=os.environ.get("ZEABUR_GRAPHQL_ENDPOINT", DEFAULT_GRAPHQL_ENDPOINT))
    parser.add_argument("--token", default=os.environ.get("ZEABUR_TOKEN", ""))
    parser.add_argument(
        "--offline-canonical",
        type=Path,
        help="Compare against a local live-spec fixture without making a network request.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path(os.environ.get("INLINE_DOCKERFILE_PARITY_REPORT_PATH", DEFAULT_REPORT_PATH)),
    )
    args = parser.parse_args()

    canonical_text = args.canonical.read_text(encoding="utf-8")
    if args.offline_canonical:
        live_text = args.offline_canonical.read_text(encoding="utf-8")
        report = _base_report(canonical_text, args.service_id)
        report["liveDigest"] = dockerfile_digest(live_text)
        if report["canonicalDigest"] == report["liveDigest"]:
            report["ok"] = True
            report["statusCategory"] = "matched"
        else:
            _failure(report, "changed", "Canonical and live inline Dockerfiles differ.")
    else:
        report = check_parity(
            canonical_text=canonical_text,
            service_id=args.service_id,
            endpoint=args.graphql_endpoint,
            token=args.token,
        )

    _write_report(args.report, report)
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
