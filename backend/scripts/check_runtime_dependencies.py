#!/usr/bin/env python3
"""Check that production dependency manifests do not pull development tooling."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


TEST_ONLY_PACKAGES = {
    "pytest",
    "pytest-asyncio",
    "black",
    "flake8",
    "isort",
    "mypy",
}
PACKAGE_LINE = re.compile(r"^([A-Za-z0-9_.-]+)")


def _package_names(path: Path) -> set[str]:
    names: set[str] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        match = PACKAGE_LINE.match(line)
        if match:
            names.add(match.group(1).lower().replace("_", "-"))
    return names


def check(repo_root: Path) -> dict[str, object]:
    backend_root = repo_root / "backend"
    runtime_path = backend_root / "requirements.txt"
    dev_path = backend_root / "requirements-dev.txt"
    runtime_packages = _package_names(runtime_path)
    dev_packages = _package_names(dev_path)
    runtime_test_only = sorted(runtime_packages & TEST_ONLY_PACKAGES)
    dockerfiles = [repo_root / "Dockerfile.ghs-backend", backend_root / "Dockerfile"]
    docker_dev_installs = [
        str(path.relative_to(repo_root))
        for path in dockerfiles
        if "requirements-dev.txt" in path.read_text(encoding="utf-8")
    ]
    missing_dev_test_packages = sorted(
        {"pytest", "pytest-asyncio"} - dev_packages
    )
    return {
        "ok": not runtime_test_only
        and not docker_dev_installs
        and not missing_dev_test_packages,
        "runtimeTestOnlyPackages": runtime_test_only,
        "dockerDevInstalls": docker_dev_installs,
        "missingDevTestPackages": missing_dev_test_packages,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
    )
    args = parser.parse_args()
    report = check(args.repo_root.resolve())
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
