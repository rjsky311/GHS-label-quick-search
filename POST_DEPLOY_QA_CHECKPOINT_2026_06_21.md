# Post-Deploy QA Checkpoint 2026-06-21

Status: production-verified checkpoint for PR #38 plus post-deploy
manual-directed QA. This file records what is safe to treat as closed and what
fresh evidence should drive the next slice.

## Source

- User request after PR #38 production deployment: run post-deploy manual QA
  and organize the next issues instead of immediately starting another broad
  UI pass.
- PR #38: `Harden print lookup and production QA gates`.
- Production merge commit:
  `0455d721ce883be6332cc0fee41d6b8379712040`.
- Production frontend: https://ghs-frontend.zeabur.app
- Production backend: https://ghs-backend.zeabur.app

Evidence package:
`qa/evidence/2026-06-21-post-deploy-manual-qa/README.md`.

## Production Gates

These gates passed against the expected production SHA:

```bash
npm run qa:zeabur-deployment
npm run qa:production-health
npm run qa:production-search-ui
npm run qa:production-batch-print
npm run qa:production-product
```

Additional resource patrol:

```bash
npm run qa:github-resource
```

Production product QA reported all product blocks green:

- Deployment freshness.
- Production frontend/backend availability.
- Print renderer and stock fit robustness.
- Result-table pictograms.
- Trust, source, SDS, and safety boundaries.
- Prepared solution and reprint workflow maturity.
- Fixed-stock batch label printing.
- Whole-product UX and brand-utility convergence.

Production print handoff covered:

- Complete A4 primary.
- Missing responsible profile blocked state.
- Letter primary.
- Ethylene Oxide A4 continuation.
- Identification small label.
- Brother 62 mm QR supplement.

Prepared-solution production QA covered 9/9 cases across complete, QR, and
identification outputs, including recent reprint and preset reuse.

## Manual-Directed Spot Check

After the automated production gates passed, a manual-directed content check
queried production for the chemicals the owner had been using as practical
smoke cases:

| Query | Result | Primary placeholder check |
| --- | --- | --- |
| `7647-01-0` | Hydrochloric acid | Pass |
| `7664-93-9` | Sulfuric acid | Pass |
| `64-17-5` | Ethanol | Pass |
| `67-56-1` | Methyl alcohol (Methanol) | Primary pass; alternate issue below |
| `75-21-8` | Ethylene Oxide | Primary pass; alternate issue below |

Important finding: the owner-visible problem class is improved for the main
production label paths, but not fully closed across all alternate
classifications. The production API still contains Traditional Chinese
placeholder wording in alternate classification hazard statements:

- Methanol `67-56-1`: alternate classification `H360FD` has
  `尚無完整文字 - 使用前請核對 SDS。`.
- Ethylene Oxide `75-21-8`: alternate classification `H360Fd` has
  `尚無完整文字 - 使用前請核對 SDS。`.

This does not invalidate the production deployment because the primary
production labels and the tested print handoff paths passed. It does open a
concrete next issue because classification comparison / alternate selection can
surface the placeholder to users.

## Next Issue Queue

### P1 - Close H360 Variant Chinese Wording Gaps

Implementation update: commit
`9f868deda22626e6def370d93baf151c66cdba55` adds reviewed Traditional Chinese
wording for `H350i`, `H360F`, `H360D`, `H360FD`, `H360Fd`, `H360Df`,
`H361f`, `H361d`, and `H361fd`, plus a focused regression test for the
H360 reproductive-toxicity variants.

Source: post-deploy manual-directed content spot check on production.

Affected user job: lookup trust and classification comparison. Users reviewing
alternate GHS classifications should not see placeholder Traditional Chinese
hazard wording when English wording is already present.

Scope:

- Add reviewed Traditional Chinese wording for `H360FD` and `H360Fd`.
- Confirm whether related variants such as `H360F`, `H360D`, `H360Df`, and
  casing variants need normalization or explicit dictionary entries.
- Add regression coverage so alternate classifications are included in H-code
  wording checks, not only the selected primary classification.

Expected proof:

- Backend tests for H360 variant translations.
- A bounded production-style spot check for Methanol and Ethylene Oxide showing
  no `尚無完整文字` in primary or alternate classification hazard statements.
- Existing production product QA remains green after deployment.

Stop condition:

- The listed H360 variant placeholders are gone from production and the new
  coverage prevents reintroduction.

### P1 - Add Alternate-Classification Wording Patrol

Implementation update: commit
`9f868deda22626e6def370d93baf151c66cdba55` adds
`backend/scripts/audit_h_code_coverage.py` and `npm run qa:h-code-coverage`.
The audit scans primary and `other_classifications` hazard statements for
missing Traditional Chinese wording, missing payload text, renamed payload
fields, and the `尚無完整文字 - 使用前請核對 SDS。` placeholder.

Source: same spot check. Existing QA was strong enough for primary print paths
but did not fail on alternate classification H-code placeholders.

Affected user job: lookup trust before print/export. Users may open the
classification chooser before deciding what to print.

Scope:

- Extend or add a QA patrol that scans `other_classifications` for missing
  H-code Chinese/English text.
- Keep the sample bounded; do not turn production QA into an unbounded PubChem
  crawl.
- Report specific code, CAS, and classification index when a gap appears.

Expected proof:

- New local test or QA command fails on a fixture with alternate
  `尚無完整文字`.
- Command passes on the fixed Methanol / Ethylene Oxide cases.

Stop condition:

- Missing alternate-classification wording is actionable before production,
  not discovered only by manual spot checks.

### P2 - Physical Print Validation Remains Deferred

Source: all browser/PDF production QA passed, but automated screenshots do not
prove physical label stock, printer scaling, thermal readability, or QR scan
quality.

Affected user job: actual lab printing.

Scope:

- Use real A4/Letter paper, 70 x 24 mm identification label stock, and
  62 x 40 mm QR label stock.
- Record printed photos/scans and QR scan results.
- Compare GHS pictogram and small-text readability under real printer scaling.

Expected proof:

- Physical-print evidence package with pass/fail notes.
- Any discovered layout problem becomes a separate concrete issue.

Stop condition:

- Physical printing is either accepted for pilot use or blocked by specific
  stock/printer issues.

### P2 - Owner Manual Review Of UX Screenshots

Source: production screenshots are captured and automated checks are green, but
the owner may still have taste/readability observations that automation cannot
judge.

Affected user job: first-time lookup, print modal confidence, and small-label
preview comprehension.

Scope:

- Review the evidence screenshots in
  `qa/evidence/2026-06-21-post-deploy-manual-qa/screenshots/`.
- Open a new visual slice only from concrete screenshot annotations, not from
  broad "make it nicer" pressure.

Expected proof:

- Annotated screenshot or short issue note with affected screen, observed
  problem, and desired outcome.

Stop condition:

- No visual slice is opened unless there is concrete screenshot/PDF evidence.

## Closed By This Checkpoint

- PR #38 is merged and deployed.
- Zeabur frontend deployment freshness is confirmed for
  `0455d721ce883be6332cc0fee41d6b8379712040`.
- Production health, search UI, batch print, prepared print, and product
  summary gates are green.
- GitHub resource patrol is green with no warnings/failures.

## Stop Condition

Do not continue broad print polish, main-screen redesign, admin tooling, or
extra QA by inertia. The next implementation slice should start from the P1
H360 variant wording gap unless the owner provides fresher screenshot/PDF,
physical-print, admin/export, CI/deployment, or production QA evidence.
