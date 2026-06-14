# QA Fixtures

This folder stores user-provided, review-only input files for repeatable QA.

## organic-inventory-2026-06-14.csv

- Source: user-provided organic chemical inventory CSV from 2026-06-14.
- Purpose: manual and scripted QA for batch lookup, batch print, export handoff,
  and print-layout stress cases.
- Current sampler scan: 1,103 CSV rows, 394 valid CAS-format rows,
  342 unique CAS values, 40 duplicate-CAS groups, and 7 invalid CAS rows.
- Boundary: this file is test evidence only. Do not treat names or Chinese names
  in this inventory as approved public dictionary data.

Repeatable sampling command:

```bash
cd frontend
npm run test:qa-scripts
npm run test:inventory-print-samples
npm run qa:inventory-print-samples
npm run qa:inventory-print-evidence
```

The sampler writes a review-only JSON and Markdown report under
`qa/evidence/<date>-inventory-print-sampling/`. Use the selected inventory rows
for representative batch lookup and print checks, then use the synthetic stress
cases for deterministic 8/9-pictogram and over-limit small-label layout checks.

`qa:inventory-print-evidence` converts the sampler report into actual print HTML
and PDF artifacts, then runs the same rendered PDF checks used by the main print
QA. Generated artifacts are intentionally kept under `frontend/build/`:

- `frontend/build/inventory-print-html-artifacts/`
- `frontend/build/inventory-print-pdf-artifacts/`
- `frontend/build/inventory-print-pdf-report.json`
