# Agent Live Availability Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record production evidence that the agent-readable public API, OpenAPI contract, and `/llms.txt` guide are actually available from the deployed services.

**Architecture:** This is a docs-only evidence slice. It records live production checks in the canonical roadmap state without changing backend routes, frontend assets, print behavior, data governance rules, or product scope.

**Tech Stack:** Markdown owner docs, existing docs drift checker, GitHub/Zeabur production endpoints.

---

### Task 1: Record Live Availability Evidence

**Files:**
- Create: `docs/superpowers/plans/2026-06-28-agent-live-availability-audit.md`
- Modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`
- Modify: `NEXT_PRODUCT_WORK.md`

- [x] **Step 1: Record the slice source and non-goals**

  In `PROJECT_STATUS_AND_NEXT_PLAN.md` and `NEXT_PRODUCT_WORK.md`, record:
  - Source: completion audit after the closed Agent `/llms.txt` guide slice.
  - Affected user job: Coding Agents, scripts, LIMS/ELN helpers, and inventory cleanup workflows can discover the API guide and read a structured label summary without scraping the UI.
  - Non-goals: no endpoint changes, no write paths, no crawler policy change, no compliance advice, no print behavior change, no public-data approval workflow.

- [x] **Step 2: Record live production proof**

  Add the verified production checks:
  - `https://ghs-backend.zeabur.app/openapi.json` returned `200`, included `/api/agent/label-summary`, and exposed `AgentLabelSummaryV0` with `upstream` and `authority_boundary`.
  - `https://ghs-frontend.zeabur.app/llms.txt` returned `200 text/plain` and included OpenAPI, `agent_label_summary.v0`, read-only, SDS, supplier-label, local-regulation, and unapproved-candidate boundaries.
  - `https://ghs-backend.zeabur.app/api/agent/label-summary?q=64-17-5` returned `200`, `schema_version: agent_label_summary.v0`, an `upstream` object, and `authority_boundary.status: reference_draft`.
  - Current GitHub `main` CI run `28300015087` and Production Print QA run `28300050620` passed at `afd7ed5c64a884b76d31de241ae02e802f65be99`.

- [x] **Step 3: Verify docs**

  Run:

  ```bash
  git diff --check
  cd frontend && npm run test:docs
  ```

  Expected:
  - `git diff --check` exits 0.
  - `npm run test:docs` exits 0 and reports docs checks passed.

- [ ] **Step 4: Commit only intended files**

  Run:

  ```bash
  git status --short
  git add docs/superpowers/plans/2026-06-28-agent-live-availability-audit.md PROJECT_STATUS_AND_NEXT_PLAN.md NEXT_PRODUCT_WORK.md
  git diff --cached --stat
  git commit -m "Record agent live availability audit"
  ```

  Expected:
  - Only the new plan file plus the two owner docs are staged.
  - Commit succeeds with a docs-only diff.

- [ ] **Step 5: Push and monitor remote checks**

  Run:

  ```bash
  git push origin main
  gh run list --branch main --limit 8 --json databaseId,workflowName,status,conclusion,headSha,url,event,createdAt
  ```

  Expected:
  - The push succeeds.
  - GitHub CI for the new commit completes successfully.
  - Production Print QA for the new commit completes successfully or, if it is delayed, its current state is reported explicitly without claiming remote completion.

### Self-Review

- Spec coverage: This plan covers only the live production availability evidence produced by the completion audit. It does not implement another roadmap feature or reopen batch/export, admin, daily comfort, or print work.
- Placeholder scan: No TBD, TODO, or future implementation placeholders are present.
- Boundary check: All changes are documentation-only and preserve the existing read-only agent API scope.
