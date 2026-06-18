# Production Visual Acceptance 2026-06-18

This package captures production UI evidence for the experiment-notebook main
screen and simplified print workflow checkpoint.

## Source

- Production URL: https://ghs-frontend.zeabur.app
- Captured build SHA: `3a95100eca298cd80158f01bab2b12358ceb2d98`
- Generated: see `manifest.json`

## Files

- `manifest.json`: capture metadata, build info, screenshot list, browser
  console notes, and page-error list.
- `screenshots/01-home-full-page.png`: main screen full-page capture.
- `screenshots/02-search-results-ethanol-full-page.png`: single-search result
  after querying `64-17-5`.
- `screenshots/03-print-a4-profile-needed.png`: A4 complete label modal before
  responsible profile is filled.
- `screenshots/04-print-a4-ready.png`: A4 complete label modal after profile
  fields are filled.
- `screenshots/05-print-identification-small.png`: Identification small-label
  output selection and preview.
- `screenshots/06-print-qr-small.png`: QR small-label output selection and
  preview.
- `screenshots/07-print-batch-modal.png`: batch print modal with selected
  ready items.

## Acceptance Notes

- The first two screenshots are full-page captures at 1440 px width.
- Print modal screenshots use a 1440 x 1000 viewport to preserve the modal,
  footer, and preview context as users see them in production.
- The capture reported no `pageerror` events.
- Browser console output included repeated Chromium messages that
  `frame-ancestors` is ignored from a meta CSP element. Treat this as a
  non-blocking security-header follow-up, not a visual QA failure.

## Boundary

This is visual and workflow evidence. It does not validate physical print
quality, printer scaling, thermal output, QR scan reliability, or actual
label-stock readability. Use `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md` for the
real-material validation pass.
