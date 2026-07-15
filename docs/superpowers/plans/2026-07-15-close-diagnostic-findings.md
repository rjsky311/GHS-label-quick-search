# Close Diagnostic Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Each task ends with a focused proof before the next task begins.

**Goal:** Close every OPEN or PARTIAL item from the 2026-07-11 project diagnostic, with regression tests, release evidence, and a final production re-audit.

**Architecture:** Work from the current `main` baseline in one isolated branch. First close the release-trust chain and safety gates, then bound backend data access and runtime dependencies, then remove confirmed dead frontend surface area and extract the print-plan derivation seam. Docker parity and observability use repository-owned, provider-neutral checks: the live Zeabur inline recipe is compared against the canonical repository recipe, and browser/server events are emitted as bounded structured logs captured by the platform rather than written only to process-local/browser-local storage.

**Tech Stack:** FastAPI/Python 3.13-compatible runtime, SQLite, React 19, Vite, Jest, Node test runner, GitHub Actions, Zeabur CLI 0.20.0, GitHub branch protection API.

## Global Constraints

- Keep version `1.10.0`; do not version-bump.
- Preserve the three-output print contract: complete A4/Letter, QR small, identification small.
- Preserve full H/P text on complete labels and identity+pictograms-only content on small labels.
- Do not silently omit GHS pictograms or convert upstream failures into no-data.
- Do not reintroduce yarn, CRA, CRACO, or `REACT_APP_*`.
- Production Docker installs runtime requirements only; pytest belongs in development requirements.
- Do not add third-party observability services, credentials, or paid infrastructure; use structured platform-captured logs with bounded payloads.
- The existing untracked mockups and QA evidence in the primary checkout are out of scope and must remain untouched.
- Physical paper/printer/QR-scanner validation remains deferred; software canary and generated artifact checks are required.

---

### Task 1: Close release trust and active PDF readiness

**Files:**
- Modify: `frontend/scripts/production-qa-trust.mjs`
- Modify: `frontend/scripts/check-production-health.mjs`
- Modify: `frontend/scripts/check-zeabur-deployment-freshness.mjs`
- Modify: `frontend/scripts/run-production-print-qa.mjs`
- Modify: `.github/workflows/production-print-qa.yml`
- Modify: `backend/server.py`
- Modify: `backend/pdf_render.py`
- Test: `frontend/scripts/__tests__/production-qa-trust.test.mjs`
- Test: `frontend/scripts/__tests__/production-summary-gates.test.mjs`
- Test: `backend/test_pdf_render.py`

**Interfaces:** `gitShasMatch(actual, expected)` accepts only two full 40-character hexadecimal SHAs and returns exact equality. `GET /api/health/pdf-canary` renders one fixed, data-only A4 page and returns `{ok, bytes, pdfHeader}` or a non-200 readiness error. The production QA runner invokes this canary after ordinary health and before product print checks. A missing `ZEABUR_TOKEN` is a failed freshness report, never an `ok: true` skip.

- [ ] Write failing tests for short SHA, reverse-prefix SHA, unavailable PDF canary, and missing Zeabur token.
- [ ] Run the focused Node/Python tests and confirm each fails for the expected reason.
- [ ] Implement exact SHA matching, the bounded PDF canary route using the existing renderer, and fail-closed token handling.
- [ ] Add `qa:production-pdf-canary` and include its report as a required product block.
- [ ] Run focused tests and the local production-health/canary scripts against the current deployment.
- [ ] Configure GitHub `main` branch protection with required Frontend and Backend checks, one approving review, no force pushes, and no direct deletion. Store `ZEABUR_TOKEN` as a repository secret only after confirming it is the existing Zeabur CI token; never print its value.
- [ ] Commit as `fix: close release trust and pdf readiness gaps`.

Proof: focused tests pass; production health, service identity, exact SHA, active PDF canary, and the full Production Print QA summary all report zero failures.

### Task 2: Bound pilot SQL reads and authenticated response caching

**Files:**
- Modify: `backend/pilot_store.py`
- Modify: `backend/pilot_admin_routes.py`
- Test: `backend/test_pilot_storage.py`
- Test: `backend/test_pilot_admin_routes.py`

**Interfaces:** `list_correction_requests(..., exclude_converted_manual_entries=True)` adds a SQL predicate that excludes `candidate_json` values marking `converted_to_manual_entry` without materializing unbounded rows. `list_converted_correction_candidates(limit)` uses SQL-side bounded ordering and a bounded candidate projection. `get_dictionary_summary(limit)` passes `limit` into every pending alias/manual/correction query. Every admin and workspace response, including successful writes, sets `Cache-Control: private, no-store`.

