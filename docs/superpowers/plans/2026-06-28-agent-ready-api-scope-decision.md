# Agent-Ready API Scope Decision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the product and safety boundary for future agent-readable GHS lookup output before adding any public machine-readable contract, guide, or endpoint.

**Architecture:** This is a docs-only scope-decision slice. It records the allowed contract shape and next implementation sequence, using the existing FastAPI/OpenAPI baseline as the future authoritative API surface and treating `llms.txt`/robots/sitemap as optional navigation aids rather than chemical-data authority.

**Tech Stack:** Markdown planning docs, FastAPI/Pydantic public response models, Vite static public assets, GitHub Actions production QA.

---

## Evidence Source

- Roadmap source: `LAB_WORKFLOW_READINESS_ROADMAP.md` lists safe machine-readable access as a later theme and says it must not open implementation without a scope/safety decision.
- Owner/user source: the roadmap discussion asked whether the website should be easy for Coding Agents to crawl and whether AI should get label/tag information without human UI operation.
- Codebase source: `backend/server.py` exposes FastAPI under `/api`, with public lookup endpoints and automatic OpenAPI support; `backend/api_models.py` already exposes `ChemicalResult` fields for identity, GHS pictograms, H/P statements, signal word, alternate classifications, source metadata, cache freshness, upstream errors, and reference links.
- Static-site source: `frontend/public/` currently contains GHS pictogram assets only; there is no `llms.txt`, `robots.txt`, or sitemap file in the public tree.
- Governance source: `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` requires SDS/supplier/local-rule verification, keeps candidate evidence review-only, and prevents unapproved names, links, aliases, or hazard interpretations from affecting public lookup, labels, exports, or QR targets.
- External reference source, checked 2026-06-28: OpenAPI is a formal API description standard for humans and computers (`https://spec.openapis.org/oas/`); `llms.txt` remains an emerging Markdown convention/proposal (`https://llmstxt.org/`); RFC 9309 robots.txt controls crawler access requests and explicitly is not access authorization (`https://datatracker.ietf.org/doc/html/rfc9309`).

## Scope Decision

This slice should decide only the safe direction for a future implementation. It must not add runtime API behavior.

### Accepted Direction

- OpenAPI plus explicit versioned JSON schema should be the authoritative machine-readable contract.
- `llms.txt` may be useful later as a concise guide pointing agents to OpenAPI, examples, rate limits, safety boundaries, and correction/support paths.
- `robots.txt` and sitemap may help crawlers find public documentation, but they must not be treated as a GHS data contract or an access-control mechanism.
- The future agent-facing response should be read-only reference/draft data. It may help scripts, LIMS, ELN, inventory cleanup, or Coding Agents understand lookup output, but it must not provide compliance approval, storage/disposal advice, autonomous hazard reclassification, or public data writes.
- The future contract should prefer a stable `label_summary` object derived from approved public lookup output, not from DOM scraping, rendered print HTML, screenshots, or UI copy.

### Required Future Contract Fields

The future implementation slice should define a versioned `label_summary` schema containing:

- `schema_version`
- identity: `cas_number`, `cid`, `name_en`, trusted `name_zh` only when CJK/trusted
- GHS pictograms: code, English/Traditional Chinese name, renderable image URL or public asset path
- signal word in English and Traditional Chinese when available
- hazard statements and precautionary statements with code and text
- selected primary classification source metadata and report count
- alternate classification summaries and multiple-classification/review flags
- reference-link metadata and QR target metadata, safe `http`/`https` only
- data-quality flags: no-GHS, text-only-GHS, missing pictograms, source conflict, multiple classification, missing trusted Chinese name
- upstream/cache flags: `retrieved_at`, `cache_hit`, `upstream_error`, retry guidance
- authority boundary: SDS/supplier/local regulations remain final authority; output is reference/draft, not approval

### Explicit Non-Goals

- Do not add write endpoints for agents.
- Do not let agent output create or approve manual dictionary entries, aliases, reference links, correction requests, QR targets, or labels.
- Do not expose pending/manual/candidate evidence as approved public data.
- Do not make DOM scraping, print HTML, or label preview markup the contract.
- Do not generate compliance, storage, disposal, PPE, transport, waste, or approval advice.
- Do not alter the public three-output print model.
- Do not add physical-print claims while real paper/printer validation remains deferred.

## Task Plan

### Task 1: Record Scope Decision As The Next Design Slice

**Files:**
- Modify: `NEXT_PRODUCT_WORK.md`
- Optionally modify: `PROJECT_STATUS_AND_NEXT_PLAN.md`

- [ ] **Step 1: Update the active-slice section**

Add an active docs-only design slice with:

```markdown
Current active slice: Agent-Ready API Scope Decision. Source: the committed
Lab Workflow Readiness roadmap and owner/user questions about whether Coding
Agents should crawl or receive structured label/tag information. Affected user
job: a person or automation needs structured GHS lookup and label-summary data
without scraping the UI, while keeping GHS authority and data-governance
boundaries explicit. Expected proof: this scope-decision plan, docs drift check,
and a reviewed next-slice implementation checklist. Stop condition: stop at
the product/safety decision and next implementation checklist; do not add
runtime API behavior, `llms.txt`, robots/sitemap, or schema code in this slice.
```

- [ ] **Step 2: Preserve the current no-product-implementation boundary**

