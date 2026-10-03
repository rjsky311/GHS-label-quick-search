#!/usr/bin/env bash
# Print the commit that production should be serving for a production QA run.
#
# Usage: resolve-production-expected-sha.sh <source-sha> [deployed-sha]
#
# Production only redeploys for runtime changes, so main can move ahead of the
# deployed build through documentation, workflow, or test-only commits. When
# the deployed commit is an ancestor of the source commit and every change in
# between is non-runtime (per classify-production-qa-change.sh), the deployed
# commit is still fresh and is printed. A frontend/package.json change counts as
# non-runtime only when nothing but test:* or qa:* scripts changed. In every
# other case the source commit is printed, so a genuinely stale deployment keeps
# failing the freshness gate.
set -euo pipefail

source_sha="${1:?source sha required}"
deployed_sha="${2:-}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$deployed_sha" || "$deployed_sha" == "$source_sha" ]]; then
  echo "$source_sha"
  exit 0
fi

if ! git cat-file -e "${deployed_sha}^{commit}" 2>/dev/null ||
  ! git merge-base --is-ancestor "$deployed_sha" "$source_sha" 2>/dev/null; then
  echo "$source_sha"
  exit 0
fi

package_json_runtime_unchanged() {
  local before after
  before="$(git show "${deployed_sha}:frontend/package.json" 2>/dev/null)" || return 1
  after="$(git show "${source_sha}:frontend/package.json" 2>/dev/null)" || return 1
  command -v python3 >/dev/null 2>&1 || return 1
  python3 - "$before" "$after" <<'PY'
import json
import re
import sys


def runtime_view(text):
    data = json.loads(text)
    scripts = data.get("scripts") or {}
    data["scripts"] = {
        name: command
        for name, command in scripts.items()
        if not re.match(r"^(test|qa)(:|$)", name)
    }
    return data


sys.exit(0 if runtime_view(sys.argv[1]) == runtime_view(sys.argv[2]) else 1)
PY
}

changed_files=()
while IFS= read -r changed_file; do
  [[ -z "$changed_file" ]] && continue
  if [[ "$changed_file" == "frontend/package.json" ]] && package_json_runtime_unchanged; then
    continue
  fi
  changed_files+=("$changed_file")
done < <(git diff --name-only "$deployed_sha" "$source_sha")

if (( ${#changed_files[@]} == 0 )); then
  echo "$deployed_sha"
  exit 0
fi

if [[ "$(bash "$script_dir/classify-production-qa-change.sh" "${changed_files[@]}")" == "skip" ]]; then
  echo "$deployed_sha"
else
  echo "$source_sha"
fi
