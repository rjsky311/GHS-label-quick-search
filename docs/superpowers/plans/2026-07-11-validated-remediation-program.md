# Validated Remediation Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the seven validated repository-local correctness, bounded-resource, release-trust, readiness, and frontend lifecycle findings without changing the product contract or deploying externally.

**Architecture:** Preserve the existing FastAPI and React/Vite boundaries. Fail closed at the PubChem adapter before data reaches caches or public search results, bound upstream and cache memory at the adapter/cache layer, centralize release-trust validation in a dependency-free Node module, expose PDF capability as readiness while preserving liveness, and make frontend overlays, privileged state, and print handoff use explicit single-owner state machines.

**Tech Stack:** Python 3.11, FastAPI, httpx, cachetools, pytest; React 19, Vite, Jest/Testing Library, Node ESM; Zeabur CLI 0.20.0 as an exact development dependency.

## Global Constraints

- Keep version `v1.10.0`; do not version-bump.
- Do not deploy, call production QA, execute the Zeabur CLI, or mutate GitHub/Zeabur settings.
- Do not touch the user's untracked design mockups or QA evidence in the original checkout.
- Work only in `/Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation` on `codex/remediate-validated-findings`.
- Use TDD for every behavior change: add a narrowly focused failing test, record the expected failure, implement the minimum production change, then rerun focused and relevant regression tests.
- Preserve the public three-output print model: Complete A4/Letter, QR small label, and Identification small label. Do not add H/P statements to small labels.
- PubChem transient, malformed, or oversized responses must never become a successful “no hazard” result, a partial hazard result, or a cached value.
- Printed hazard labels must never silently omit available pictograms.
- Preserve safe URL checks, CSV/XLSX formula neutralization, PDF renderer isolation, and existing focus-trap behavior.
- Do not introduce runtime dependencies unless unavoidable. The only planned dependency change is exact dev dependency `zeabur: 0.20.0`, with its lockfile update.
- Each task ends with its focused tests, the task-relevant regression set, one full affected-side suite, a self-review, a commit, and an independent task review. Critical or Important review findings must be fixed and re-reviewed before continuing.
- Do not run production or externally mutating commands during verification.
- Run backend test commands from `backend/`, frontend test commands from `frontend/`, and every `git add`/`git commit` command from the repository root unless a step explicitly uses `cd`.

---

## Task 1: Fail closed on invalid PubChem hazard states

**Files:**

- Modify: `backend/server.py`
- Modify: `backend/test_name_search.py`
- Verify: `backend/test_observability.py`
- Verify: `backend/test_search_single_endpoint.py`

- [ ] **Step 1: Add RED tests for malformed structures and status semantics**

  In `backend/test_name_search.py`, add tests that exercise the real adapter and search orchestration:

  - `test_search_chemical_rejects_parseable_malformed_ghs_without_partial_reports`: construct two valid GHS sections followed by a structurally invalid item; assert `found is False`, `upstream_error is True`, pictograms are empty, and the CID is absent from `ghs_cache`.
  - `test_extract_all_ghs_classifications_never_returns_partial_reports_after_structural_error`: assert the parser raises a typed PubChem payload exception instead of returning the valid prefix.
  - `test_pubchem_get_json_retries_408_then_succeeds`: return HTTP 408 once and a valid response next; assert two calls and the valid result.
  - Replace the broad “non-transient 4xx returns none” expectation with `test_pubchem_get_json_raises_for_unexpected_non_absence_status`, parametrized over `400, 403, 204, 418`; only 404 is a true absence.

- [ ] **Step 2: Run the focused tests and confirm the intended failures**

  From `backend/`:

  ```bash
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_name_search.py -k 'malformed_ghs or structural_error or retries_408 or unexpected_non_absence'
  ```

  Expected RED evidence: the parser returns partial reports, malformed data is cached/exposed, 408 is not retried, and unexpected statuses do not raise.

