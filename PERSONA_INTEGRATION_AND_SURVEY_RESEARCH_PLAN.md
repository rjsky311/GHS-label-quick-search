# Persona Integration And Survey Research Plan

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` as the canonical planning entry point.
This file is an owner doc for a future evidence-driven slice that combines
persona-based integration tests with external survey-style product research.

Status: `Five persona gates added / monitoring`.

First survey checkpoint: `LINER_SURVEY_2026_06_02_FINDINGS.md` records the
uploaded LINER dataset and opens only the bounded Batch Review Self-Service
Clarity slice. It does not authorize legal, SDS, GHS correctness, or physical
print conclusions.

## Purpose

The project already has strong QA gates for print contracts, PDF rendering,
production search UI, production batch print, and production product closure.
The remaining gap is not "no integration testing." The gap is that the
automated gates are mostly feature/block oriented, while users experience the
product as a role-based workflow:

- Lab graduate student: paste a batch, understand what needs review, print the
  right labels, and move on.
- Lab manager: process 50-100 rows, export a usable handoff, and know which
  rows need data cleanup.
- Teaching unit: prepare repeatable labels and exports without exposing too
  many advanced settings.
- Admin/data curator: triage missing names, unresolved searches, candidates,
  aliases, and reference links without guessing the next action.
- General lookup user: search one chemical, inspect trusted sources, and avoid
  mistaking the app for legal authority.

This plan turns those workflows into scenario gates and uses survey simulation
only as a product-research aid, not as compliance or data-truth validation.

## Current Baseline

Existing automated coverage:

- Jest app-level integration tests such as
  `frontend/src/__tests__/printAllWithGhs.integration.test.js` and
  `frontend/src/__tests__/prepareSolution.integration.test.js`.
- Production browser QA scripts under `frontend/scripts/`, including
  `qa:production-search-ui`, `qa:production-batch-print`, and
  `qa:production-product`.
- Print-specific contract/PDF gates: `npm run test:print-contract`,
  `npm run qa:print-report`, and `npm run qa:print-pdf`.

External references checked:

- Playwright is the right class of tool for browser end-to-end workflows:
  https://playwright.dev/docs/intro
- LINER's survey simulator is useful for previewing survey responses and
  finding product-research blind spots before real user testing:
  https://liner.com/features/research-agents/survey-simulator
- LINER usage and privacy limits must be respected before uploading any
  sensitive material:
  https://liner.com/zh/usage-policy

## Non-Goals

- Do not replace print contract, PDF QA, production QA, or physical print
  validation.
- Do not treat AI survey simulation as proof that GHS content is correct.
- Do not upload real lab rosters, unpublished SDS files, private admin data,
  secrets, or customer-identifying information into external survey tools.
- Do not build a large flaky end-to-end suite that repeats every unit test.
- Do not reopen the shipped Batch-First baseline without fresh evidence.

## Scenario Test Model

Add persona scenario gates only when fresh evidence shows a user workflow can
drift even while current feature gates pass.

Each scenario should record:

- Persona.
- Starting input.
- Required user-visible decisions.
- Expected output or handoff artifact.
- What must not be confusing, hidden, or silently omitted.
- Exact verification command.

### Scenario 1: Lab Graduate Student Batch Print

Goal: a user can paste a mixed 50-100 item batch and understand what can be
printed without becoming a data-cleanup expert.

Acceptance criteria:

- Valid unique CAS rows, duplicates, invalid rows, unresolved rows, and
  needs-review rows are separated.
- Multiple-GHS rows are called out as primary-version confirmation tasks.
- The user can select one of the three public label outputs.
- Small labels never show H/P text.
- Complete A4/Letter labels include all available pictograms and full H/P
  content with continuation when needed.
- Print action copy states item count, physical label/page count, output type,
  and excluded count.

Likely gate:

- Extend `qa:production-batch-print` only if production evidence shows the
  existing gate does not cover the path.
- Otherwise add a deterministic Jest integration fixture first.

Current gate:

- `frontend/src/__tests__/personaBatchPrint.integration.test.js` covers a
  mixed batch from workflow summary through review-action visibility,
  multiple-GHS callout, bulk GHS print selection, the three public output
  choices, and QR small-label print handoff.

### Scenario 2: Lab Manager Export Handoff

Goal: a lab manager can use export output to separate ready rows from rows that
need review.

Acceptance criteria:

- Export preview shows ready, needs-review, and unresolved scope before
  download.
- CSV/XLSX includes trust/source context, review signal count, primary review
  action, printable state, multiple-GHS status, and classification-selection
  status.
- XLSX sheets remain useful for ready rows, needs-review rows, unresolved rows,
  and summary.
- Formula-injection neutralization remains intact.

Likely gate:

- Backend export tests plus focused frontend export-preview tests.
- Production search UI only when deployed export preview or visible copy
  changes.

Current gate:

- `frontend/src/__tests__/personaExportHandoff.integration.test.js` covers the
  App-level path from mixed batch search results into XLSX export preview,
  then verifies ready, needs-review, and unresolved scopes hand the correct
  rows and scope metadata to the download layer.

### Scenario 3: Teaching Unit Repeatable Setup

Goal: a teaching user can prepare a repeatable class/lab setup with low noise.

Acceptance criteria:

- The first screen stays task-first: search, inspect, print/export.
- Advanced print controls do not compete with the three output choices.
- Prepared-solution/reprint flow preserves identity, GHS, QR, and authority
  boundaries.
- Narrow read-first views remain usable for search/detail review.

Likely gate:

- Existing `qa:production-prepared` plus `qa:production-search-ui` when the
  changed surface is deployed.

Current gate:

- `frontend/src/__tests__/personaTeachingSetup.integration.test.js` covers a
  teaching-unit repeatable setup path from single lookup into the prepared
  solution flow, then verifies the print modal remains task-first, exposes the
  three public outputs, preserves parent identity/GHS data, and hands off a
  prepared label without hiding the SDS/supplier/local-rule trust boundary.

### Scenario 4: Admin/Data Curator Triage

Goal: a maintainer can tell what data-quality action to take next.

Acceptance criteria:

- Missing Chinese names, unresolved searches, no-GHS data, source conflicts,
  text-only GHS, candidate evidence, aliases, and reference links stay
  distinct.
- Candidate evidence remains review-only until admin-approved.
- Manual entries, aliases, and reference links remain bounded, auditable, and
  admin-gated.
- Inventory audit handoff rows do not become approved public data
  automatically.

Likely gate:

- Backend pilot/admin tests.
- Focused frontend pilot dashboard tests.
- Production QA only if public or deployed admin-facing behavior changes.

Current gate:

- `frontend/src/__tests__/personaAdminTriage.integration.test.js` covers the
  App-level path from locked admin entry through admin-key unlock into the
  dashboard triage surface. It verifies that the maintainer can see the primary
  data-quality action, queue/review-signal counts, unresolved searches,
  correction requests, missing-name/source-conflict/no-GHS/stale-telemetry
  buckets, and can jump from the primary action into the related admin queue.

### Scenario 5: General Single Lookup Trust

Goal: a user can search one chemical, understand source confidence, and avoid
over-trusting missing or conflicting data.

Acceptance criteria:

- Missing upstream data is not shown as "no hazards."
- Recommended classification, alternate classifications, report count, source
  family, SDS/reference links, and correction route stay visible.
- Missing trusted Chinese names are not filled by English placeholders.
- QR return path hydrates the lookup page with the same CAS context.

Likely gate:

- `qa:production-search-ui` for deployed behavior.
- Focused data-governance tests when source ranking or name policy changes.

Current gate:

- `frontend/src/__tests__/personaSingleLookupTrust.integration.test.js` covers
  a single lookup with source confidence, missing trusted Chinese-name
  curation, multiple GHS classification review, safe SDS/regulatory reference
  links, provenance/report-count context, cache visibility, and authority
  boundary copy.

## LINER Survey Research Model

Use LINER as a low-cost way to challenge wording, workflow assumptions, and
scope clarity before spending engineering effort. Treat it as "product
research input," not as a QA oracle.

Use `PERSONA_SURVEY_REVIEW_PACKET.md` as the ready-to-run safe packet for
external review prompts, sanitized screenshot selection, output schema, and the
research-to-backlog decision rule.

### Safe Inputs

Allowed:

- Product brief.
- Sanitized screenshots.
- Synthetic CAS examples already used in tests.
- Mock survey questions.
- Public documentation excerpts from this repo.

Not allowed:

- Real private inventory rosters.
- Unpublished SDS files.
- Admin keys, API tokens, Zeabur/GitHub internals, or user-identifying data.
- Any content that would imply LINER validates legal GHS correctness.

### Survey Prompts To Trial

Ask simulated respondents to review:

- Whether the three label outputs are understandable.
- Whether batch review reasons tell them what to do next.
- Whether export preview gives enough confidence before downloading.
- Whether source/conflict warnings lower or increase anxiety.
- Whether admin/data-correction language feels like "data quality" rather than
  general support.

### Turning Survey Output Into Work

Survey feedback can open a product slice only when it becomes concrete
evidence:

- It identifies a repeated confusion pattern tied to a user job.
- The project can define an acceptance criterion.
- The fix can be verified by tests, production QA, screenshots, docs, or a
  future real-user check.

Do not implement from survey output alone when:

- It conflicts with `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`.
- It weakens `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`.
- It asks to hide SDS/local-rule authority boundaries.
- It requests more controls without proving the current task-first path fails.

## Implementation Order

1. Documentation baseline: this file plus cross-links from canonical planning
   docs.
2. Persona fixture inventory: map existing tests/production scripts to the five
   scenarios above and identify true gaps.
3. First scenario gate: added for lab graduate student batch review/print.
4. Second scenario gate: added for lab manager export handoff.
5. Third scenario gate: added for admin/data curator triage.
6. Fourth scenario gate: added for teaching-unit prepared-solution setup.
7. Fifth scenario gate: added for general single-lookup trust and source
   boundaries.
8. Survey packet: added in `PERSONA_SURVEY_REVIEW_PACKET.md` for LINER or
   another external review tool.
9. Research-to-backlog rule: update `NEXT_PRODUCT_WORK.md` only when survey or
   scenario output identifies source, affected user job, proof, and stop
   condition.

## Done Criteria

This plan is ready to use as a monitoring baseline when:

- It is discoverable from `PROJECT_STATUS_AND_NEXT_PLAN.md`,
  `NEXT_PRODUCT_WORK.md`, and `README.md`.
- Existing docs still state that fresh evidence is required before opening a
  new product slice.
- The five current persona workflows have executable gates, and the next
  implementation round can reopen a scenario only from fresh evidence instead
  of broad backlog inertia.

A persona integration slice is done only when:

- A single persona workflow has a concrete acceptance standard.
- The corresponding automated or production gate passes.
- Any survey/research result used for prioritization is recorded as evidence,
  not as hidden memory.
- The change does not expand the public label model beyond the three outputs.
