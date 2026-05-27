# Post-95 Reprioritization

Read `PROJECT_STATUS_AND_NEXT_PLAN.md` first. This document records the
post-95% re-rank after `LAB_READY_PILOT_95_PLAN.md` reached `Shipped`.

This is a decision packet, not a second canonical roadmap. Use it to choose the
next target after the 95% Lab-Ready Pilot closure, then keep the short live
queue in `NEXT_PRODUCT_WORK.md` aligned with the chosen target.
The owner doc produced from this decision is `PILOT_OPERATIONS_READY_PLAN.md`,
with the operator checklist in `PILOT_RUNBOOK.md`. That target is now shipped
as the post-95 pilot-operations baseline.
The short-term follow-up
`PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` also shipped. The Batch-First
follow-up target after that evidence pass is
`BATCH_FIRST_LAB_PILOT_V1_PLAN.md`; it has since moved to
`Shipped / Monitoring` and now serves as the evidence baseline for new
monitoring-driven slices.

## Re-Rank Trigger

The 95% Lab-Ready Pilot target is closed: local gates, GitHub CI, and Zeabur
production QA are green. The next decision should not continue label-printing,
admin tooling, or QA hardening by inertia.

The current risk has changed:

- Before 95%: the main risk was whether core batch/search/print/export paths
  could be made stable enough for repeated lab use.
- After 95%: the main risk is whether a small real pilot produces actionable
  evidence, data corrections, and maintenance work without requiring the user
  or developer to manually inspect every step.

## Recent Workstream Audit

The last 20 commits were reviewed by category:

| Category | Representative commits | What improved |
| --- | --- | --- |
| 95% closure and docs | `1ff7dfc`, `1e33f82`, `f4fffa1`, `876a031` | The 95% target now has a durable owner doc, closure evidence, and current production gate results. |
| Batch/result UX and trust loop | `a40dbf0`, `06d2901`, `cdf35d2`, `dc21225`, `6f23f9d` | Batch summaries, review reasons, filtered scope, export trust context, and multiple-GHS warnings became more user-visible. |
| Production QA and deployment reliability | `bbeb3ab`, `8c4362f`, `c851715`, `28e0b7e`, `a2716f8`, `81fe2e2` | Production health, transient 502 handling, asset marker checks, manual CI dispatch, and Zeabur redeploy fallback became repeatable. |
| Data governance and candidate discovery | `8d41350`, `6b98796`, `8948379` | Candidate discovery is dry-run, maintainer-only, and review-only before public data can change. |
| Collaboration workflow | `6cb9068`, `a69ee30` | The project now has a dynamic next-step re-rank loop and proactive insight habit. |

User-visible value created:

- A realistic batch can be processed with clearer review state.
- Three label outputs and exports are guarded by repeatable QA.
- Data-quality issues can enter correction/admin review instead of staying in
  chat.

Risk reduced:

- Production deploys are less likely to look green while serving a stale asset.
- Candidate data is less likely to leak into public labels/exports without
  review.
- Future work is less likely to drift without a scope gate.

Surface not improved enough:

- The product still lacks a focused small-pilot operating loop: what a pilot
  maintainer checks daily, what metrics count as healthy, what issues should be
  fixed first, and how real correction/admin queue evidence turns into the next
  product slice.

## Re-Ranked Priorities

### P0. Blockers Always Override

Continue to handle these before any planned target:

- Failing CI or production deployment.
- 502/health failure.
- Safety-critical print regression.
- Security, privacy, storage-abuse, or data-loss issue.
- User-provided screenshot/PDF proving a core job is broken.

### P1. Small Pilot Observation And Operator Loop

Status: shipped baseline.

Goal: let a small lab pilot run with low developer supervision, while making
the resulting problems visible and actionable.

Why this is first:

- The 95% gates prove the app can pass controlled scenarios.
- The next maturity jump depends on observing real usage, not adding more
features blindly.
- Correction/admin flows exist, but the operator loop needed to become a
  first-class shipped baseline before later monitoring slices could be chosen
  from evidence.

User-facing outcome:

- A pilot user can use the product normally.
- A maintainer can inspect a compact pilot status and know whether the next
  work should be data quality, batch UX, export usability, print QA, or
  production reliability.

Non-goals:

- Real printer/stock validation.
- More public label sizes.
- Runtime LLM or external-source writes into public data.
- Brand monetization or conversion experiments.
- A large admin back-office product.

Acceptance criteria:

- There is a pilot runbook that says what to test, what to record, and when a
  finding becomes a bug, data correction, product request, or deferred physical
  print issue.
- Admin/reporting surfaces can answer the pilot maintenance questions:
  open corrections, candidate-found items, pending manual entries, unresolved
  searches, missing trusted Chinese names, no-GHS states, source conflicts, and
  recent production health.
- Existing production gates remain green after any pilot-loop change:
  `qa:production-health`, `qa:production-search-ui`, and
  `qa:production-lab-ready-batch`.
- No pilot telemetry or correction path stores unnecessary personal data.

First implementation slices:

1. Create a pilot runbook and daily/weekly operator checklist.
2. Audit admin/observability reports against the pilot maintenance questions.
3. Fill only the smallest reporting gaps needed to make pilot triage possible.
4. Add or update tests for any new report field, queue count, or dashboard
   action.