- [ ] **Step 3: Introduce typed fail-closed adapter errors**

  In `backend/server.py`:

  - Add `PubChemPayloadError(PubChemError)` for structurally unusable JSON payloads.
  - Make `extract_all_ghs_classifications` raise `PubChemPayloadError` on structural traversal failures. Continue accepting valid text-only records, absent optional sections, and unknown non-structural information names.
  - Treat `408`, `429`, and `5xx` as retryable. Treat only `404` as absence. Raise `PubChemError` immediately for all other unexpected HTTP statuses.
  - Parse/validate GHS content before inserting it into `ghs_cache`; malformed content must never be cached.
  - Keep extraction inside the existing search-level `PubChemError` boundary so the API returns the established upstream-error shape rather than a 500 or a no-hazard success.

- [ ] **Step 4: Make the focused tests green**

  ```bash
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_name_search.py -k 'malformed_ghs or structural_error or retries_408 or unexpected_non_absence'
  ```

- [ ] **Step 5: Run task regressions and the full backend suite**

  ```bash
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_name_search.py test_observability.py test_search_single_endpoint.py
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m py_compile server.py api_models.py api_validation.py export_helpers.py
  ```

- [ ] **Step 6: Self-review and commit**

  Verify no structural error path returns a partial prefix and no invalid response is cached. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add backend/server.py backend/test_name_search.py
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: fail closed on invalid PubChem hazard states"
  ```

---

## Task 2: Bound PubChem response and GHS cache memory by bytes

**Files:**

- Modify: `backend/server.py`
- Modify: `backend/pilot_admin_routes.py`
- Modify: `backend/test_name_search.py`
- Modify: `backend/test_observability.py`

Run test commands in this task from `backend/`.

- [ ] **Step 1: Add RED tests for streamed response limits and cache weights**

  Add a tracking `httpx.AsyncByteStream` fixture that emits valid JSON in several chunks and records reads/closure. Add:

  - `test_pubchem_get_json_stops_reading_response_above_byte_limit`: monkeypatch a small response limit; assert `PubChemResponseTooLarge`, fewer than all chunks read, and stream closure.
  - `test_ghs_cache_retention_weights_entries_by_payload_bytes`: assert the cache weight of a large payload is greater than a small payload.
  - `test_ghs_cache_enforces_aggregate_byte_budget`: install a small byte-sized cache through the production configuration seam, insert multiple individually valid entries through the real cache path, and assert eviction occurs, `currsize <= maxsize`, and retained entries remain readable.
  - Extend the ops report test to assert `cache.ghs.entries`, `currentBytes`, and `maxBytes` represent the byte-sized cache, while retaining the compatible `ghsEntries` count if current consumers require it.
  - Add a test showing an entry too large for cache retention is returned uncached and increments `cache.ghs.oversize_skip` rather than causing a 500.
  - In the oversized-response test, configure more than one retry and assert the upstream request count is exactly one.

- [ ] **Step 2: Confirm RED**

  ```bash
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_name_search.py test_observability.py -k 'byte_limit or payload_bytes or aggregate_byte_budget or currentBytes or oversize_skip'
  ```

- [ ] **Step 3: Stream and bound decompressed upstream bytes**

  In `backend/server.py`:

  - Add bounded environment parsing for `PUBCHEM_RESPONSE_MAX_BYTES`, default `8 * 1024 * 1024`, with safe lower/upper clamps.
  - Add `PubChemResponseTooLarge(PubChemError)`.
  - Use `http_client.stream("GET", ...)` and accumulate `response.aiter_bytes()` into a `bytearray`, aborting as soon as decompressed bytes exceed the cap. A valid `Content-Length` may reject early but cannot replace the streamed limit.
  - Decode with `json.loads`; preserve invalid-JSON retry behavior. Oversized responses are terminal and are not retried.
  - Update local scripted response/client test doubles to support the streaming protocol without bypassing production behavior.

- [ ] **Step 4: Make GHS cache capacity byte-aware**

  - Add `GHS_CACHE_MAX_BYTES`, default `64 * 1024 * 1024`, with bounded environment parsing.
  - Define `_ghs_cache_entry_size(value)` using compact UTF-8 JSON bytes plus the retrieval timestamp and a small fixed bookkeeping allowance.
  - Construct `ghs_cache` as `TTLCache(maxsize=GHS_CACHE_MAX_BYTES, ttl=86400, getsizeof=_ghs_cache_entry_size)` while preserving cached value tuples `(data, retrieved_at)`.
  - If an individual entry cannot fit, serve the validated response without caching it, increment `cache.ghs.oversize_skip`, and do not turn a cache policy into an upstream failure.
  - Update `/api/ops/report` to expose a nested `cache.ghs` object with `entries`, `currentBytes`, and `maxBytes`; preserve existing counts where needed for backward compatibility.

- [ ] **Step 5: Make focused and regression tests green**

  ```bash
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_name_search.py test_observability.py -k 'byte_limit or payload_bytes or aggregate_byte_budget or currentBytes or oversize_skip'
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_name_search.py test_observability.py test_search_single_endpoint.py
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m py_compile server.py pilot_admin_routes.py
  ```

- [ ] **Step 6: Self-review and commit**

  Inspect the stream lifecycle, retry categories, entry sizing, and ops schema. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add backend/server.py backend/pilot_admin_routes.py backend/test_name_search.py backend/test_observability.py
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: bound PubChem response and cache bytes"
  ```