Make clear that this design slice does not reopen Batch-First, prepared-label,
print polish, admin tooling, or physical printing.

- [ ] **Step 3: Run docs checks**

Run:

```bash
git diff --check
cd frontend && npm run test:docs
```

Expected: both commands exit 0.

### Task 2: Review The Scope Decision

**Files:**
- Modify if review finds blockers: `docs/superpowers/plans/2026-06-28-agent-ready-api-scope-decision.md`
- Modify if review changes active state: `NEXT_PRODUCT_WORK.md`

- [ ] **Step 1: Safety/data-governance review**

Check that the decision excludes unapproved candidate evidence, write-back, compliance approval, and hazard reclassification.

- [ ] **Step 2: API contract review**

Check that the decision makes OpenAPI/versioned JSON schema authoritative and does not make DOM scraping, print HTML, `llms.txt`, robots, or sitemap the chemical-data contract.

- [ ] **Step 3: UX/workflow review**

Check that the future output helps a person or automation complete lookup/export/inventory handoff without hiding SDS/supplier/local-rule verification.

- [ ] **Step 4: Testability review**

Check that the future implementation can be proven by schema/snapshot tests, API tests, examples for success/no-GHS/text-only/upstream/multiple-classification states, and docs examples.

- [ ] **Step 5: Fix blockers before implementation**

If any review finds a blocker, update this plan and do not open a runtime implementation slice until the blocker is resolved.

### Review Result: 2026-06-28

No blocker found for the docs-only scope decision.

- Safety/data governance: the decision excludes unapproved candidate evidence, write-back, public data approval, compliance approval, storage/disposal/PPE/transport/waste advice, and autonomous hazard reclassification.
- API contract: OpenAPI plus an explicit versioned JSON schema is the future authority; DOM scraping, rendered print HTML, screenshots, UI copy, `llms.txt`, robots, and sitemap are excluded as chemical-data contracts.
- UX/workflow: the future output is useful for scripts, LIMS, ELN, inventory cleanup, and Coding Agent consumption without hiding SDS, supplier-label, and local-regulation verification.
- Testability: the next slice can be proven with schema/snapshot tests, API examples, and fixtures for success, no-GHS, text-only-GHS, upstream-error, multiple-classification, stale/cache-hit, and unapproved-candidate-excluded states.

### Task 3: Define The Next Implementation Slice Checklist

**Files:**
- Modify: `NEXT_PRODUCT_WORK.md`
- Optional future implementation files, not touched in this slice:
  - `backend/api_models.py`
  - `backend/server.py`
  - `backend/test_agent_label_summary.py`
  - `frontend/public/llms.txt`
  - `frontend/scripts/check-agent-readable-contract.mjs`

- [ ] **Step 1: Record the next slice candidate**

Add a next-slice candidate only if Task 2 review has no blockers:

```markdown
Next candidate slice: Agent-readable label summary contract v0 design/fixtures.
Source: accepted Agent-Ready API Scope Decision. Expected proof: backend schema
or snapshot tests for approved public lookup output only, examples for success,
no-GHS, text-only-GHS, upstream-error, multiple-classification, stale/cache-hit,
and unapproved-candidate-excluded states. Stop condition: stop at read-only
schema/examples and tests; do not add write endpoints, compliance advice, or
automatic data approval.
```

- [ ] **Step 2: Keep implementation deferred**

Do not touch backend runtime code, frontend static files, or CI scripts in this scope-decision slice.

### Task 4: Verify, Commit, And Push

**Files:**
- Commit exact docs touched by this slice.

- [ ] **Step 1: Verify local docs**

Run:

```bash
git diff --check
cd frontend && npm run test:docs
```

Expected: both commands exit 0.

- [ ] **Step 2: Commit exact files**

Run:

```bash
git add docs/superpowers/plans/2026-06-28-agent-ready-api-scope-decision.md NEXT_PRODUCT_WORK.md PROJECT_STATUS_AND_NEXT_PLAN.md
git commit -m "Plan agent-ready API scope decision"
```

Only include `PROJECT_STATUS_AND_NEXT_PLAN.md` if it changed.

- [ ] **Step 3: Push and monitor**

Run:

```bash
git push origin main
gh run list --branch main --limit 6 --json databaseId,workflowName,status,conclusion,headSha,url,event
```

Expected: CI starts for the pushed SHA and eventually passes. If Production Print QA is triggered, wait for it and treat failures as new evidence.

## Acceptance Criteria

- The scope decision explicitly says what machine-readable output may do and must not do.
- The future source of truth is OpenAPI plus versioned JSON schema, not DOM scraping.
- `llms.txt` is positioned only as a guide, not as data authority.
- robots/sitemap are positioned only as crawler/navigation hints, not authorization or data contracts.
- Candidate evidence, unapproved manual entries, and external suggestions stay excluded from public agent output.
- The next implementation slice is bounded to read-only schema/examples/tests.
- Docs verification passes.

## Self-Review

- Spec coverage: covers the roadmap's Agent-Ready API Contract purpose, promotion trigger, concrete work, expected proof, and stop condition.
- Placeholder scan: no `TBD`, `TODO`, "similar to", or unspecified implementation steps remain.
- Type consistency: planned future field names use snake_case and align with existing Python/Pydantic public response naming.
- Safety consistency: the plan preserves the reference-tool boundary and does not add new public data-write or approval paths.
