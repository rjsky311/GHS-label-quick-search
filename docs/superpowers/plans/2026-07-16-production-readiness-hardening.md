# Production Readiness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for every code change. Work on branch `codex/production-ready-hardening`; do not push directly to `main`. Each task must be implemented in a focused commit and reviewed before the next task.

**Goal:** Repair the validated, in-scope production-readiness gaps found in the
2026-07-15 whole-project/security review, then prove the result with targeted
tests, full frontend/backend suites, production QA, deployment freshness, and a
second review. The result must preserve the existing public print contract and
the review-only boundary for admin/correction data.

**Evidence source:** the completed Codex Security scan and whole-project review
for the pre-`origin/main` revision, plus the current-main residual findings
recorded in the session review. Physical printer/stock/QR evidence remains a
separate deferred gate and must not be represented as software proof.

## Global constraints

- Start from `origin/main` and keep version `v1.10.0`; never change the public
  print model (complete A4/Letter, QR small, identification small).
- Hazard output must fail closed: a full label is READY only when the item has
  usable identity and actual hazard content (pictogram and/or H/P statement),
  and a batch is READY only when every selected item is ready.
- Never silently drop GHS pictograms, H/P text, source provenance, or upstream
  retry/error state. Historical print records must be explicitly identified as
  historical and must not masquerade as current lookup truth.
- Public JSON/PDF/CSV/XLSX request bodies and generated PDF responses must be
  bounded before expensive parsing/rendering, with deterministic 413/422/503
  behavior and tests for both `Content-Length` and chunked/no-length bodies.
- Pending aliases and public correction reports remain review-only. Durable
  rows need transactional count/byte limits, retention/purge behavior, and
  observable rejection/cleanup outcomes; approved public data still requires
  manual review.
- Admin credentials must not be persisted by default. UI authority must have a
  central memory-only lock, idle/absolute expiry, abort/clear behavior, and
  tests proving stale requests cannot repopulate protected data.
- All interpolated print/export values remain escaped and safe; all existing
  rate limits and public read-only boundaries remain intact.
- Do not add unrelated redesign, dependency refresh, or physical-print claims.

## Task 1: Baseline and contract tests

**Files:**
- Create: `.superpowers/sdd/progress.md`
- Modify: `frontend/src/utils/__tests__/printOutputPlanner.test.js`
- Modify: `frontend/src/utils/__tests__/selectedGhsClassification.test.js`
- Modify: `frontend/src/hooks/__tests__/useLabProfile.test.js`
- Modify: `backend/test_agent_label_summary.py`
- Modify: `backend/test_pdf_render.py`
- Modify: `backend/test_pilot_storage.py`

- [ ] Record the clean `origin/main` baseline, target test commands, and
  acceptance evidence in the SDD ledger.
- [ ] Add RED tests for signal-only readiness, per-item batch readiness,
  stable classification identity across reorder, profile bounds, agent-summary
  bilingual statement mapping, authoritative PDF output validation, and
  durable queue limits/retention.
- [ ] Run the targeted tests once and record the expected failures before
  implementation tasks begin.

## Task 2: Agent summary and print semantic integrity

**Files:**
- Modify: `backend/agent_label_summary.py`
- Modify: `frontend/src/utils/printOutputPlanner.js`
- Modify: `frontend/src/utils/selectedGhsClassification.js`
- Modify: `frontend/src/components/label-print/ResponsibleProfileControls.jsx`
- Modify: `frontend/src/hooks/useLabProfile.js`
- Modify: `frontend/src/utils/printLabelStyles.js`
- Modify: `frontend/src/utils/printLayoutInspection.js`
- Modify: `frontend/src/utils/printStorage.js`
- Modify: related tests under `backend/` and `frontend/src/`

- [ ] Map parser `text_en`/`text_zh` into the agent summary's H/P statement
  contract without exposing unapproved fields.
- [ ] Require pictograms or H/P statements for full-label readiness; compute
  batch readiness with per-item verdicts and `every`, preserving upstream
  error/retry states.
- [ ] Persist a stable classification fingerprint (source, normalized
  pictograms, signal word, sorted H/P codes) and use the stored index only as a
  UI hint; never select a different classification after reorder.
- [ ] Bound responsible-profile fields at the input and hook boundary, and
  include profile rows in rendered overflow inspection so clipping blocks the
  handoff instead of silently ellipsizing safety-adjacent content.
- [ ] Report layout statement findings with both `labelIndex` and
  `statementIndex`.
- [ ] Mark recent print snapshots with retrieved-at/source/fingerprint
  provenance and an explicit historical/requery policy; do not present stale
  snapshots as current lookup results.

## Task 3: Public resource admission and PDF postconditions

