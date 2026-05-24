# Lab-Ready Pilot 95 Plan

This is the owner document for moving GHS Label Quick Search from the current
productized baseline to a 95% lab-ready pilot. Read
`PROJECT_STATUS_AND_NEXT_PLAN.md` first for the canonical project entry point,
then use this file when choosing work that should move the product toward the
next major target.

The target is not "more features." The target is a daily-use pilot that a real
lab can repeat without a developer watching every step:

> A lab user can paste a batch of chemicals, quickly know what can be used and
> what needs confirmation, confirm the needed items, then reliably print one of
> the three supported label outputs or export trust-preserving data. Data
> problems can be reported and tracked, and uncertain data is never presented as
> verified.

## Status Model

Use these labels when updating this file:

| Status | Meaning |
| --- | --- |
| `Open` | Required for the 95% target and not yet started. |
| `Planned` | Direction is clear, but implementation has not started. |
| `In progress` | Active implementation or QA work exists. |
| `Gate added` | A repeatable test, script, or checklist now catches regressions. |
| `Shipped` | Implemented, verified, pushed, deployed where relevant, and documented. |
| `Monitoring` | Stable enough for the pilot target; add cases when new evidence appears. |
| `Deferred` | Explicitly outside the 95% target. |

The current overall status is `In progress`. The batch-output confidence loop
has shipped, but the 95% target still needs a focused real-batch QA fixture,
lower-noise workflow polish, and a final acceptance audit against this file.

## Scope

The 95% Lab-Ready Pilot includes:

- Realistic 50-100 item batch lookup, review, print, and export confidence.
- The simplified three-output label model:
  - Complete A4/Letter label.
  - QR small label.
  - Identification small label.
- Clear review reasons and row-level next actions.
- Multiple-GHS classification confirmation that carries into print and export.
- Trust-preserving CSV/XLSX exports.
- Public correction intake and admin/candidate review boundaries.
- Low-noise UI copy that tells users the next step.
- Repeatable local, CI, and production QA gates.

The 95% Lab-Ready Pilot excludes:

- Real-printer and real-stock validation.
- Complete multi-brand label-printer support.
- A large admin back-office product.
- External LLM, Wikidata, or scientific-skill writes into public data.
- Legal compliance certification.
- Advertising, promotion, or brand conversion content inside safety labels.
- Additional public label sizes.

## Workstream 1: Real Batch Workflow Hardening

Status: `In progress`.

Goal: a user can paste a realistic 50-100 item list and understand the batch
without learning the internal data model.

Current evidence:

- Batch input normalization, duplicate handling, invalid-CAS diagnostics, and
  production messy-paste QA exist.
- Batch result summary exposes found, printable, review, and export counts.
- Review reason chips can filter result rows.
- Multiple-GHS review is separated from true source-conflict correction.
- Export rows preserve review and multiple-GHS trust state.
- `qa:production-lab-ready-batch` now runs the deployed batch print gate with a
  named `lab-ready` fixture based on a messy 50-100 item lab list, including
  duplicates and an invalid-looking CAS value.
- The first full production run of that fixture passed with 90 pasted values,
  80 submitted unique valid CAS values, 76 label-ready rows, 20 review rows,
  duplicate/invalid diagnostics, review-reason distribution, export trust
  columns, multiple-GHS warning state, and fixed-stock print handoff.

Required pilot behavior:

- Accept real pasted lists with mixed separators, duplicates, invalid CAS, and
  not-found values.
- Show total, submitted, found, printable, exportable, review, and excluded
  counts in a low-noise summary.
- Classify review reasons at least as:
  - unresolved search
  - no GHS data
  - GHS text without pictograms
  - missing trusted Chinese name
  - source conflict
  - multiple GHS classifications needing primary confirmation
  - upstream transient failure
- Let users filter or jump from each review reason to affected rows.
- Show whether the selected classification is system-suggested or manually
  confirmed.
- Carry the selected classification into print, export, and detail surfaces.

Acceptance criteria:

- A 50-100 item lab-style fixture runs through production QA.
- The production report records batch counts, review reason distribution,
  export trust columns, and multiple-GHS pre-print warning state.
- A maintainer can use the report to identify which class of issue failed
  without opening the app manually first.

Next implementation slices:

1. Keep `npm run qa:production-lab-ready-batch` as the heavy deployed closure
   gate after batch/search/label changes.