5. Run production health/search/batch gates if a frontend or deployed flow
   changes.

### P2. Data Quality Expansion With Review-Only Candidates

Goal: improve chemical identity and Chinese-name coverage without weakening
the review boundary.

Why this is second:

- Missing or questionable Chinese names are one of the most likely real pilot
  issues.
- Candidate discovery tooling already exists in dry-run form.
- Better data quality directly improves search, labels, and export.

Non-goals:

- Do not auto-approve LLM, Wikidata, PubChem synonym, NCI, EPA CompTox, or
  scientific-skill output.
- Do not bulk replace the Gemini-generated seed dictionary without a dedicated
  review project.
- Do not add a paid/API-key source without an explicit dependency decision.

Acceptance criteria:

- Candidate evidence bundles stay review-only.
- Admin can distinguish approved, pending, needs-evidence, rejected, and
  candidate-found records.
- Public lookup, labels, QR targets, and exports use only approved curated
  data plus the current accepted seed dictionary.

First implementation slices:

1. Use the pilot loop to identify actual missing-name and unresolved-search
   examples.
2. Run the dry-run candidate discovery path on those examples.
3. Improve candidate evidence display or queue handling only where the
   maintainer cannot decide the next action.

### P3. Batch Export Utility And Downstream Spreadsheet Fit

Goal: make exports feel like a practical lab-management output, not just a raw
table dump.

Why this is third:

- The user priority order is batch lookup, label printing, export, then data
  correction and single lookup polish.
- Print has received heavy recent attention; export should now be reviewed from
  the downstream user's perspective.
- Trust columns exist, but the product should confirm whether the export is
  actually easy to use for cleanup, inventory, label planning, and review.

Acceptance criteria:

- Users can tell whether they are exporting all results, visible filtered
  results, printable items, or review-needed items.
- Exported files preserve trust/review state without overwhelming ordinary
  users.
- Spreadsheet output is safe from formula injection and remains readable.

First implementation slices:

1. Review current CSV/XLSX columns from a lab-manager perspective.
2. Decide whether export needs a summary sheet, filtered export modes, or
   clearer filename/scope labels.
3. Add tests for any changed export contract.

### P4. Low-Noise UX And Narrow Read-First Polish

Goal: improve daily usability only where pilot evidence or production
screenshots show confusion.

Why this is fourth:

- Broad UX polish can expand forever.
- The product already has task-first copy and production search UI coverage.
- The next UX work should be evidence-triggered: confusing next actions,
  unclear review reasons, mobile/narrow reading breaks, or excessive
  implementation language.

Acceptance criteria:

- A first-time user can complete search, review, print/export, and correction
  intake without reading internal docs.
- Narrow screens remain read-first and do not introduce horizontal scrolling
  in core search/detail paths.
- Complex modal keyboard paths stay trapped and predictable.

### P5. Physical Print Validation

Status: deferred until physical stock and printer access exist.

Goal: prove browser/PDF output survives real paper, real printer margins,
label stock, thermal resolution, and QR scanning.

Why this is not first:

- It remains essential for 100% maturity.
- It cannot be honestly completed without physical materials.
- Automated PDF and production gates are strong preconditions, not proof.

Acceptance criteria:

- `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md` is executed against real printer,
  stock, and QR-scan evidence.
- Repeated manual failures become renderer rules, tests, or checklist items.

### P6. Brand, Support, And Conversion Experiments

Goal: keep the free utility trustworthy while allowing future visibility and
support funnels outside safety-critical label content.

Why this is last:

- The tool's trust depends on useful safety workflow first.
- Brand/support surfaces are already bounded.
- Conversion experiments should wait until pilot usage clarifies what users
  actually need.

## Shipped Next Target

This target is now the post-95 baseline:

> Build the small pilot observation and operator loop so real trial usage
> produces clear maintenance decisions instead of another open-ended backlog.

Recommended first slice:

1. Add a pilot runbook and operator checklist.
2. Audit current admin/report outputs against the pilot checklist.
3. Name any missing report fields or dashboard actions as the next
   implementation slice.

Shipped owner docs:

- `PILOT_OPERATIONS_READY_PLAN.md` - shipped target definition and completion
  audit.
- `PILOT_RUNBOOK.md` - pilot operator and maintainer checklist.

Shipped short-term follow-up:

- `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` - representative pilot
  evidence, data-quality next-step selection, export usability check,
  maintainability boundaries, and historical-doc cleanup.

Active major follow-up:

- `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` - batch-first lab pilot workflow:
  batch review flow, three-output batch label confidence, batch export,
  correction/admin triage, and one maintainability slice.

## Verification Plan For The Re-Rank Itself

This document-only re-rank is complete when:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` points to this file as the post-95 decision
  packet.
- `NEXT_PRODUCT_WORK.md` records the evidence-triggered live queue and the
  shipped target references needed to choose the next slice.
- `AGENTS.md`, `CLAUDE.md`, and `README.md` no longer describe the 95% target
  as unfinished.
- `npm run test:docs` passes.
- `git diff --check` passes.
