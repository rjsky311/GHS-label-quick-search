# H-Code Wording Closure Evidence - 2026-06-21

This package records the production proof for closing the H360 variant
Traditional Chinese wording gap found in the post-deploy manual-directed QA
checkpoint.

## Source

- Original finding:
  `POST_DEPLOY_QA_CHECKPOINT_2026_06_21.md`
- Fix commits:
  - `9f868deda22626e6def370d93baf151c66cdba55`
    (`Cover H-code wording variants`)
  - `4cf0aa589e43de60e8c816e635c1e3b16e17e0e3`
    (`Record H-code wording coverage slice`)
  - `d0659b9e79496a37fdca07a4a5c9d9150e64647c`
    (`Make H-code audit dependency-light`)
- Production frontend/backend expected SHA:
  `d0659b9e79496a37fdca07a4a5c9d9150e64647c`

## Reports

- `reports/zeabur-deployment-report.json`
  - Zeabur frontend deployment freshness.
  - `statusCategory: fresh-running`.
- `reports/production-health-report.json`
  - Frontend `build-info.json` and backend `/api/health`.
  - Both match expected SHA `d0659b9e79496a37fdca07a4a5c9d9150e64647c`.
- `reports/h-code-coverage-report.json`
  - Production API H-code wording patrol.
  - 11 found results, 48 unique H-codes.
  - 0 missing Traditional Chinese codes.
  - 0 placeholder payload fields.
- `reports/h-code-spot-check-report.json`
  - Production spot check for `67-56-1`, `75-21-8`, and `7647-01-0`.
  - 3 found results, 32 unique H-codes.
  - Includes the previously failing `H360FD` and `H360Fd`.
  - 0 missing Traditional Chinese codes.
  - 0 placeholder payload fields.
- `reports/p-code-coverage-report.json`
  - Production API P-code wording patrol.
  - 11 found results, 67 unique P-codes.
  - 0 missing English codes.
  - 0 missing Traditional Chinese codes.
  - 0 code-only payload fields.
- `reports/github-production-print-qa-run.json`
  - GitHub Production Print QA run for SHA
    `d0659b9e79496a37fdca07a4a5c9d9150e64647c`.
  - Conclusion: success.
  - The `Check H-code wording coverage` and `Check P-code wording coverage`
    steps both passed on the GitHub runner.

## Interpretation

The H360 variant wording gap is closed for the bounded production smoke set and
the three manually selected follow-up cases. This does not certify every
possible future PubChem/ECHA H-code variant; it proves the previously observed
`H360FD` and `H360Fd` placeholders are gone and that future primary or
alternate-classification placeholder regressions in the bounded patrol fail
before product QA continues.

Real physical printing remains outside this evidence package.
