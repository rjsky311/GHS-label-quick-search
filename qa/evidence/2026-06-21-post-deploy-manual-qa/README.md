# Post-Deploy Manual-Directed QA Evidence - 2026-06-21

This package captures the production evidence gathered after PR #38 was merged
and deployed to Zeabur.

Production SHA:
`0455d721ce883be6332cc0fee41d6b8379712040`

Top-level checkpoint:
`POST_DEPLOY_QA_CHECKPOINT_2026_06_21.md`

## Reports

Reports are copied from `frontend/build/` at the end of the production QA run:

- `reports/zeabur-deployment-report.json`
- `reports/production-health-report.json`
- `reports/production-search-ui-report.json`
- `reports/production-batch-print-report.json`
- `reports/production-product-qa-report.json`
- `reports/production-print-qa-summary.json`
- `reports/production-prepared-print-report.json`
- `reports/production-print-smoke-report.json`
- `reports/github-resource-report.json`

Key results:

- Zeabur deployment freshness: passed, `fresh-running`.
- Production health: passed, frontend and backend build metadata matched the
  expected SHA.
- Production search UI: passed.
- Production batch print: passed.
- Production product QA: passed, 0 failed reports and 0 incomplete product
  blocks.
- GitHub resource patrol: passed with no warnings or failures.

## Screenshot Sets

Search UI:

- `screenshots/search-ui/search-results.png`
- `screenshots/search-ui/detail-modal-classification-comparison.png`
- `screenshots/search-ui/search-results-mobile-read-first.png`
- `screenshots/search-ui/search-results-no-ghs-state.png`
- `screenshots/search-ui/batch-input-normalization.png`

Print smoke:

- `screenshots/print-smoke/a4-primary.png`
- `screenshots/print-smoke/a4-primary-profile-blocked.png`
- `screenshots/print-smoke/ethylene-oxide-a4-primary-continuation.png`
- `screenshots/print-smoke/tube-vial-quick-id.png`
- `screenshots/print-smoke/brother-62mm-qr-supplement.png`

Prepared print:

- `screenshots/prepared-print/prepared-a4-primary.png`
- `screenshots/prepared-print/prepared-qr-supplement.png`
- `screenshots/prepared-print/prepared-tube-quick-id.png`
- `screenshots/prepared-print/prepared-reprint-a4-primary.png`

## Manual-Directed Content Spot Check

The production API was spot checked for:

- Hydrochloric acid (`7647-01-0`)
- Sulfuric acid (`7664-93-9`)
- Ethanol (`64-17-5`)
- Methanol (`67-56-1`)
- Ethylene Oxide (`75-21-8`)

The primary production label paths passed the placeholder check for these
owner-facing cases. However, two alternate classification hazard statements
still contain Traditional Chinese placeholder text:

- Methanol alternate classification: `H360FD`.
- Ethylene Oxide alternate classification: `H360Fd`.

Those gaps are recorded as the next P1 issue in
`POST_DEPLOY_QA_CHECKPOINT_2026_06_21.md`.

## Interpretation Boundary

This package proves deployed browser/API behavior and screenshot-based output
states. It does not prove real paper, printer scaling, thermal label quality,
or QR scan reliability. Physical print validation remains a separate evidence
slice.