- [ ] Add a query-trace test with more matching rows than the requested limit and assert the SQL contains a limit/predicate before row materialization.
- [ ] Add route tests asserting `Cache-Control: private, no-store` on `/ops/report`, dictionary reads/writes, correction routes, and workspace GET/PUT.
- [ ] Run the focused backend tests and confirm they fail before implementation.
- [ ] Push conversion filtering into SQLite using `json_extract(candidate_json, '$.converted_to_manual_entry') IS NOT 1`, retain a bounded `LIMIT`, and eliminate Python break-after-fetch loops.
- [ ] Pass bounded limits to alias/manual summary calls and preserve response ordering/content.
- [ ] Add a small response helper in `pilot_admin_routes.py` so every route applies the same no-store header without changing payload schemas.
- [ ] Run the focused backend tests and `python -m py_compile`.
- [ ] Commit as `fix: bound pilot reads and disable admin caching`.

Proof: query-level boundedness tests pass, payload compatibility tests remain green, and all authenticated admin/workspace responses carry the no-store policy.

### Task 3: Split runtime and development Python dependencies

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/requirements-dev.txt`
- Modify: `Dockerfile.ghs-backend`
- Modify: `backend/Dockerfile`
- Test: `backend/test_dependency_manifests.py`
- Create: `backend/scripts/check_runtime_dependencies.py`

**Interfaces:** `requirements.txt` contains only runtime packages; `requirements-dev.txt` includes `-r requirements.txt` plus pytest/pytest-asyncio/black/flake8/isort/mypy. `check_runtime_dependencies.py` fails if a test-only package appears in the runtime manifest or if the two Docker recipes install a dev manifest.

- [ ] Add failing manifest tests for pytest exclusion and dev-only inclusion.
- [ ] Move `pytest==9.0.3` and `pytest-asyncio==1.3.0` out of runtime requirements.
- [ ] Keep Docker installs pointed at `requirements.txt`; keep local test setup pointed at `requirements-dev.txt`.
- [ ] Run the manifest test, create a clean temporary virtualenv, install runtime requirements, and assert `python -c 'import pytest'` fails there while the dev environment imports pytest.
- [ ] Commit as `build: separate backend runtime and dev dependencies`.

Proof: a production-like install has no pytest modules, while the dev install runs the full backend suite.

### Task 4: Add canonical/live Docker recipe parity

**Files:**
- Create: `backend/scripts/check_inline_dockerfile_parity.py`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/production-print-qa.yml`
- Modify: `Dockerfile.ghs-backend`
- Modify: `docs/superpowers/plans/2026-07-07-mobile-pdf-export-server-render.md`
- Test: `backend/test_inline_dockerfile_parity.py`

**Interfaces:** `check_inline_dockerfile_parity.py --canonical Dockerfile.ghs-backend --service-id ... --graphql-endpoint ...` reads the canonical file, queries the Zeabur service spec with `ZEABUR_TOKEN`, normalizes line endings only, compares SHA-256 digests, and exits non-zero on missing/changed live inline content. `--offline-canonical` remains available for local deterministic tests; the production workflow never uses it.

- [ ] Add unit tests for identical, line-ending-only, changed, and unavailable live spec responses using an injected HTTP client.
- [ ] Implement the GraphQL query/mutation response parser with redacted error output and no mutation capability in the checker.
- [ ] Add the parity step after dependency installation and before production product QA; require its report for `main` release checks.
- [ ] Record the canonical digest and the currently observed live digest in the release evidence document.
- [ ] Run offline tests and one authenticated read-only live parity check.
- [ ] Commit as `ci: enforce inline backend docker parity`.

Authenticated read-only parity checkpoint (2026-07-15, before this branch's
deployment): canonical and live SHA-256 digests both equal
`352dec4d101f4770ae23e1c67399ef246c81f80642685a70c3602516c92e6da4` for
service `6962687391818d5fd9705a67`.

Proof: CI fails closed when the live spec is unavailable or differs, and the current live inline recipe matches the committed canonical digest.

### Task 5: Replace browser/process-local-only observability with structured platform events

**Files:**
- Create: `backend/observability.py`
- Modify: `backend/server.py`
- Modify: `backend/pilot_admin_routes.py`
- Modify: `frontend/src/utils/observability.js`
- Create: `frontend/src/utils/__tests__/observability.test.js`
- Test: `backend/test_observability.py`
- Modify: `AGENTS.md`

**Interfaces:** `backend.observability.emit_event(name, status, meta)` emits one bounded JSON record to the application logger with request/correlation ID and redacted metadata. `POST /api/telemetry` accepts only an allowlisted event name, status, count, and bounded scalar metadata; it is rate-limited and never stores raw chemical names or payloads. Frontend `recordObservabilityEvent` sends the sanitized event to the endpoint and does not persist event history in `localStorage`. `/ops/report` remains a bounded diagnostic snapshot but is no longer the sole event sink.

