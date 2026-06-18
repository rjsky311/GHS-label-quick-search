# Production UI Checkpoint 2026-06-18

Status: shipped and production-verified checkpoint for the experiment-notebook
main screen and simplified print workflow polish. This is a handoff record, not
a new open backlog.

## Source

- User-guided design review and production screenshots from the 2026-06-13 to
  2026-06-18 notebook UI and print-layout pass.
- PR #35: `[codex] Polish notebook print workflow layout`.
- Follow-up production QA stabilization commits on `main`:
  - `ba6c984` Stabilize production print handoff QA.
  - `36448f7` Stabilize production prepared print QA.
  - `3a95100` Stabilize production batch print QA.

## Shipped Baseline

- Production frontend: https://ghs-frontend.zeabur.app
- Production backend: https://ghs-backend.zeabur.app
- Verified frontend build SHA:
  `3a95100eca298cd80158f01bab2b12358ceb2d98`
- Runtime version remains `1.10.0`.

The visible product baseline now reflects the selected
`EXPERIMENT_NOTEBOOK_DESIGN_LANGUAGE.md` direction:

- Comfort Dim notebook surfaces on the main screen.
- Header identity acts as the home link.
- Explanatory workflow cards read as notes, not primary buttons.
- The "GHS quick workbench" visual is informational, not an action button.
- Print workflow keeps the three public outputs:
  Complete A4/Letter label, QR small label, and Identification small label.
- Printed label previews remain white/print-faithful.

## Verification

Fresh production verification completed after the final deployed SHA:

```bash
PRODUCTION_HEALTH_EXPECTED_GIT_SHA=3a95100eca298cd80158f01bab2b12358ceb2d98 npm run qa:zeabur-deployment
PRODUCTION_HEALTH_EXPECTED_GIT_SHA=3a95100eca298cd80158f01bab2b12358ceb2d98 npm run qa:production-health
PRODUCTION_HEALTH_EXPECTED_GIT_SHA=3a95100eca298cd80158f01bab2b12358ceb2d98 npm run qa:production-product
```

Production product QA passed these product blocks:

- Deployment freshness.
- Production availability.
- Print renderer stock fit.
- Result-table pictograms.
- Trust/source/SDS.
- Prepared-solution reprint.
- Fixed-stock batch printing.
- Whole-product UX/brand utility.

GitHub Actions also reported success for the latest `main` SHA:

- CI: success.
- Production Print QA: success.

## Visual Acceptance Package

Evidence package:
`qa/evidence/production-visual-acceptance-2026-06-18/README.md`.

The package captures production screenshots for:

- Main screen.
- Search results.
- A4 print modal blocked by missing responsible profile.
- A4 print modal after responsible profile is filled.
- Identification small label.
- QR small label.
- Batch print modal.

The captured `manifest.json` confirms the same production build SHA:
`3a95100eca298cd80158f01bab2b12358ceb2d98`.

## Stop Condition

This UI polish slice is closed. Do not reopen notebook main-screen polish,
print modal hierarchy, or QA script stabilization from backlog inertia.

Open a new slice only from fresh evidence:

- User screenshot/PDF showing a concrete visual or print-output problem.
- Real physical print evidence from paper, label stock, printer scaling, QR
  scanning, or thermal quality.
- Production QA, CI, or deployment failure.
- Admin/export/data-governance evidence that blocks a user job.

## Remaining Risk

Automated browser QA and screenshots do not prove physical label quality.
Real paper, label stock, printer scaling, QR scanning, and pictogram
readability remain deferred to `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`.
