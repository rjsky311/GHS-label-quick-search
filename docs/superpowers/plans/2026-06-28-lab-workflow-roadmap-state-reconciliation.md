# Lab Workflow Roadmap State Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile `LAB_WORKFLOW_READINESS_ROADMAP.md` with the current canonical state so agents do not reopen shipped Prepared Solution or Agent-ready work by inertia.

**Architecture:** This is a docs-only roadmap maintenance slice. It updates the direction document to distinguish shipped/monitoring work from evidence-gated candidate themes while leaving `PROJECT_STATUS_AND_NEXT_PLAN.md` and `NEXT_PRODUCT_WORK.md` as the active selectors.

**Tech Stack:** Markdown roadmap docs, existing docs drift checker, git diff checks.

---

### Task 1: Update Roadmap State

**Files:**
- Create: `docs/superpowers/plans/2026-06-28-lab-workflow-roadmap-state-reconciliation.md`
- Modify: `LAB_WORKFLOW_READINESS_ROADMAP.md`

- [x] **Step 1: Record the evidence source**

  In `LAB_WORKFLOW_READINESS_ROADMAP.md`, update the opening status/context to say:
  - Prepared Solution Entry Clarity is shipped and production-verified.
  - The Agent-ready reference/draft sequence is shipped through scope decision, schema/fixtures, endpoint, `/llms.txt`, and live availability audit.
  - No autonomous implementation slice is currently open from this roadmap.

- [x] **Step 2: Reframe roadmap structure**

  Replace the stale `Now` framing with monitoring-mode wording:
  - Shipped/monitoring: Prepared Solution Entry Clarity.
  - Shipped/monitoring: Agent-ready API reference/draft access.
  - Next candidates: Batch Review And Export Handoff Clarity and Data Correction And Source Trust Loop.
  - Later/evidence-gated: Daily-Use Comfort.

- [x] **Step 3: Preserve evidence gates and non-goals**

  Keep the existing promotion triggers and guardrails:
  - Do not open batch/export, data correction/admin, daily comfort, or physical printing without concrete evidence.
  - Keep physical printing deferred.
  - Keep Dark Bench as app chrome only, never printed-label meaning or preview color.
  - Keep agent output read-only and reference/draft only.

- [x] **Step 4: Verify docs**

  Run:

  ```bash
  git diff --check
  cd frontend && npm run test:docs
  ```

  Expected:
  - `git diff --check` exits 0.
  - `npm run test:docs` exits 0.

- [ ] **Step 5: Commit only intended files**

  Run:

  ```bash
  git status --short
  git add docs/superpowers/plans/2026-06-28-lab-workflow-roadmap-state-reconciliation.md LAB_WORKFLOW_READINESS_ROADMAP.md
  git diff --cached --stat
  git commit -m "Reconcile lab workflow roadmap state"
  ```

  Expected:
  - Only the new plan and `LAB_WORKFLOW_READINESS_ROADMAP.md` are staged.
  - Commit succeeds with a docs-only diff.

- [ ] **Step 6: Push and monitor remote checks**

  Run:

  ```bash
  git push origin main
  gh run list --branch main --limit 8 --json databaseId,workflowName,status,conclusion,headSha,url,event,createdAt
  ```

  Expected:
  - The push succeeds.
  - GitHub CI for the new commit completes successfully.
  - Production Print QA completes successfully, or any delay/failure is reported without claiming completion.

### Self-Review

- Spec coverage: This plan addresses the concrete roadmap drift between the direction document and the canonical active-state docs.
- Placeholder scan: No TBD/TODO placeholders are present.
- Boundary check: The plan is docs-only and does not open a new product implementation slice.
