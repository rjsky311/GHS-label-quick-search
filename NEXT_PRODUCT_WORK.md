# Next Product Work

This is the short live queue for autonomous product work. The canonical
planning entry point is `PROJECT_STATUS_AND_NEXT_PLAN.md`; read it first when
choosing what to do next.

Use `NEXT_REMAINING_PRODUCT_WORK.md` for detailed execution notes after the
current priority is chosen. Use `AUTONOMOUS_WORKFLOW.md` for standing approval,
stop conditions, verification, pushing, deployment, and production QA rules.

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
- Friendly to future brand visibility without putting ads, sponsor copy, or
  unrelated promotion inside safety-critical label content.

## Live Queue

Unless a fresh bug report, production screenshot, CI failure, security finding,
or user request points elsewhere, continue in this order:

1. Keep CI and production QA operationalization healthy. The GitHub Actions
   `Production Print QA` workflow now defaults to the product-level closure
   gate, with split modes for focused reruns.
2. Keep documentation consolidation and autonomous continuation hygiene healthy.
   `PROJECT_STATUS_AND_NEXT_PLAN.md` is the canonical planning entry point.
3. Physical print validation for real paper, label stock, printer scaling, QR
   scan success, and pictogram readability. The checklist now lives in
   `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`, and
   `npm run qa:physical-print-plan` generates the current physical-print work
   order from `build/print-qa-report.json`. The next implementation work is to
   use that generated work order on actual paper/stock and turn repeated
   findings into automated QA.
4. Data governance and safety boundaries for PubChem/ECHA/SDS/manual-reference
   flows. The policy now lives in
   `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`; the next implementation work is
   to keep source/QR/admin changes aligned with that policy and add tests when
   behavior changes.
5. User guidance, brand utility, low-noise UX, and narrow/mobile read-first
   polish.

## Current Detailed Backlog

The detailed five-block execution backlog lives in
`NEXT_REMAINING_PRODUCT_WORK.md`:

1. Print renderer and stock fit robustness.
2. Result table and GHS pictogram visual unity.
3. Trust, source, SDS, and safety boundaries.
4. Prepared solution and reprint workflow maturity.
5. Whole-product UX and brand-utility convergence.

Treat the older `NEXT_PRINT_WORKSTREAMS.md` and
`PRINT_OUTPUT_REFACTOR_PLAN.md` as v1.10 baseline context unless a new failure
proves the baseline needs to be reopened.

## Completion Rule

A product slice is not complete just because code or docs changed. Close each
slice with the relevant test/QA evidence, update the affected docs, and for
production-facing UI changes verify the deployed Zeabur frontend path before
claiming the work is stable.
