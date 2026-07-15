# Diagnostic Closure Evidence — 2026-07-15

This record tracks the 18 OPEN/PARTIAL items from the 2026-07-11 project
diagnostic. The implementation was merged and the production gates were run
against the exact merge SHA before this record was closed.

## Promotion checkpoint

- PR: [#44](https://github.com/rjsky311/GHS-label-quick-search/pull/44)
- Branch: `codex/close-diagnostic-findings`
- Implementation commits: `b322868`, `0d14fc6`
- Merge commit: `c7737436e1121fd83cdc01556ce3de9d8d97e25c` (2026-07-15).
- Production Print QA run: `29417342863` (success, 10m46s).
- Main CI run: `29417232746` (Frontend and Backend success).
- Zeabur deployment: frontend service `6a5783bb3c393b66819cb66b`, status
  `RUNNING`, exact commit SHA `c7737436e1121fd83cdc01556ce3de9d8d97e25c`.
- Production health and PDF canary both reported the exact merge SHA; the
  canary returned `7974` bytes with a valid `%PDF-` header.
- GitHub `main` protection is configured with required `Frontend` and
  `Backend` checks, one approving review, conversation resolution, and no
  force-push/deletion.
- Repository secret `ZEABUR_TOKEN` is present without exposing its value.

## Finding-by-finding audit

| # | Previous finding | Current evidence | Status |
|---:|---|---|---|
| 1 | PubChem malformed data could be treated as usable hazard data | Backend parser/search regression coverage and the `upstream_error` data-quality path preserve retry state instead of fabricating empty hazard data. | FIXED in baseline; rechecked by full backend suite |
| 2 | Upstream status semantics were ambiguous | `ChemicalResult.upstream_error`, export review reasons, UI banners, and print planner all distinguish retry/unresolved from confirmed not-found; `backend/test_search_single_endpoint.py` and frontend data-quality tests cover the split. | FIXED in baseline; rechecked by full suites |
| 3 | `main` had no branch protection | GitHub API reports required `Frontend`/`Backend`, one approval, conversation resolution, `allow_force_pushes=false`, and `allow_deletions=false`; the original protection was restored immediately after the authorized merge. | FIXED |
| 4 | GHS cache had unbounded byte growth | `ghs_cache` remains byte-bounded and the ops report exposes `currentBytes`/`maxBytes`; `backend/test_observability.py` and cache tests cover stale/size behavior. | FIXED in baseline; rechecked by full backend suite |
| 5 | Production QA used an unpinned `npx` fallback | QA trust tests assert the pinned Zeabur CLI path and no network `npx` fallback. | FIXED in baseline; `test:qa-scripts` green |
| 6 | Expected-SHA comparison accepted prefixes | `frontend/scripts/production-qa-trust.mjs` now accepts only two full 40-character hexadecimal SHAs with exact equality; short/reverse-prefix cases are regression-tested. | FIXED in PR #44; local and CI green |
| 7 | PDF readiness was only a passive capability flag | `GET /api/health/pdf-canary` renders a bounded data-only A4 PDF, validates `%PDF-`, and Production Print QA run `29417342863` passed it at the merge SHA. | FIXED |
| 8 | Sidebar state could remain stale | Existing sidebar regression coverage and the current App state invalidation paths remain green in the full frontend suite. | FIXED in baseline; rechecked by full frontend suite |
| 9 | Stale async search state could overwrite newer results | Search request IDs/abort handling are covered by `App.searchRace.test.js`; the full frontend suite passes. | FIXED in baseline; rechecked by full frontend suite |
| 10 | Pilot SQL reads over-fetched before filtering/limiting | SQLite JSON predicates and `LIMIT` now perform conversion filtering and bounded projection in SQL; trace/behavior tests cover this in `backend/test_pilot_storage.py`. | FIXED in PR #44; local and CI green |
| 11 | PDF semantic safety could be bypassed at terminal handoff | Shared semantic/preflight gates and print/PDF contract tests block incomplete hazard data and unsafe handoffs. | FIXED in baseline; print contract suite green |
| 12 | Admin/workspace responses were cacheable | The pilot admin router applies `Cache-Control: private, no-store`; route tests cover report, dictionary, correction, and workspace responses. | FIXED in PR #44; local and CI green |
| 13 | Service identity/backend origin checks were partial | Production QA pins the frontend service ID/name and credential-free backend origin, uses exact SHA trust, and the merge-SHA workflow passed the live service identity/freshness probe. | FIXED |
| 14 | Pytest was installed in the runtime image | `requirements.txt` is runtime-only; `requirements-dev.txt` owns pytest tooling; `check_runtime_dependencies.py` and CI enforce the boundary. | FIXED in PR #44; local and CI green |
| 15 | `App`/`LabelPrintModal` duplicated print derivation | `useLabelPrintOutputPlan` owns output/batch derivation and the modal no longer compares `outputPlan.state` directly; source-shape and print contract tests pass. | FIXED in PR #44; local and CI green |
| 16 | Dead UI scaffolds/direct dependencies remained | Import-graph boundary test passes after removing only unreferenced UI modules and direct packages; `npm ci`, lint, build, and Jest pass. | FIXED in PR #44; local and CI green |
| 17 | Zeabur inline Dockerfile could drift from the repo recipe | Production Print QA parity report for service `6962687391818d5fd9705a67` matched canonical/live SHA-256 digest `352dec4d101f4770ae23e1c67399ef246c81f80642685a70c3602516c92e6da4`. | FIXED |
| 18 | Observability existed only in browser/process-local state | Bounded/redacted structured backend events, allowlisted `/api/telemetry`, frontend memory-only event history, and no-localStorage tests passed; a live production telemetry probe returned `200 {"ok":true}` with an event ID. | FIXED |

## Local/CI proof

- Backend: 381 tests passed; one existing Starlette/httpx deprecation warning.
- Frontend: 91 Jest suites / 1324 tests passed.
- Frontend lint, Vite build, i18n parity, docs drift, QA scripts, H/P wording
  coverage, print contract, bundle budget, and GitHub resource checks passed.
- Runtime dependency check passed.
- Authenticated read-only Zeabur inline Dockerfile parity passed.
- Production Print QA summary reported `ok: true`, 9/9 product blocks passed,
  zero failed reports, zero warnings, and zero incomplete blocks.
- Production search UI, prepared, batch, print handoff, and generated physical
  print validation plan all passed in the same run.

## Final promotion proof

The required final proof has been completed against the merge SHA:

1. Zeabur deployment freshness for the live frontend/backend origins.
2. `qa:production-health` and `qa:production-pdf-canary`.
3. Production search UI, prepared, batch, print handoff, and full product QA.
4. Inline Dockerfile parity and H/P coverage from the production workflow.
5. Final re-audit of all 18 findings with no remaining OPEN/PARTIAL status.

Physical stock/printer/QR-scanner validation remains deferred by the product
rules; this closure proves software and deployment readiness only.
