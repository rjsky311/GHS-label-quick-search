#!/usr/bin/env bash
set -euo pipefail

if (( $# == 0 )); then
  echo "run"
  exit 0
fi

for changed_path in "$@"; do
  if [[ "$changed_path" == *.md && "$changed_path" != */* ]]; then
    continue
  fi
  case "$changed_path" in
    docs/* | \
      .github/* | \
      backend/test_*.py | \
      frontend/scripts/__tests__/* | \
      frontend/scripts/check-docs-drift.mjs | \
      frontend/scripts/check-github-resource-usage.mjs | \
      frontend/scripts/generate-physical-print-plan.mjs | \
      frontend/src/*/__tests__/* | \
      frontend/src/*.test.js)
      ;;
    *)
      echo "run"
      exit 0
      ;;
  esac
done

echo "skip"