**Files:**
- Create or modify: `backend/resource_limits.py`
- Modify: `backend/server.py`
- Modify: `backend/pdf_render.py`
- Modify: `backend/api_models.py`
- Modify: `backend/test_pdf_render.py`
- Create or modify: `backend/test_request_body_limits.py`
- Modify: `backend/test_server.py` or the route-specific backend tests

- [ ] Add an ASGI admission guard that enforces bounded raw bytes before JSON
  decoding for every public JSON POST route, including content-length and
  chunked/no-length requests, returning deterministic `413` responses.
- [ ] Keep route-specific Pydantic bounds and rate limits; do not log or store
  submitted HTML/profile data.
- [ ] Validate generated PDFs after rendering: byte ceiling, page count,
  MediaBox/geometry against the requested bounded page contract, and expected
  page count. Discard mismatches and return a stable service error with a
  metric/log-safe reason.
- [ ] Preserve renderer timeout/concurrency/unavailable behavior and add tests
  for malformed/adversarial PDF output and multi-page/geometry mismatch.

## Task 4: Durable review-ingestion lifecycle

**Files:**
- Modify: `backend/pilot_store.py`
- Modify: `backend/pilot_admin_routes.py`
- Modify: `backend/server.py`
- Modify: `backend/test_pilot_storage.py`
- Modify: `backend/test_dictionary_growth.py`
- Modify: relevant API validation/observability tests

- [ ] Define explicit per-CAS/global row, byte, and age limits for pending
  aliases and public correction reports.
- [ ] Enforce limits transactionally at the persistence boundary; duplicate
  reports remain deduplicated but still cannot bypass aggregate quotas.
- [ ] Add retention/purge APIs or startup/maintenance hooks with deterministic
  counts and safe metrics, preserving auditability for reviewed/approved rows.
- [ ] Return bounded, stable client errors when intake is throttled/full and
  prove that pending data can never enter public lookup without manual review.

## Task 5: Admin authority lifecycle

**Files:**
- Modify: `frontend/src/constants/admin.js`
- Create or modify: `frontend/src/hooks/useAdminAuthority.js`
- Modify: `frontend/src/hooks/usePilotDashboard.js`
- Modify: affected pilot/admin components and tests

- [ ] Replace direct full-key `sessionStorage` persistence with memory-only
  authority by default and a single authority owner/context.
- [ ] Implement explicit lock/logout, idle timeout, absolute lifetime, request
  abort/epoch invalidation, and immediate protected-state clearing.
- [ ] Keep reload/multi-identity behavior intentionally disabled unless a
  server-session requirement is evidenced; document the boundary in tests/docs.

## Task 6: Secondary production gates and documentation alignment

**Files:**
- Modify: `backend/server.py` or response middleware for security headers and
  invalid-status validation where evidence shows a real gap.
- Modify: `frontend/scripts/` production QA checks for CJK/font and accessibility
  smoke gates where supported.
- Modify: `.github/`, `SECURITY.md`, `CODEOWNERS`, and docs only where the
  repository currently lacks a concrete governance control.
- Modify: canonical status/queue docs only when behavior or acceptance criteria
  changed in Tasks 2–5.

- [ ] Add only evidence-backed, low-risk secondary controls (for example HSTS
  at the correct deployment boundary, 422 for invalid admin status, CJK/font
  and basic axe smoke evidence, private vulnerability-reporting guidance and
  action pinning where repository policy permits).
- [ ] Do not claim physical-print readiness; retain the deferred 12-case
  hardware/stock/QR gate.

## Task 7: Integration, deployment, and second review

**Files:**
- Modify: docs/QA evidence only as required by actual results.

- [ ] Run backend compile/tests/coverage audits and all frontend test/build/
  print/production QA commands listed in `AGENTS.md`.
- [ ] Run `qa:zeabur-deployment` first if production is stale, then production
  health/search/UI/batch/product gates with the expected commit SHA.
- [ ] Deploy through the repository's existing Zeabur `main` workflow only after
  local proof; verify frontend/backend health and exact SHA in production.
- [ ] Run a second whole-branch review over the full diff, resolve all
  Critical/Important findings, and update the ledger with the final evidence.
- [ ] Stop with an explicit residual-risk list if any hardware or external
  governance gate cannot be proved from this environment.

## Acceptance criteria

- All validated software findings addressed or explicitly documented with a
  reproducible blocker and owner.
- Full and targeted tests pass on the fresh branch; build and production QA
  pass with exact SHA evidence.
- Public print/export/lookup behavior preserves the stated safety and review
  boundaries, and malformed/oversized/adversarial inputs fail closed.
- A second review finds no unresolved Critical or Important issue.
- Final report distinguishes software production readiness from deferred
  physical-printer validation and provides exact branch/commit/deployment
  evidence.