2. Add screenshot or report summary review to make failures easier to inspect
   without reading the full JSON body.
3. Re-run this fixture after any production deployment that changes search,
   result review state, export trust columns, or label print handoff.

## Workstream 2: Three Label Outputs Stabilization

Status: `Monitoring`.

Goal: the three supported outputs stay readable and stable without reopening
the old stock/template sprawl.

Current evidence:

- `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` pins the three public outputs.
- `PRINT_LABEL_CONTRACT.md` pins non-omission of available GHS pictograms.
- `npm run test:print-contract`, `npm run qa:print-pdf`, and
  `npm run qa:production-batch-print` cover the main renderer paths.
- A4/Letter complete labels, QR small labels, and identification small labels
  are implemented.

Required pilot behavior:

- Complete A4/Letter labels include CAS, English name, trusted Chinese name
  when available, all available GHS pictograms, full H/P text, responsible
  profile, and a QR lookup link.
- QR small labels include CAS, English name, trusted Chinese name when
  available, all available GHS pictograms, and QR. They do not include H/P.
- Identification small labels include CAS, English name, trusted Chinese name
  when available, and all available GHS pictograms. They do not include QR or
  H/P.
- Small labels use same-output continuation labels when they cannot fit. They
  do not silently omit CAS, names, QR where required, or pictograms.
- Long names and descenders such as `p`, `y`, and `j` remain readable.

Acceptance criteria:

- Print PDF QA includes representative dense, long-name, multilingual, and
  batch cases for all three outputs.
- Production batch print QA exercises complete and small-output confidence or
  links to focused gates that do.
- New print fixes are driven by PDF, screenshot, or QA evidence, not by
  reopening broad layout preferences.

Next implementation slices:

1. Review print PDF artifacts for the three output types and record any
   evidence-backed readability regressions.
2. Add focused fixtures before changing renderer rules.
3. Keep physical-printer validation deferred to
   `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`.

## Workstream 3: Data Trust And Correction/Admin Queue

Status: `Monitoring`.

Goal: data uncertainty becomes a reviewable workflow instead of a dead end or a
false assurance.

Current evidence:

- The shared data-quality model distinguishes upstream error, unresolved
  search, no GHS data, GHS text without pictograms, source conflict, multiple
  classifications, and missing trusted Chinese names.
- Public correction intake writes bounded records to the backend pilot/admin
  store.
- Admin review can record candidate evidence and create pending manual-entry
  review records.
- Candidate evidence is sanitized and forced to review-only flags.
- Approved manual entries and aliases are the only curated records that affect
  public lookup, labels, and exports.

Required pilot behavior:

- Missing trusted Chinese names are visible but not misrepresented as
  verified.
- No-GHS and upstream transient failure states are separate.
- Multiple-GHS states are visible and not collapsed into generic source
  conflict.
- Every data-quality issue that should become maintenance work has a correction
  or admin-review path.
- Candidate data never changes public lookup, labels, QR targets, or exports
  until it is approved into a curated record.

Acceptance criteria:

- Backend tests cover correction request creation, admin status update, safe
  candidate payloads, and approved-only public data behavior.
- Production search UI QA covers missing Chinese name, no-GHS, source
  conflict, unresolved search, export trust columns, and multiple-GHS action
  visibility.
- The admin dashboard lets a maintainer understand open corrections,
  candidates, and converted pending manual-entry records.

Next implementation slices:

1. Add new correction/admin cases only when a real data issue or QA gap appears.
2. Avoid external discovery integration until a scope, cost, and source-quality
   decision is recorded.
3. Keep `CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md` as the boundary for future
   external suggestions.

## Workstream 4: Low-Noise Next-Step UX

Status: `In progress`.

Goal: the user sees the next action, not the internal architecture.

Current evidence:

- Result summaries and print modal copy have moved toward task-first language.
- Review reason chips and row actions exist.
- The print modal exposes three outputs instead of the old first-level purpose
  and stock sprawl.
- Batch results now include a first-class recommended next-action panel that
  tells the user whether to review affected rows first, print ready rows, or
  check the CAS list.
- Unit tests cover both the review-first CTA and the print-ready CTA.
- Production batch/search QA scripts now collect the next-action labels so the
  low-noise batch workflow cannot silently disappear after deployment.