- [ ] Add tests proving redaction, event-size bounds, allowlisted names, rate limiting, and no localStorage writes.
- [ ] Run focused tests and confirm they fail before implementation.
- [ ] Implement the logger-backed event sink and public telemetry route with strict Pydantic validation.
- [ ] Replace browser-local persistence with fire-and-forget `sendBeacon`/fetch using the configured backend origin; failed telemetry must never affect lookup or print behavior.
- [ ] Keep existing counters only as short-lived diagnostics and document Zeabur structured logs as the centralized pilot sink.
- [ ] Run focused frontend/backend tests and inspect a local JSON log record.
- [ ] Commit as `feat: centralize bounded production observability`.

Proof: events are visible as structured backend logs across instances, browser localStorage is no longer used for telemetry, payloads are bounded/redacted, and core user flows remain independent of telemetry availability.

### Task 6: Remove confirmed dead frontend scaffolds and direct dependencies

**Files:**
- Delete: the 45 unreferenced files under `frontend/src/components/ui/` identified by the import-graph test; keep `button.jsx` and any newly discovered live imports.
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/scripts/__tests__/unused-ui-surface.test.mjs`

**Interfaces:** The import-graph test resolves `@/components/ui/<name>` aliases from all non-scaffold source/scripts and fails if a deleted scaffold is referenced. `package.json` no longer declares the five zero-use direct dependencies: `@hookform/resolvers`, `date-fns`, `react-router-dom`, `recharts`, and `zod`.

- [ ] Add the import-graph test and verify it identifies exactly the currently unreferenced files/dependencies.
- [ ] Run the test in red by asserting the cleanup manifest is empty before deletion.
- [ ] Delete only confirmed-dead files and dependencies; do not remove transitive packages required by live Radix components.
- [ ] Run the import-graph test, Jest, build, and bundle budget.
- [ ] Commit as `chore: remove unused frontend scaffolding`.

Proof: the graph test passes with no unreferenced scaffold/dependency entries and the production bundle remains within budget.

### Task 7: Extract print-plan derivation and reduce modal duplication

**Files:**
- Create: `frontend/src/hooks/useLabelPrintOutputPlan.js`
- Modify: `frontend/src/components/LabelPrintModal.jsx`
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/hooks/__tests__/useLabelPrintOutputPlan.test.js`
- Test: `frontend/src/__tests__/App.sidebars.test.js`

**Interfaces:** `useLabelPrintOutputPlan({selectedForLabel, layout, customGHSSettings, customLabelFields, labProfile, locale, batchIncludeReducedPurpose})` returns the normalized `outputPlan`, named booleans for each plan state, output decision text, and batch plan. `LabelPrintModal` consumes this hook instead of repeating direct `outputPlan.state` comparisons. App print/prepared callback wiring moves into a focused hook without changing callback signatures.

- [ ] Add hook tests for ready, missing profile, upstream error, continuation, invalid stock, and small-label limit states.
- [ ] Run the hook tests in red before extracting code.
- [ ] Move pure derived calculations into the hook; keep user-facing copy and product contract unchanged.
- [ ] Replace direct state comparisons with named hook outputs and extract the print workflow callbacks from `App.jsx`.
- [ ] Add a source-shape test that fails if `LabelPrintModal.jsx` introduces new direct `outputPlan.state` comparisons.
- [ ] Run focused Jest, full Jest, build, and production print-contract tests.
- [ ] Commit as `refactor: isolate print output planning`.

Proof: output-plan state behavior is unchanged, direct duplication is removed, modal/App ownership is smaller and focused, and all print contract tests remain green.

### Task 8: Final integration, deployment, and diagnostic closure

**Files:**
- Modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`
- Modify: `NEXT_PRODUCT_WORK.md`
- Create: `docs/evidence/2026-07-15-diagnostic-closure.md`

- [ ] Run backend full tests, frontend full tests, lint, build, i18n/docs drift, coverage, print contract, dependency manifest, Docker parity, and bundle gates.
- [ ] Push the branch and open a PR; require branch-protection checks and review.
- [ ] Merge only after CI passes; verify Zeabur frontend/backend deployments report the exact merge SHA.
- [ ] Run production health, active PDF canary, production search UI, prepared, batch, and full product QA.
- [ ] Perform a fresh line-by-line audit of all 18 previous findings and record FIXED evidence for every item.
- [ ] Commit the evidence/doc update separately if the project workflow requires it.

Stop condition: all 18 diagnostic items are marked FIXED with a focused regression or external proof, production QA has zero failures/warnings/incomplete blocks, and no untracked user files were changed.