---

## Task 3: Lock CI package execution and production trust inputs

**Files:**

- Create: `frontend/scripts/production-qa-trust.mjs`
- Create: `frontend/scripts/__tests__/production-qa-trust.test.mjs`
- Modify: `frontend/scripts/check-production-health.mjs`
- Modify: `frontend/scripts/check-zeabur-deployment-freshness.mjs`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `.github/workflows/production-print-qa.yml`

Run Node/npm commands in this task from `frontend/`; run git commands from the repository root.

- [ ] **Step 1: Add RED trust-policy tests**

  Create dependency-free Node tests covering:

  - exact Git SHA and prefixes of at least 12 hexadecimal characters match;
  - prefixes shorter than 12 characters and non-hex values fail;
  - a wrong Zeabur service ID or service name fails;
  - backend-origin lookalikes, path-bearing URLs, credentials, and non-HTTP(S) schemes fail;
  - `package.json` declares exact dev dependency `"zeabur": "0.20.0"` and deployment QA has no `npx` network fallback;
  - the Production Print QA workflow pins expected frontend service ID/name and backend origin after `npm ci`.

  Add the test file to the existing `test:qa-scripts` command.

- [ ] **Step 2: Confirm RED**

  ```bash
  node --test scripts/__tests__/production-qa-trust.test.mjs
  ```

- [ ] **Step 3: Centralize trust validation**

  In `production-qa-trust.mjs`, export:

  - `MIN_GIT_SHA_PREFIX_LENGTH = 12`;
  - `gitShasMatch(actual, expected)` for exact or minimum-12 hex prefixes only;
  - `httpOriginsMatch(actual, expected)` using parsed `http:`/`https:` origins with no credentials, query, hash, or non-root path;
  - `serviceIdentityMatches(actual, { id, name })` requiring both expected fields.

  Reuse these helpers in both production QA scripts. Missing or mismatched expected identity/origin must be a hard preflight failure, not a warning.

- [ ] **Step 4: Pin and execute the repository-local Zeabur CLI**

  - Add exact dev dependency `"zeabur": "0.20.0"` and update the lockfile with npm.
  - Resolve the installed package/bin locally and invoke it with `process.execPath`; remove all runtime `npx zeabur` paths.
  - Recovery copy may suggest `npm exec --offline -- zeabur`, never an unpinned network resolution.
  - Do not execute the CLI as part of this task.

- [ ] **Step 5: Pin CI environment identity**

  In `.github/workflows/production-print-qa.yml`, set:

  ```yaml
  ZEABUR_FRONTEND_SERVICE_ID: 69626873d9479ab33ad4590e
  ZEABUR_EXPECTED_SERVICE_NAME: ghs-frontend
  ZEABUR_EXPECTED_BACKEND_ORIGIN: https://ghs-backend.zeabur.app
  PRODUCTION_HEALTH_EXPECTED_BACKEND_ORIGIN: https://ghs-backend.zeabur.app
  ```

  Preserve secret handling and do not add credentials to the repository.