- A local browser smoke run against the built app, with mocked backend search
  results, verified that the batch next-action panel, CTA, row count, and
  review-reason list render together in the real page.

Required pilot behavior:

- Batch summary uses user-facing concepts:
  - can print now
  - confirm main GHS version
  - missing Chinese name
  - not found
  - source differs; verify with SDS or supplier label
  - temporary upstream failure
- Technical labels such as internal state, reduced scope, continuation,
  classification selection, and trust state are either hidden, explained, or
  reserved for details/export/admin surfaces.
- Correction dialogs tell the user what will happen after submission.
- Detail modal multiple-GHS controls explain why the choice matters and where
  it is used.
- Export preview clearly states that the export preserves review/trust context.

Acceptance criteria:

- A user can identify the next action from the batch result page without
  opening docs.
- Production search UI screenshots show no obvious first-screen noise or
  vertical/overflow text risks in the batch/result path.
- Tests or QA scripts pin the most important next-action labels.

Next implementation slices:

1. Deploy the next-action batch result panel, then run
   `npm run qa:production-search-ui` and
   `npm run qa:production-lab-ready-batch` against the current asset.
2. Review the print modal, export preview, and correction dialog for any
   remaining internal wording that should be converted into task language.
3. Add screenshots or compact report excerpts for the batch next-action panel
   if production failures are still hard to triage from JSON alone.

## Workstream 5: QA, Docs, And Maintenance Loop

Status: `In progress`.

Goal: future work can continue from repo evidence instead of chat memory.

Current evidence:

- CI, production health, production search UI, production batch print,
  print-contract, print-PDF, docs drift, and backend tests exist.
- `PROJECT_STATUS_AND_NEXT_PLAN.md` is the canonical project entry point.
- `PRODUCT_SCOPE_GATE.md` captures broad-scope alignment before implementation.
- `AUTONOMOUS_WORKFLOW.md` defines the next-step re-rank loop.

Required pilot behavior:

- The canonical project plan names the 95% target and links to this file.
- The live queue names the active 95% slice rather than a stale workstream.
- Docs drift includes this file so the target cannot disappear silently.
- Closure uses a requirement-by-requirement audit instead of "tests passed."
- Production freshness is verified with an asset marker when frontend changes
  ship.

Acceptance criteria:

- `npm run test:docs` verifies this file exists and stays discoverable.
- `git diff --check` stays clean.
- Any future frontend-facing 95% work runs the relevant production gate.
- The final 95% closure report lists evidence for all five workstreams.

Next implementation slices:

1. Wire this file into the canonical docs and docs drift check.
2. Re-rank `NEXT_PRODUCT_WORK.md` around this target.
3. Add a final 95% audit checklist section once the lab-ready batch QA fixture
   exists.

## Required Gates For 95% Closure

Do not call the 95% target complete until the current state has evidence for
all relevant gates below:

- `git diff --check`
- `npm run test:docs`
- `npm test -- --runInBand`
- `npm run test:i18n`
- `npm run build`
- `npm run test:print-contract`
- `PRINT_QA_PRINT_HTML_DIR=build/print-html-artifacts npm run qa:print-report`
- `npm run qa:print-pdf`
- `python -m py_compile server.py`
- `python -m pytest test_name_search.py -v`
- GitHub Actions `CI` on the shipped commit
- `npm run qa:production-health` with a marker proving the deployed asset is
  current when frontend code changed
- `npm run qa:production-search-ui`
- `npm run qa:production-batch-print`
- `npm run qa:production-lab-ready-batch`
- `npm run qa:production-product` when closing the whole target, allowing a
  generous timeout because it runs multiple deployed flows

## Final Completion Audit

Before this target is marked complete, collect evidence for each line:

- Realistic 50-100 item batch fixture exists and is used by a repeatable gate.
- Batch summary exposes counts and review reason distribution.
- Review reasons can locate affected rows.
- Multiple-GHS states distinguish system-suggested from user-confirmed.
- Print and export use the same selected classification.
- Three outputs remain the only public label choices.
- Small labels never silently omit required identity, QR where required, or
  available GHS pictograms.
- CSV/XLSX exports preserve review/trust state.
- Correction/admin queue receives data-quality issues and keeps candidates
  review-only until approved.
- UI copy leads with next actions instead of internal state.
- Docs and QA explain how a future agent should continue without chat memory.
- Physical print validation remains explicitly deferred, not accidentally
  claimed as done.
