# Next Product Work

This is the short live queue for autonomous product work. The canonical
planning entry point is `PROJECT_STATUS_AND_NEXT_PLAN.md`; read it first when
choosing what to do next.

Use `NEXT_REMAINING_PRODUCT_WORK.md` for detailed execution notes after the
current priority is chosen. Use `AUTONOMOUS_WORKFLOW.md` for standing approval,
stop conditions, verification, pushing, deployment, and production QA rules.
For the next label-printing refactor, use
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md` as the active product contract.
For broad or ambiguous product decisions, use `PRODUCT_SCOPE_GATE.md` before
implementation so the goal, non-goals, acceptance criteria, and verification
gates are explicit.

## Product North Star

This project is a free public GHS utility that should help lab and operations
users quickly search chemicals, understand hazard classifications, preview the
right label output, and print usable labels without becoming print-layout
experts.

The product should be:

- Useful before it is promotional.
- Trustworthy before it is clever.
- Visually calm, clear, and easy to scan.
- Honest about supplemental labels versus complete primary labels.
- Simple in label printing: three user-facing outputs instead of exposing
  internal print-planning concepts.
- Friendly to future brand visibility without putting ads, sponsor copy, or
  unrelated promotion inside safety-critical label content.

## Live Queue

Unless a fresh bug report, production screenshot, CI failure, security finding,
or user request points elsewhere, continue in this order:

Current mode:

- CI / production QA and documentation consolidation are in **maintenance**
  state: keep them healthy, but do not treat them as unfinished product work
  unless a gate fails or a workflow assumption changes.
- Physical print validation is **deferred** until real paper, stock, printer,
  and QR-scan evidence can be collected.
- While physical printing is deferred, fixed-stock batch label printing is now
  in gate/monitoring state. The default active continuation targets are data
  governance / safety boundaries, low-noise UX, and narrow/mobile polish. Track
  non-physical-print work in `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`;
  use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` before changing batch behavior.
