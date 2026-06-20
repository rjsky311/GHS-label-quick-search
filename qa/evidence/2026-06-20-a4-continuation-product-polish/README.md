# A4 Continuation Product Polish Evidence

Date: 2026-06-20

This evidence packet records the A4 complete-label polish pass opened from the
strict visual/UX review consensus.

Latest artifacts:

- `pdf/`: latest selected A4 PDF cases copied from `frontend/build/print-pdf-artifacts`.
- `png/`: latest rendered PNG pages from those PDFs.
- `print-pdf-report.json`: latest 42-case print PDF QA report.

Implemented checks:

- Continuation pages render a visible `CONTINUATION ONLY` warning band and
  explicitly say not to use the page alone.
- Page 1 of multi-page complete labels states the full label set must be kept
  together.
- Code-only P statements render as missing wording, not as complete
  instructions.
- Prepared-solution A4 output has a stronger identity block.
- Full-page A4 footer is now one integrated verification band instead of a
  loose QR/contact island.
- Short many-row A4 labels no longer fall into the smallest 8.3px typography
  tier solely because they have many short P/H rows. Genuinely dense long-text
  continuation cases still use the conservative tier.

Verification run:

- `git diff --check`
- `npm test -- --runInBand printLabels.test.js`
- `npm run test:print-contract`
- `npm run build`
- `npm run test:i18n`
- `PRINT_QA_PRINT_HTML_DIR=build/print-html-artifacts npm run qa:print-report && npm run qa:print-pdf`
- `npm test -- --runInBand`
- `npm run qa:bundle-budget`

Observed visual result:

- General A4 output has larger H/P text than the previous conservative tier and
  a more unified footer/QR area.
- Continuation pages have much clearer page-role warning without failing PDF
  layout checks.
- Remaining design caveat: sparse A4 cases still leave intentional open space
  between the statement block and footer. That is not currently treated as a
  failure because the content remains readable, QR stays scannable, and the
  complete label boundary is clear.

Independent acceptance review:

- Print readability / safety-label information design: `Pass`.
  - No blockers or minor issues.
  - H/P statements are small but readable; continuation pages clearly show page
    counts, keep-together guidance, QR-on-page-1 handling, and visible
    `CONTINUATION ONLY` warnings.
- First-time lab user workflow: `Minor`.
  - No blockers.
  - Continuation headers are clear but slightly repetitive, and final
    continuation pages can look sparse. The reviewer did not consider either
    issue likely to cause misuse.
- Strict visual systems / presentation layout: `Minor`.
  - No blockers.
  - Sparse pages leave a large blank middle area before the footer band, and
    the prepared-solution panel is visually heavier than the normal identity
    header. The reviewer still found the output professional and usable.

Acceptance decision:

- Stop A4 polish for this slice. The remaining issues are non-blocking
  follow-up polish items, not reasons to continue another redesign/review loop.
