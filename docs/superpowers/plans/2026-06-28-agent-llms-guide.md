# Agent llms.txt Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-first verification for the public guide. Use checkbox (`- [ ]`) syntax for task tracking.

**Goal:** Publish a concise `/llms.txt` guide that points agents to OpenAPI and the read-only agent label-summary endpoint while preserving GHS authority and data-governance boundaries.

**Architecture:** Add `frontend/public/llms.txt` as a static guide served by the frontend. Extend the existing docs drift check so CI rejects missing or unsafe guide content. Do not add robots/sitemap, write paths, compliance advice, or print behavior.

**Tech Stack:** Vite public static assets, Node docs check, Markdown-style `llms.txt` content.

---

## Evidence Source

- Closed endpoint slice: `GET /api/agent/label-summary?q=<CAS-or-name>` is available through OpenAPI.
- Accepted scope decision: `docs/superpowers/plans/2026-06-28-agent-ready-api-scope-decision.md`
- `LAB_WORKFLOW_READINESS_ROADMAP.md` lists an agent-facing guide such as `llms.txt` as a later concrete work item after the safety/scope decision.

## Scope

This slice may add:

- `frontend/public/llms.txt`
- Docs-check requirements for required links and safety boundaries.
- Roadmap state updates closing the endpoint slice.

This slice must not add:

- robots/sitemap or crawler policy changes.
- New API endpoints.
- Write-back, approval, or correction-promotion paths.
- Compliance, storage, disposal, PPE, transport, waste, or approval advice.
- Print-model or physical-print behavior.

## Task Plan

### Task 1: Open The Guide Slice

**Files:**
- Modify: `NEXT_PRODUCT_WORK.md`
- Modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`

- [ ] Close the Agent label summary endpoint v0 slice with local and remote proof.
- [ ] Make the `/llms.txt` guide slice active.
- [ ] Preserve stop conditions around static guidance only.

### Task 2: RED - Add Docs Check First

**Files:**
- Modify: `frontend/scripts/check-docs-drift.mjs`

- [ ] Require `frontend/public/llms.txt`.
- [ ] Require links to OpenAPI and the read-only label-summary endpoint.
- [ ] Require SDS, supplier-label, local-regulation, read-only, no-write, and no-approval boundaries.
- [ ] Run `npm run test:docs` and confirm it fails because `llms.txt` is missing.

### Task 3: GREEN - Add Public Guide

**Files:**
- Add: `frontend/public/llms.txt`

- [ ] Add a concise guide with a title, summary, API links, safe usage notes, and boundaries.
- [ ] Position `llms.txt` as navigation guidance, not chemical-data authority.
- [ ] Avoid compliance/storage/disposal/PPE/transport/waste instructions.

### Task 4: Verify

**Commands:**

```bash
cd frontend && npm run test:docs
git diff --check
cd frontend && npm run build
```

- [ ] Docs check passes after adding the guide.
- [ ] Build preserves the static asset.
- [ ] Diff check passes.

### Task 5: Commit, Push, And Monitor

- [ ] Commit exact files for this slice.
- [ ] Push `main`.
- [ ] Confirm GitHub CI passes.
- [ ] If Production Print QA runs, confirm it passes or capture failure as new evidence.

## Acceptance Criteria

- `/llms.txt` gives agents a stable starting point for the public API.
- The guide points to OpenAPI and the read-only `agent_label_summary.v0` endpoint.
- The guide says SDS, supplier labels, and local regulations remain final authority.
- The guide says the API is read-only and not approval, compliance advice, or data write-back.
- CI/docs checks protect those minimum boundaries.