- [ ] **Step 6: Verify locally without external calls**

  ```bash
  node --test scripts/__tests__/production-qa-trust.test.mjs
  npm run test:qa-scripts
  npm test -- --runInBand
  npm run lint
  npm run build
  ```

- [ ] **Step 7: Self-review and commit**

  Search for `npx zeabur`, permissive SHA slicing, and warning-only identity paths. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add .github/workflows/production-print-qa.yml frontend/package.json frontend/package-lock.json frontend/scripts
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: lock production QA trust inputs"
  ```

---

## Task 4: Expose PDF capability readiness without breaking liveness

**Files:**

- Modify: `backend/server.py`
- Modify: `backend/test_pdf_render.py`
- Modify: `frontend/scripts/production-qa-trust.mjs`
- Modify: `frontend/scripts/check-production-health.mjs`
- Modify: `frontend/scripts/__tests__/production-qa-trust.test.mjs`

- [ ] **Step 1: Add RED health/readiness tests**

  In `backend/test_pdf_render.py`, replace the old “unavailable does not break health” assertion with two explicit states:

  - unavailable renderer: HTTP 200 and `status == "healthy"` for liveness, plus `readiness == "degraded"` and `capabilities.pdf.available is False`;
  - available renderer: HTTP 200, `readiness == "ready"`, and PDF capability true.

  In the Node trust tests, add `backendHealthIsReady(body)` cases for ready, degraded, and missing legacy readiness fields. Only the explicit ready shape passes production health.

- [ ] **Step 2: Confirm RED**

  ```bash
  (cd backend && /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_pdf_render.py -k 'health')
  (cd frontend && node --test scripts/__tests__/production-qa-trust.test.mjs)
  ```

- [ ] **Step 3: Implement readiness while preserving liveness**

  Return this semantic shape from `/api/health`:

  ```python
  pdf_available = bool(pdf_renderer and getattr(pdf_renderer, "available", False))
  {
      "status": "healthy",
      "readiness": "ready" if pdf_available else "degraded",
      "capabilities": {"pdf": {"available": pdf_available}},
      # preserve existing public fields
  }
  ```

  Do not expose renderer startup exceptions or internal paths. Add `backendHealthIsReady` to the shared Node module and require it in `check-production-health.mjs`.

- [ ] **Step 4: Verify focused and full affected suites**

  ```bash
  (cd backend && /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q test_pdf_render.py -k 'health')
  (cd frontend && node --test scripts/__tests__/production-qa-trust.test.mjs)
  (cd backend && /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q)
  (cd frontend && npm run test:qa-scripts)
  (cd frontend && npm test -- --runInBand)
  (cd frontend && npm run build)
  ```

- [ ] **Step 5: Self-review and commit**

  Confirm health remains liveness-compatible while the release gate rejects degraded PDF capability. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add backend/server.py backend/test_pdf_render.py frontend/scripts
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: expose PDF readiness in health checks"
  ```

---

## Task 5: Make application sidebars mutually exclusive

**Files:**

- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/__tests__/App.sidebars.test.js`
- Verify: existing sidebar, modal, and focus-trap tests under `frontend/src/`

Run test commands in this task from `frontend/`.

- [ ] **Step 1: Add RED integration tests using the real App shell**

  Follow existing App test setup for axios, sonner, i18n, and feature flags. Exercise the existing controls by test ID:

  - `favorites-toggle-btn`, then `history-toggle-btn`, then `prepared-toggle-btn`: after each action, exactly one sidebar dialog with `aria-modal="true"` exists and it is the most recently requested one.
  - With pilot access unlocked, `pilot-dashboard-toggle-btn` replaces any open sidebar and remains the only modal sidebar.
  - With pilot access locked, requesting Pilot closes the current sidebar and shows only `AdminAccessDialog`.

- [ ] **Step 2: Confirm RED**

  ```bash
  npm test -- --runInBand src/__tests__/App.sidebars.test.js
  ```

- [ ] **Step 3: Replace independent booleans with a single active-sidebar owner**

  In `App.jsx`:

  - Define stable sidebar IDs (`favorites`, `history`, `prepared`, `pilot`).
  - Store one `activeSidebar` value and derive existing `showFavorites`, `showHistory`, `showPrepared`, and `showPilotDashboard` booleans for child props.
  - Implement a stable toggle that closes an already-active sidebar or atomically replaces it with another.
  - Replace all direct open/close paths, including home reset, selection/detail/print paths, prepared-label reprint, Pilot close/failure/key-submit, and related callbacks.
  - Before opening locked `AdminAccessDialog`, clear `activeSidebar`.
  - Do not change the sidebar components' focus traps or `aria-modal` attributes.

- [ ] **Step 4: Verify focused and full frontend suites**

  ```bash
  npm test -- --runInBand src/__tests__/App.sidebars.test.js
  npm test -- --runInBand --testPathPattern='Sidebar|Focus|Modal|App.themeMode'
  npm test -- --runInBand
  npm run lint
  npm run build
  ```

- [ ] **Step 5: Self-review and commit**

  Search for remaining independent sidebar setter paths and confirm the header API stays unchanged. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add frontend/src/App.jsx frontend/src/__tests__/App.sidebars.test.js
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: make app sidebars mutually exclusive"
  ```

---

## Task 6: Isolate privileged Pilot state across auth-context changes

**Files:**

- Modify: `frontend/src/hooks/usePilotDashboard.js`
- Create: `frontend/src/hooks/__tests__/usePilotDashboard.test.js`
- Verify: Pilot/persona integration tests under `frontend/src/`

Run test commands in this task from `frontend/`.

- [ ] **Step 1: Add RED hook lifecycle tests**

  Use `renderHook`, `act`, `waitFor`, axios mocks, and controllable deferred promises. Cover:

  - disabling Pilot immediately clears all privileged data;
  - changing the admin key hides previous-key data while the new request is pending;
  - a late response from an older key or superseded refresh is ignored;
  - `401`, `403`, and `503` clear privileged data before exposing the error;
  - a mutation started under one auth context cannot refresh or repopulate data after the context changes.
  - immediately after `rerender` changes the key or disables the hook—before effects or replacement requests settle—the returned privileged fields are already masked to `null`/empty values.

- [ ] **Step 2: Confirm RED**

  ```bash
  npm test -- --runInBand src/hooks/__tests__/usePilotDashboard.test.js
  ```

- [ ] **Step 3: Implement an explicit auth-context generation**

  In `usePilotDashboard.js`:

  - Add `clearPrivilegedState()` covering every privileged response collection/summary.
  - Define the active context as `enabled && Boolean(adminKey)`.
  - Derive a stable auth-context token from the current render's enabled/key state, tag every successful privileged dataset with that token, and mask every returned privileged field unless its tag equals the current render token. Effect-time clearing alone is insufficient because effects run after render.
  - Increment a generation ref on every enabled/key transition, abort active request controllers, clear privileged state synchronously, and refresh only for an active context.
  - Give refresh requests a monotonically increasing request ID. Guard every success/error/finally state write by both generation and request ID.
  - Pass `AbortSignal` through axios configuration where supported; generation checks remain authoritative for mocks and adapters that ignore abort.
  - On `401`, `403`, or `503`, clear privileged state before setting the error.
  - Mutations must refuse inactive contexts, capture their starting generation, and skip both result writes and follow-up refresh when stale.
  - Preserve the hook's public method and field names used by existing components.

- [ ] **Step 4: Verify focused, integration, and full frontend suites**

  ```bash
  npm test -- --runInBand src/hooks/__tests__/usePilotDashboard.test.js
  npm test -- --runInBand --testPathPattern='Pilot|persona|Admin'
  npm test -- --runInBand
  npm run lint
  npm run build
  ```

