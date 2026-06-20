# QA Fixtures

This folder stores sanitized, review-only input files for repeatable QA.

## organic-inventory-2026-06-14.csv

- Source: synthetic inventory-shaped CSV derived from the 2026-06-14 QA
  need. It preserves parser and layout stress characteristics without
  publishing real inventory rows.
- Purpose: manual and scripted QA for batch lookup, batch print, export handoff,
  and print-layout stress cases.
- Current sampler scan: 13 CSV rows, 10 valid CAS-format rows, 9 unique CAS
  values, 1 duplicate-CAS group, and 2 invalid CAS rows.
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
