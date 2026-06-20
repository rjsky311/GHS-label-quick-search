# Repository Hygiene Audit - 2026-06-20

Scope: read-only subagent audit plus local low-risk cleanup for repository
footprint, QA evidence handling, and GitHub resource pressure.

## Current Size Snapshot

- GitHub API `diskUsage`: 11,698 KiB.
- Local git objects: 40.98 MiB in packs, 200 KiB loose.
- Tracked working-tree payload: about 15 MiB.
- No tracked `node_modules`, build output, virtualenv, databases, or coverage
  artifacts were found.
- Large local working-tree size is mostly ignored/generated:
  `frontend/node_modules`, `backend/.venv`, `frontend/build`, and QA evidence
  images/PDFs.

## GitHub Resource Snapshot

- Actions artifacts: 66 artifacts, 140,432,431 bytes total.
- Expired artifacts still listed by API: 63,305,012 bytes.
- Active artifacts: 77,127,419 bytes.
- Actions caches: 7 caches, 281,602,146 bytes total.
- `production-print-qa.yml` currently uploads QA artifacts with
  `retention-days: 14`.

Conclusion: repository git size is healthy. The only notable GitHub resource
pressure is Actions artifacts/cache accumulation, not committed source history.

## Visibility Decision

GitHub API reported:

```json
{"visibility":"PUBLIC","isPrivate":false}
```

Owner decision: keep the repository public. Public visibility supports the
website's GitHub Issues feedback links for outside users.

## Local Cleanup Applied

- Added shared `.gitignore` rules for regenerated QA evidence folders:
  `rendered/`, `a4-html-*`, `a4-pdf-*`, and `a4-png-*`.
- Added local-only `.git/info/exclude` entries for untracked one-off A4 review
  evidence directories from 2026-06-18 through 2026-06-20.
- Added `npm run qa:github-resource` for repeatable GitHub resource patrol.
  The script writes `frontend/build/github-resource-report.json`, fails on
  configurable repository/artifact/cache size limits, and can enforce
  visibility. Public visibility is the default expected state.
- Added the patrol to the Mac mini setup repo's report-only
  `scripts/tool-layer-healthcheck.zsh`, plus its healthcheck/watchlist docs.
- Did not delete local evidence directories.
- Did not delete GitHub artifacts or caches.
- Did not rewrite history or introduce Git LFS.

## Public Repository Safety Pass

Owner decision: keep the repository public so GitHub Issues feedback links work
for outside users.

Actions applied to the current tree:

- Replaced `qa/fixtures/organic-inventory-2026-06-14.csv` with a synthetic
  inventory-shaped fixture.
- Regenerated
  `qa/evidence/2026-06-15-inventory-print-sampling/inventory-print-sampling-report.*`
  from the synthetic fixture.
- Removed the two historical batch PDF artifacts from
  `qa/evidence/2026-06-14-print-layout/` because they contained
  inventory-derived label text.
- Updated fixture and evidence README files to describe the sanitized boundary.

Fresh checks:

- GitHub secret scanning alerts: none returned by API.
- Secret-pattern scan of current tracked text files: no matches after the
  safety pass.
- Local-only `.env` and `backend/data/pilot.db` remain ignored and untracked.
- GitHub API reported Dependabot alerts are disabled for this public
  repository. This is not a resource-footprint blocker, but it should be
  enabled from repository settings for ongoing public-repo dependency hygiene.

Remaining boundary:

- The removed inventory-derived fixture and PDFs still exist in git history at
  commit `a080588`. They did not contain secrets, but they did contain
  inventory-shaped operational data. Do not rewrite history casually; open a
  coordinated history-purge slice only if the owner decides that historical
  inventory exposure is unacceptable for a public repository.

Canonical evidence retained in git:

- `qa/evidence/2026-06-20-a4-continuation-product-polish/`
- `qa/evidence/production-visual-acceptance-2026-06-18/`
- `qa/evidence/2026-06-14-print-layout/` README only; historical PDFs removed.
- `qa/evidence/2026-06-15-inventory-print-sampling/`

## Recommended Next Actions

1. Add `npm run qa:github-resource` to the user's recurring tool patrol at the
   GitHub/resource level. It now expects public visibility by default.
2. Leave artifact deletion alone unless GitHub storage becomes a real problem;
   the current 14-day retention is already bounded.
3. If storage pressure grows, delete expired Actions artifacts first, then
   old branch/PR caches. Do not touch git history.
4. Treat future ad-hoc visual review folders as local-only unless they are the
   canonical evidence packet for a shipped slice.
5. Enable Dependabot alerts/security updates from GitHub repository settings so
   public-repo dependency drift is surfaced automatically.