- The product simplification decision for label printing is now the active
  implementation baseline: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` supersedes the
  old first-level print UI model. Keep future print work inside the three
  outputs before adding more stock, purpose, density, or front-label options.
- Current print closure item from 2026-05-18: the A4/Letter complete-primary
  overflow fix is deployed and covered by `test:print-contract`,
  `qa:print-pdf`, `qa:production-batch-print`, and `qa:production-primary`.
  Keep monitoring this class of issue, but return the default continuation
  target to data governance / safety boundaries and low-noise UX polish.
- Completed current slice: batch search input is normalized, deduplicated, and
  checked for CAS format/checksum before the backend call. The UI summarizes
  ignored duplicates and invalid entries early, because bad batch input is a
  major source of later label-print confusion. The parser now also accepts
  same-line space-separated CAS values with `CAS No.` / `CAS:` prefixes without
  splitting the spaces that belong inside one CAS token. The batch panel now
  names the exact valid unique CAS count that will be submitted. The same
  normalized CAS path now feeds search history and bounded frontend
  observability, so duplicate or invalid raw paste content does not leak into
  later diagnostics. `qa:production-search-ui` now covers that deployed
  messy-paste path, including the ready summary, duplicate/invalid diagnostics,
  and enabled search handoff.
- Completed current slice: the production search UI gate now covers the QR
  return path by opening the deployed app with `?cas=<CAS>`, checking that the
  single-search input hydrates, and verifying the matching result row appears.
  QR labels therefore stay connected to a real lookup path, not just a
  printable QR bitmap.
- Completed current slice: Chinese-name display now uses a shared trust helper
  across localized names, favorites/history/autocomplete, prepare-solution
  summaries, print preview/scoring, printed labels, export preview, backend
  export payloads, and frontend CSV fallback. English-only placeholders are
  omitted instead of being shown as Chinese.
- Completed current slice: missing trusted Chinese names now have a contextual
  Detail correction link that pre-fills CAS and English-name evidence context.
  The admin manual-entry UI also blocks English-only `name_zh` before submit,
  matching the backend validation boundary. `qa:production-search-ui` now
  includes a mocked production check for that correction path.
- Completed current slice: admin manual dictionary entries now carry review
  status (`approved`, `pending`, `needs_evidence`, `rejected`). Only approved
  manual entries affect public lookup, display names, labels, or exports;
  pending/needs-evidence rows remain visible for admin curation and dictionary
  snapshot review.
- Completed current slice: data-quality issue links are now shared across
  result rows and Detail for missing Chinese names, no-GHS data gaps,
  text-only GHS without pictograms, and source-conflict review. Upstream
  transient failures remain retry states and do not become correction links.
  The production search UI gate now asserts those correction links keep their
  data-correction template and CAS context.
- Completed current slice: Detail same-chemical comparison now shows compact
  source/ranking evidence for each public classification: current selection,
  report count, source family, and pictogram/H/P coverage. The same evidence is
  rendered in desktop tables and narrow cards, with `qa:production-search-ui`
  checking deployed coverage.
- Completed current slice: dictionary miss telemetry now has an admin review
  closure path. The dashboard can mark captured misses as resolved with CAS,
  needs-evidence, or ignored, and duplicate capture preserves already reviewed
  non-open rows.
- Completed current slice: miss-query retention/export scope is now enforceable.
  Admin reports show purgeable stale rows, the dashboard and maintainer CLI can
  clean stale telemetry, and dictionary exports redact miss-query context unless
  explicitly requested.

1. Data governance and safety boundaries for PubChem/ECHA/SDS/manual-reference
   flows. Use this as the active continuation target while physical printing is
   deferred. The policy lives in `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`;
   the detailed future tracker lives in
   `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`. The optional external
   scientific-skill evaluation lives in
   `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`; do not install the full
   `scientific-agent-skills` repo, and only reopen its whitelist for
   maintainer-side data lookup or evidence gathering. Keep source/QR/admin
   changes aligned with that policy and add tests when behavior changes. Keep
   missing Chinese names as a curation issue, not a display fallback that
   repeats English; missing-name correction links should remain evidence-first
   and admin-reviewed.
   Current baseline includes effective-classification source/report-count
   alignment, export-preview/CSV/XLSX trust columns, and contextual
   data-quality correction links. Detail comparison now also exposes
   source/ranking evidence directly beside alternate classifications.
2. Harden and monitor the simplified three-output label workflow in
   `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`: complete A4/Letter label, QR small
   label, and identification small label. New work should improve QA,
   production verification, batch coverage, or visual polish without
   reintroducing old first-level complexity. Immediate focus: complete A4/Letter
   dense-content pagination must stay verified in PDF and deployed production
   QA.
   Current related follow-up: keep the simplified batch input path covered in
   regression QA so only valid, unique CAS values feed batch results, history,
   telemetry, and print counts; add new messy-paste fixtures when real batch
   lists expose another separator or formatting pattern. The current deployed
   production-search UI gate already checks same-line CAS, `CAS No.` / `CAS:`
   prefixes, duplicates, and invalid checksum examples. It also checks
   `?cas=` hydration so QR labels scan back into the single-search workflow.
3. Keep CI and production QA operationalization healthy. The GitHub Actions
   `Production Print QA` workflow now defaults to the product-level closure
   gate, with split modes for focused reruns.
4. Keep documentation consolidation and autonomous continuation hygiene healthy.
   `PROJECT_STATUS_AND_NEXT_PLAN.md` is the canonical planning entry point, and
   `PRODUCT_SCOPE_GATE.md` is the project-level alignment process for broad
   slices where "what good looks like" is not already explicit.
5. Fixed-stock batch label printing. Keep this in monitoring unless a new
   screenshot, QA failure, or product change reopens it. The current baseline
   supports one physical stock, Quick ID / Supplemental / Complete purpose,
   per-item fit results, representative previews, acknowledged
   reduced/continuation scope, PDF artifact coverage for a 50-item Quick ID
   batch, and deployed `qa:production-batch-print` / `qa:production-product`
   evidence. Future changes should converge toward the simplified batch rules:
   one output type, one stock, and same-output continuation labels.
6. Physical print validation for real paper, label stock, printer scaling, QR
   scan success, and pictogram readability. The checklist now lives in
   `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`, and
   `npm run qa:physical-print-plan` generates the current physical-print work
   order from `build/print-qa-report.json`. Real-printer execution is deferred
   until physical stock and printer access are available.
7. User guidance, brand utility, low-noise UX, and narrow/mobile read-first
   polish. Search-result and detail-comparison read-first layouts are now
   covered at 390px by `qa:production-search-ui`; the same production gate
   also checks Detail/Prepare Solution modal keyboard containment. Keep
   extending that gate when mobile, narrow, or modal behavior changes.

## Current Detailed Backlog

The detailed execution backlog lives in
`NEXT_REMAINING_PRODUCT_WORK.md`:

1. Print renderer and stock fit robustness.
2. Result table and GHS pictogram visual unity.
3. Trust, source, SDS, and safety boundaries.
4. Prepared solution and reprint workflow maturity.
5. Whole-product UX and brand-utility convergence.
6. Fixed-stock batch label printing, tracked in
   `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
7. Optional scientific lookup skill trials, tracked in
   `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`.
8. Product scope gate decisions, tracked in `PRODUCT_SCOPE_GATE.md` when a
   future slice needs pre-implementation alignment.

Treat the older `NEXT_PRINT_WORKSTREAMS.md` and
`PRINT_OUTPUT_REFACTOR_PLAN.md` as v1.10 baseline context unless a new failure
proves the baseline needs to be reopened.

## Completion Rule

A product slice is not complete just because code or docs changed. Close each
slice with the relevant test/QA evidence, update the affected docs, and for
production-facing UI changes verify the deployed Zeabur frontend path before
claiming the work is stable.