- [ ] **Step 5: Self-review and commit**

  Check all async setters and mutation refreshes for generation guards. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add frontend/src/hooks/usePilotDashboard.js frontend/src/hooks/__tests__/usePilotDashboard.test.js
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: isolate pilot dashboard auth state"
  ```

---

## Task 7: Enforce semantic print readiness at terminal handoff

**Files:**

- Modify: `frontend/src/utils/printLabels.js`
- Modify: `frontend/src/utils/__tests__/printLabels.test.js`
- Verify: print contract and PDF QA tests/scripts

Run test commands in this task from `frontend/`.

- [ ] **Step 1: Add RED terminal-path tests**

  Exercise both browser print and server PDF paths:

  - a no-GHS item blocks browser print before iframe creation or `window.print`;
  - a Complete-label item missing a required classification/profile blocks PDF before iframe creation or fetch;
  - the same invalid item yields the same normalized blocking reason for browser and PDF;
  - valid per-item layout overrides remain printable/exportable;
  - continuation-ready Complete labels remain allowed.

  Any existing mechanism-only test using a no-GHS fixture must switch to a semantically valid chemical fixture; do not add a test-only bypass.

- [ ] **Step 2: Confirm RED**

  ```bash
  npm test -- --runInBand src/utils/__tests__/printLabels.test.js
  ```

- [ ] **Step 3: Run one shared semantic preflight before terminal output**

  In `printLabels.js`:

  - Before iframe/document creation, fetch, or browser print, build the effective output plan with the same per-item layout overrides used by rendering.
  - Resolve each item's render model through the existing `buildPrintOutputPlan` / `resolveRenderModelForChemical` contract.
  - If blocked, normalize one `blockedInfo` object used by both paths.
  - Browser print calls `onPrintBlocked`, records the established `print_blocked` event, and returns without creating an iframe.
  - PDF returns `{ ok: false, status: "blocked", blockedInfo }` without creating an iframe or issuing a fetch.
  - QA must report the terminal result as blocked, never pending.
  - Do not add this guard to preview-only `buildPrintDocument`; previews must still be able to explain blocking states.

- [ ] **Step 4: Verify focused print contracts and full frontend suite**

  ```bash
  npm test -- --runInBand src/utils/__tests__/printLabels.test.js
  npm run test:print-contract
  npm test -- --runInBand
  npm run lint
  npm run build
  ```

  Do not run production PDF QA or any command that calls deployed services.

- [ ] **Step 5: Self-review and commit**

  Confirm browser and PDF share the same semantic source, per-item overrides are respected, previews remain available, and small-label content is unchanged. Commit:

  ```bash
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation add frontend/src/utils/printLabels.js frontend/src/utils/__tests__/printLabels.test.js
  git -C /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation commit -m "fix: enforce semantic readiness at print handoff"
  ```

---

## Final Integration And Stop Condition

- [ ] Generate a final review package from the plan base through branch HEAD and run a fresh whole-branch review for spec compliance, regressions, security, data-safety, over-engineering, and missing tests.
- [ ] Resolve and re-review every Critical or Important finding.
- [ ] Run final verification from fresh command output:

  ```bash
  cd /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation/backend
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m pytest -q
  /Users/yuchelin/Documents/Projects/GHS-label-quick-search/backend/.venv/bin/python -m py_compile server.py api_models.py api_validation.py export_helpers.py h_code_translations.py h_code_coverage_audit.py

  cd /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation/frontend
  npm test -- --runInBand
  npm run test:i18n
  npm run test:docs
  npm run test:qa-scripts
  npm run test:print-contract
  npm run lint
  npm run build
  npm run qa:bundle-budget

  cd /Users/yuchelin/Documents/Projects/GHS-label-quick-search-remediation
  git diff --check
  git status --short --branch
  ```

- [ ] Do not deploy or push. Use `superpowers:finishing-a-development-branch` to present safe local handoff options.

**Stop condition:** all seven task reviews and the final whole-branch review have no unresolved Critical or Important findings; backend and frontend verification above is green from fresh output; the branch is clean; no external deployment/settings mutation, version bump, or original-checkout asset change occurred.
