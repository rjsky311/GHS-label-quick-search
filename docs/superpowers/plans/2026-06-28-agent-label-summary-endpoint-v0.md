# Agent Label Summary Endpoint v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for code changes. Use checkbox (`- [ ]`) syntax for task tracking.

**Goal:** Expose the tested `agent_label_summary.v0` contract through a bounded read-only API endpoint so agents and scripts can consume structured lookup output without DOM scraping.

**Architecture:** Reuse the existing `_search_single_query` lookup path, return `AgentLabelSummaryV0` through FastAPI `response_model`, and keep the endpoint read-only. Do not add write paths, approval paths, compliance advice, `llms.txt`, robots/sitemap, or print behavior.

**Tech Stack:** FastAPI, Pydantic v2, pytest, existing backend lookup/search path.

---

## Evidence Source

- Closed contract slice: `backend/agent_label_summary.py` and `backend/test_agent_label_summary.py` define and verify the `agent_label_summary.v0` contract.
- Accepted scope decision: `docs/superpowers/plans/2026-06-28-agent-ready-api-scope-decision.md`
- Existing route pattern: `/api/search-single` and `/api/search/{cas_number}` already use `_search_single_query` for bounded public lookup behavior.

## Scope

This slice may add:

- A read-only `GET /api/agent/label-summary?q=<CAS-or-name>` endpoint.
- FastAPI OpenAPI exposure through `response_model=AgentLabelSummaryV0`.
- Endpoint tests for successful summary output, blank/overlong validation, and OpenAPI schema visibility.
- Roadmap state updates closing the contract-only slice.

This slice must not add:

- Public write endpoints or agent write-back.
- Manual dictionary approval or correction promotion.
- Compliance, storage, disposal, PPE, transport, waste, or approval advice.
- DOM scraping, print HTML scraping, `llms.txt`, robots, sitemap, or print-model changes.

## Task Plan

### Task 1: Open The Endpoint Slice

**Files:**
- Modify: `NEXT_PRODUCT_WORK.md`
- Modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`

- [ ] Close the `agent_label_summary.v0` contract slice with local and remote proof.
- [ ] Make the read-only endpoint/OpenAPI slice active.
- [ ] Preserve stop conditions around read-only output and no docs-guide publication.

### Task 2: RED - Endpoint Tests First

**Files:**
- Modify: `backend/test_agent_label_summary.py`

- [ ] Add a test for `GET /api/agent/label-summary?q=64-17-5` returning a summary payload.
- [ ] Add a test that blank input is rejected and overlong input remains bounded.
- [ ] Add a test that OpenAPI exposes the route and `AgentLabelSummaryV0` schema.
- [ ] Run the targeted tests and confirm they fail because the endpoint is missing.

### Task 3: GREEN - Implement Minimal Endpoint

**Files:**
- Modify: `backend/server.py`

- [ ] Import `AgentLabelSummaryV0` and `build_agent_label_summary_v0`.
- [ ] Add the read-only route using `_search_single_query`.
- [ ] Apply the existing public query bound and rate limit.
- [ ] Do not change existing search, print, export, admin, or correction behavior.

### Task 4: Verify

**Commands:**

```bash
cd backend && python -m pytest -q test_agent_label_summary.py test_search_single_endpoint.py
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

- Agents can request a structured read-only label summary without scraping the UI.
- OpenAPI advertises the route and response schema.
- The route reuses existing lookup behavior and bounded query validation.
- The response preserves authority/data-governance boundaries from `agent_label_summary.v0`.
- No write, approval, compliance-advice, docs-guide, crawler, or print behavior is added.
