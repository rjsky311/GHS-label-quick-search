# PR #39 Pictogram Print And Export Hardening Evidence - 2026-06-22

This package records the release evidence for PR #39 after it was merged,
deployed by Zeabur, and verified on production.

The timestamps in copied machine reports are UTC. The package date uses the
owner's local checkpoint date in Asia/Taipei.

## Source

- PR: https://github.com/rjsky311/GHS-label-quick-search/pull/39
- PR title: `[codex] Harden GHS pictogram print and export checks`
- Merge commit:
  `2f81602cb3082b247a0527cf53e0cb0ed623c84a`
- PR merged at: `2026-06-21T16:58:59Z`
- Main CI run:
  https://github.com/rjsky311/GHS-label-quick-search/actions/runs/27911277790
- Production frontend: https://ghs-frontend.zeabur.app
- Production backend: https://ghs-backend.zeabur.app

## What Changed

PR #39 hardens the public print/export safety boundary:

- Text-only GHS data, meaning H/P statements or signal words without a
  renderable GHS pictogram, is review-required instead of printable for
  small-label flows.
- Export `Printable` status now requires renderable GHS pictograms, not only
  text-form GHS data.
- QR small labels and identification small labels keep complete identity:
  CAS, English name, trusted Chinese name, and GHS pictograms.
- Empty `pictograms: []` arrays no longer hide non-empty raw
  `ghs_pictograms`.
- Regression coverage was added for backend exports, frontend export preview,
  label stock normalization, print readiness, print output planning, print
  rendering, and production QA expectations.

## Local And PR Validation

Before merge, the branch was verified locally with:

```bash
npm test -- --runInBand
npm run test:print-contract
npm run test:i18n
npm run build
python -m pytest -q
git diff --check
```

An independent code-review subagent found no P0, P1, or P2 issues in the final
working-tree diff.

After merge, GitHub main CI passed for SHA
`2f81602cb3082b247a0527cf53e0cb0ed623c84a`:

- Frontend: passed.
- Backend: passed.

## Production Validation

Zeabur deployment freshness passed against the expected SHA:

- Service: `ghs-frontend`.
- Deployment ID: `6a381857e0cdac27161d5e81`.
- Status category: `fresh-running`.
- Deployment finished at: `2026-06-21T17:00:13.326Z`.
- Deployment commit SHA:
  `2f81602cb3082b247a0527cf53e0cb0ed623c84a`.

Production health passed:

- Frontend HTML, current Vite asset, and `build-info.json` were reachable.
- Frontend `build-info.json` matched the expected SHA.
- Backend `/api/health` was reachable and matched the expected SHA.

Production product QA passed:

- `production-smoke`: passed.
- `production-prepared`: passed.
- `production-batch-print`: passed.
- `production-summary`: passed.
- Summary: 8 reports present, 0 failed reports, 0 incomplete product blocks,
  0 actionable failures, 0 warnings.

Production product blocks were all green:

- Deployment freshness.
- Production availability.
- Print renderer stock fit.
- Result-table pictograms.
- Trust/source/SDS boundaries.
- Prepared solution reprint.
- Fixed-stock batch printing.
- Whole-product UX / brand utility.

Production print handoff covered and passed:

- Complete A4 primary.
- Missing responsible profile blocked state.
- Letter primary.
- Ethylene Oxide A4 continuation.
- Tube/vial identification small label.
- Brother 62 mm QR supplement.

Prepared production print QA covered 9/9 cases across complete, QR, and
identification outputs, including reprint and preset reuse.

Batch-print production QA passed on the default 51-CAS fixture:

- 51 valid unique CAS values submitted.
- Export preview surfaced 22 columns including data state, printable,
  review-required, review reasons, review signal count, primary review action,
  multiple-GHS status, and classification selection.
- Batch print selected 39 complete labels on A4 Primary with 0 excluded.

## Reports

Reports copied from `frontend/build/` after production QA:

- `reports/zeabur-deployment-report.json`
- `reports/production-health-report.json`
- `reports/production-print-bundle-report.json`
- `reports/production-search-ui-report.json`
- `reports/production-print-smoke-report.json`
- `reports/production-prepared-print-report.json`
- `reports/production-batch-print-report.json`
- `reports/production-print-qa-summary.json`
- `reports/production-product-qa-report.json`

## Interpretation

The PR #39 software release is production-ready for the deployed web
application, API health, print modal flows, export trust columns, and automated
browser-based production QA.

This evidence does not certify physical paper output. Real A4/Letter paper,
70 x 24 mm identification labels, 62 x 40 mm QR labels, printer scaling,
thermal quality, QR scanning, and pictogram readability still require the
separate physical print validation slice.
