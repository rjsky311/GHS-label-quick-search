# Product Requirements Decisions

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` as the canonical planning entry point.
Use this file after that when a continuation round needs the current product
requirements, user-priority order, data-correction direction, or completion
standard.

This file exists to keep future work finite and closeable. Avoid turning every
item into permanent "monitoring"; each active slice should have a clear goal,
non-goal, acceptance criteria, and verification gate.

## Confirmed Product Direction

Decision date: 2026-05-22.

Primary users:

- Lab graduate students.
- Lab managers.
- Teaching units.
- General chemical lookup users.

Core success order:

1. Batch lookup.
2. Label printing.
3. Export.
4. Brand trust / low-pressure visibility.
5. Single-item lookup.

Implementation priority when no urgent bug, CI failure, or production evidence
points elsewhere:

1. Batch lookup -> batch print.
2. Batch export.
3. Data correction / data governance.
4. Single-item lookup polish.
5. Brand/support polish.

Reasoning: the highest-value daily workflow is a user pasting a batch of CAS
numbers or chemical names and getting printable labels or exportable records
without becoming a data-cleanup or print-layout expert.

## Label Output Contract

The public label workflow stays intentionally small:

1. Complete A4/Letter label.
2. QR small label.
3. Identification small label.

Rules:

- Do not reintroduce first-level stock/template/density complexity.
- Small labels never print H/P statements.
- Small labels keep CAS, English name, Chinese name when trusted, and all
  available GHS pictograms across same-output continuation labels.
- QR small labels include the lookup QR target for this product.
- Identification small labels do not need QR unless a future explicit product
  decision changes the model.
- Batch print uses one selected output type and one physical stock. If an item
  needs more room, continue on the same output/stock instead of silently
  switching that item to another label type.
- Complete A4/Letter labels should be close to a shipped-container label while
  preserving the product's "reference tool, verify SDS/supplier/local rules"
  boundary.

Done means production QA confirms the actual deployed print path, not only a
local preview.

## Chinese Name And Candidate Data Policy

Current baseline:

- The existing seed dictionary contains Chinese names that were generated with
  Gemini 3.1 Pro. Treat that seed as the current accepted baseline for this
  project, but do not treat LLM translation as hazard authority.
- Do not bulk invalidate existing seed names without a dedicated dictionary
  review project.

Future rule:

- Automated translation, LLM output, Wikidata labels, PubChem synonyms, NCI
  resolver output, EPA CompTox identifiers, or any external scientific lookup
  result are candidate evidence only.
- Candidate names must not become printed Chinese identity, export values, or
  public dictionary entries until they are admin-approved.
- Missing Chinese names should be routed into the correction/admin curation
  path, not filled by repeating English.
- Candidate records should retain source/provenance notes so a coding agent or
  maintainer can review where the suggestion came from.

Preferred free/low-friction candidate sources:

1. Existing local dictionary and manual entries.
2. PubChem synonyms / identifiers.
3. Wikidata Chinese labels and aliases as candidate names only.
4. NCI/CADD resolver for identifier/name fallback.
5. EPA CompTox later if an API key is intentionally added.

Do not add CAS Common Chemistry as a runtime dependency without a separate
license review because its non-commercial terms may not match future brand or
indirect-monetization goals.

## Data Conflict UX

The ordinary user should not have to understand source-ranking internals.

Default UX:

- Result rows show the recommended classification and a compact trust signal.
- Detail shows source differences, report count, and alternate classifications.
- Print uses the recommended classification by default, but warns when a
  source-conflict or missing-data state requires user verification.
- Missing upstream data must never be presented as "no hazards."
- Upstream transient failure remains a retry state, not a data-correction
  request.

Goal: lower user anxiety while staying honest about SDS/supplier/local-rule
authority.

## Correction Intake Direction

Preferred storage and workflow:

- Build station/in-app correction intake first.
- Store correction requests in the existing backend pilot/admin SQLite store
  (backend storage/API and admin review queue landed on 2026-05-22).
- Show correction requests in the admin dashboard as part of data governance.
- Keep GitHub issue links as fallback/maintainer escape hatches, not the
  primary user-facing correction path.

Why backend SQLite / pilot store:

- The project already has admin-gated persistence, review lists, status counts,
  manual entries, aliases, reference links, and miss-query review.
- A coding agent can inspect and migrate one local/admin data model more easily
  than mixed browser localStorage, GitHub issues, and separate services.
- It keeps public submissions bounded and reviewable before they affect labels
  or exports.

Minimum correction request statuses:

- `open`: submitted or captured, not reviewed.
- `candidate_found`: a candidate name/link/identifier/source was found, but not
  approved for public use.
- `approved`: accepted and converted into the relevant curated record.
- `rejected`: reviewed and not accepted.
- `ignored`: not actionable or intentionally skipped.

Correction request types:

- `missing-chinese-name`.
- `unresolved-search`.
- `no-ghs-data`.
- `ghs-text-no-pictograms`.
- `source-conflict`.
- `reference-link`.
- `other-data-quality`.

Workflow/business requests stay separate from safety-data corrections.

## Batch Workflow Acceptance

The batch workflow should be judged from the user's task, not from internal
system convenience.

Acceptance for batch lookup -> print/export:

- A pasted batch clearly reports valid unique items, ignored duplicates,
  invalid inputs, and unresolved items.
- Users can see how many items are printable, excluded, or require continuation.
- A selected batch output uses one output type and one physical stock.
- Continuation stays on the same output/stock.
- Export includes enough trust/source context for later review.
- The deployed production QA covers representative messy paste, QR return path,
  and fixed-stock batch print behavior.

## Completion Standard

A product slice is done only when all applicable items are true:

- User-facing outcome is implemented.
- Safety/data authority boundary is documented.
- Tests or QA gates cover the behavior.
- Production-facing changes pass CI.
- Production-facing UI changes are pushed, deployed, and checked with the
  appropriate production QA gate.
- Affected canonical docs are updated.

For the user's preferred collaboration style, report after completion with:

- Completed.
- Verified.
- Pushed/deployed status.
- Next remaining item.

Stop for user input only when a real product decision, safety/legal tradeoff,
new cost-bearing dependency, credential/API-key choice, or unresolved blocker is
required.

## Active Closed-Scope Workstreams

| Workstream | Status | Next closeable slice | Done gate |
| --- | --- | --- | --- |
| Requirements decisions | `Shipped` | Keep this file cross-linked from owner docs as decisions evolve | `npm run test:docs`, `git diff --check` |
| In-app correction intake | `Gate added` | Backend correction-request storage/API and admin queue are in place; next slice is wiring the public station/in-app form entry | Backend tests, focused frontend tests, production search UI |
| Candidate lookup support | `Planned` | Add maintainer-only candidate evidence plan before wiring external services | Data-governance docs + sandbox/dry-run evidence |
| Batch lookup/print/export | `Monitoring` | Add fixtures only when real batch lists expose new separators, fit cases, or export gaps | Parser tests, print PDF QA, production batch/search QA |
| Low-noise UX | `Monitoring` | Improve only when production screenshots or user feedback show confusion | Production search UI screenshots |
| Physical print validation | `Deferred` | Resume only when printer/stock/QR-scan evidence is available | Physical checklist |
