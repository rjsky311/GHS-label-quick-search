# Agent-Readable Label Summary Contract v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for code changes. Use checkbox (`- [ ]`) syntax for task tracking.

**Goal:** Define and test a read-only `agent_label_summary.v0` contract that can later be exposed through OpenAPI or agent-facing docs without scraping the UI.

**Architecture:** Add a focused backend module for Pydantic contract models and a pure converter from existing `ChemicalResult` output. Do not add a public route, `llms.txt`, robots/sitemap, write path, approval path, or print behavior in this slice.

**Tech Stack:** Python 3.11, FastAPI/Pydantic v2, pytest, existing backend `ChemicalResult` model.

---

## Evidence Source

- Accepted scope decision: `docs/superpowers/plans/2026-06-28-agent-ready-api-scope-decision.md`
- Live queue candidate: `NEXT_PRODUCT_WORK.md` names `Agent-readable label summary contract v0 design/fixtures` as the next bounded slice after scope-decision verification.
- Existing public data shape: `backend/api_models.py` exposes `ChemicalResult`, including identity, GHS pictograms, H/P statements, signal word, source metadata, alternate classifications, cache/upstream flags, and reference links.
- Existing QR contract: print tests assert the site lookup target uses `/?cas=<cas-number>` with `data-qr-target-type="ghs-lookup"`.

## Scope

This slice may add:

- A backend-only Pydantic model for `agent_label_summary.v0`.
- A pure helper that maps a `ChemicalResult` into that contract.
- Tests/fixtures proving successful, text-only, upstream-error, multiple-classification, missing-trusted-Chinese-name, and unapproved-candidate-excluded states.
- Roadmap state updates that close the scope-decision slice and record this contract slice.

This slice must not add:

- New public runtime endpoints.
- Public data writes, approval, correction promotion, or agent write-back.
- Compliance, storage, disposal, PPE, transport, waste, or approval advice.
- DOM scraping or print-HTML scraping as a contract.
- `llms.txt`, robots, sitemap, or OpenAPI publication changes.
- Physical-print claims.

## Task Plan

### Task 1: Open The Contract Slice In The Live Queue

**Files:**
- Modify: `NEXT_PRODUCT_WORK.md`
- Optionally modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`

- [ ] Record the completed Agent-Ready API Scope Decision with local and remote proof.
- [ ] Make `Agent-readable label summary contract v0 design/fixtures` the active slice.
- [ ] Preserve the stop condition: schema/examples/tests only, no route or docs-guide publication.

### Task 2: RED - Write Contract Tests First

**Files:**
- Add: `backend/test_agent_label_summary.py`

- [ ] Add a test that imports the wished-for `build_agent_label_summary_v0` API and expects a stable `agent_label_summary.v0` payload from a populated `ChemicalResult`.
- [ ] Add a test that fake Chinese text is suppressed, candidate-looking fields are absent, and review flags expose the missing trusted Chinese name.
- [ ] Add a test that the JSON schema declares the authority boundary/read-only contract fields.
- [ ] Run `python -m pytest -q test_agent_label_summary.py` from `backend/` and confirm it fails because the module/API is missing.

### Task 3: GREEN - Implement Minimal Contract Module

**Files:**
- Add: `backend/agent_label_summary.py`

- [ ] Define small Pydantic models for pictograms, statements, sources, alternates, QR target metadata, upstream/cache state, authority boundary, and the top-level summary.
- [ ] Implement `build_agent_label_summary_v0(result, lookup_base_url=...)` as a pure function.
- [ ] Keep unsafe reference URLs out by relying on the existing safe URL validator.
- [ ] Keep `name_zh` only when it contains CJK text.
- [ ] Emit review flags for no-GHS, text-only-GHS, upstream retry, multiple classifications, and missing trusted Chinese name.

### Task 4: Verify

**Commands:**

```bash
cd backend && python -m pytest -q test_agent_label_summary.py
cd backend && python -m pytest -q
cd backend && python -m py_compile agent_label_summary.py api_models.py server.py
git diff --check
cd frontend && npm run test:docs
```

- [ ] Targeted tests pass after implementation.
- [ ] Full backend tests pass.
- [ ] Compile/docs/diff checks pass.

### Task 5: Commit, Push, And Monitor

- [ ] Commit exact files for this slice.
- [ ] Push `main`.
- [ ] Confirm GitHub CI passes.
- [ ] If Production Print QA runs, confirm it passes or capture failure as new evidence.

## Acceptance Criteria

- `agent_label_summary.v0` is represented by Pydantic schema, not DOM or print HTML.
- The converter uses approved public lookup output only.
- Fake/non-CJK `name_zh` is omitted and flagged instead of presented as trusted Chinese.
- Unsafe reference URLs and candidate/manual approval fields are excluded.
- QR metadata points to the existing lookup target pattern without changing print behavior.
- Authority boundary states this is reference/draft data and SDS, supplier labels, and local regulations remain final.
- No public route or agent write path is added.
