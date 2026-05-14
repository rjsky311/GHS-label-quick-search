# Next Remaining Product Work

This document captures the next product work after the v1.10 print-workflow
baseline. Use it with `NEXT_PRODUCT_WORK.md`, `AUTONOMOUS_WORKFLOW.md`,
`PRINT_ACCEPTANCE_STANDARD.md`, and `PRINT_BROWSER_QA_CHECKLIST.md` when the
user asks to continue.

The product goal remains the same: a user should be able to search a chemical,
understand the hazard source, choose the physical labeling situation, preview a
truthful output, and print without becoming a layout expert.

## Current Baseline

The previous five print workstreams in `NEXT_PRINT_WORKSTREAMS.md` are now the
baseline rather than the next queue:

- Prepared preset production clickthrough is covered by
  `qa:production-prepared`.
- Production print matrix automation exists locally and in GitHub Actions.
- Real chemical edge-case coverage is recorded in the print QA matrix report.
- Shared print content policy is implemented and asserted by focused tests.
- Print-modal first-screen visual/noise polish is deployed and gated by
  production handoff QA plus the `preview-context-strip` bundle marker.

Future work should build on that baseline instead of reopening the same
questions unless a new production screenshot, QA failure, or code-review
finding proves the baseline is insufficient.

## 1. Print Renderer And Stock Fit Robustness

Why this matters: the print modal can now guide the user, but the physical label
is still the final product. Small labels, QR labels, case numbers, long names,
prepared-solution metadata, and bilingual text can still fail visually if the
renderer and QA do not keep pace with the planner.

Work to continue:

- Add stock-specific renderer checks for compact families: small strip,
  small rack, medium rack, 62 mm continuous, standard bottle, large front label,
  A4 primary, and Letter primary.
- Turn every observed visual issue into a geometry assertion or QA matrix case:
  CAS/case chips, product name, signal word, pictograms, QR block, H summaries,
  continuation labels, and prepared-solution metadata.
- Keep preview, print HTML, PDF artifacts, and production Chrome handoff aligned
  so a passing test means the visible output is actually usable.
- Prefer scaling and reflow before deleting text. Deletion or summarization must
  be driven by the shared content policy, not by ad hoc renderer rules.

Acceptance:

- Compact-label QA fails on overlap or clipping before the user sees it in
  production.
- Every supported stock family has at least one representative production or
  renderer test case.
- Case number and other selected identity fields stay visible when enabled.
- A4/Letter primary outputs remain complete and do not overflow when QR,
  profile, bilingual names, or continuation content is present.

Current status:

- Implemented stock-fit contracts in the print QA matrix so every matrix case
  now records the expected stock family, rendered label size, minimum printed
  pictogram size, minimum printed QR size, and support-chip requirement.
- Extended PDF artifact QA to consume those stock-fit expectations and fail on
  label-kind mismatch, undersized pictograms/QR, missing selected identity
  fields, forbidden language leakage, case/support chip clipping, and
  support-chip collision with pictograms, QR, or signal word.
- Extended production handoff QA to inspect the live preview iframe for the
  selected case/support chip and fail if it is hidden, outside the label, outside
  the viewport, or overlapping critical visual elements.
- Hardened production handoff sequencing so the deployed Chrome runner waits
  for the selected label purpose, stock card, and preview label-kind/stock
  contract before capturing evidence or pressing print. This prevents fast
  remote runners from accidentally validating the previous modal state.
- Added bounded production-search retries for Browser QA so a single transient
  PubChem/backend miss does not masquerade as a print-layout regression, while
  repeated upstream failures still block the production gate.
- Fixed the small-rack renderer where the new stock-fit gate found undersized
  GHS pictograms: quick-ID small-rack icons now render at 11.4 mm and
  small-rack QR supplement icons render at 10 mm.
- Added custom-stock cases to the print QA matrix: a tiny custom complete
  primary is blocked and routed back to A4/Letter, while the same tiny custom
  geometry remains printable as truthful supplemental output with every GHS
  pictogram preserved. Blocked custom-primary cases are kept out of PDF artifact
  generation because they are not valid print handoff outputs.
- Custom physical sizes now infer typography size from the entered dimensions
  instead of inheriting the large-primary preset size. This keeps tiny custom
  labels on the strip renderer path and prevents standard-grid overflow.
- Local verification passed: `npm run test:print-contract`, generated
  `build/print-qa-report.json`, generated `build/print-html-artifacts/`,
  `npm run qa:print-pdf` (34/34), `npm run build`,
  `npm test -- --runInBand` (822/822), and
  `npm run qa:production-compact` against the deployed production URL
  (15/15 compact handoff cases).

Suggested verification:

- `npm run test:print-contract`
- `PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report`
- `npm run qa:print-pdf`
- `npm run qa:production-bundle`
- `npm run qa:production-primary`
- `npm run qa:production-compact`

## 2. Result Table And GHS Pictogram Visual Unity

Why this matters: the search result is the user's first trust moment. If the GHS
icons look inconsistent, crowded, decorative, or different from the print/detail
views, the product feels less reliable even when the data is correct.

Work to continue:

- Review the pictogram presentation in the results table, expanded
  classifications, detail modal, comparison table, favorites/history surfaces,
  and print preview.
- Use official SVG pictograms for regulatory symbols. Generated bitmap assets
  are acceptable for non-regulatory empty states, education, brand surfaces, or
  explanatory illustrations, but not as replacements for GHS pictograms.
- Standardize tile size, border radius, background, spacing, wrapping,
  collapsed/expanded behavior, and "set as primary" actions.
- Make dense icon sets readable without status dots, decorative clutter, or
  awkward grids that compete with chemical identity.

Acceptance:

- A four-pictogram chemical such as Hydrochloric Acid looks consistent across
  results, expanded classifications, detail, comparison, preview, and print.
- Expanded "other classification" rows are scannable and do not produce strange
  columns or icon stacks.
- Production search UI QA captures result-table readability and fails on obvious
  pictogram layout regressions.

Current status:

- Result table, expanded alternate classifications, detail/favorites surfaces,
  and comparison table now use the shared `GHSPictogramStrip` instead of
  hand-rolled pictogram tiles.
- Comparison table cells use the canonical tile geometry and show missing
  pictograms as small code chips rather than rendering a second, inconsistent
  absent-icon grid.
- Production search UI QA now inspects deployed Hydrochloric Acid result-row
  pictogram geometry, expands the alternate-classification drawer, captures a
  second screenshot, and fails on missing strips, undersized images, non-square
  tiles, and action-button vertical-text regressions.

Suggested verification:

- `npm test -- --runInBand`
- `npm run test:i18n` when copy changes
- `npm run build`
- `npm run qa:production-search-ui`
- `npm run qa:production-smoke` when result actions or print entry changed

## 3. Trust, Source, SDS, And Safety Boundaries

Why this matters: this is a safety reference tool, not a legal compliance
authority. The user should know what came from PubChem, what came from local
dictionary/manual curation, what requires SDS/supplier/local-rule verification,
and why QR or supplemental labels do not replace a complete primary label.

Work to continue:

- Make source/provenance copy short, specific, and close to the decision points:
  search result, detail modal, SDS links, print modal, and QR/supplemental paths.
- Keep SDS and reference links safe, labeled, and visibly secondary to the
  immediate search/label task.
- Make unavailable or stale upstream data impossible to confuse with "no
  hazards."
- Keep brand visibility and eventual monetization outside safety-critical label
  content. Footer, help, education, report/export, or optional brand surfaces
  are acceptable; GHS labels are not ad inventory.

Acceptance:

- A user can tell when they should verify against SDS, supplier labels, or local
  regulations.
- QR labels and supplemental labels clearly communicate that details live in
  SDS/primary/QR paths and do not replace the complete primary label.
- Unsafe reference-link schemes, stale hazard states, and missing upstream data
  remain blocked or clearly warned.

Current status:

- Search results now distinguish three safety states instead of collapsing them
  together: no GHS classification data, GHS text without renderable pictograms,
  and renderable pictograms. This prevents H/P or signal-word-only records from
  being presented as "no hazard."
- The shared `AuthoritativeSourceNote` now supports results, detail, and print
  variants with explicit SDS, supplier-label, and local-rule verification chips.
  Print mode can also show supplemental-only or blocked-output wording.
- Detail-modal reference links are labeled by role (`SDS`, `Regulatory`,
  `Occupational`, or `Reference`) and include a short verification hint so SDS
  paths remain useful without implying that the app itself is the authority.
  The frontend and backend still reject unsafe non-http(s) reference URLs.
- The print modal now keeps the same trust boundary close to the output-planner
  decision: complete outputs get verification copy, QR/quick-ID/supplemental
  outputs state that they do not replace the complete primary label, and blocked
  states tell the user not to print yet.

Suggested verification:

- Frontend tests for copy/state changes
- Backend tests when source/reference validation changes
- `npm run test:i18n`
- `npm run qa:production-search-ui`

## 4. Prepared Solution And Reprint Workflow Maturity

Why this matters: prepared-solution labels are a real lab workflow, not just a
print variant. Reprinting a prepared solution must preserve parent chemical
identity while keeping run-specific operational fields fresh and truthful.

Work to continue:

- Keep parent chemical identity, concentration, solvent, prepared-by,
  prepared-date, expiry-date, case number, and custom fields consistent across
  form, preview, recent records, saved presets, and print output.
- Ensure saved presets never carry stale operational fields into a new prepared
  job.
- Make recents/reprints rerun the current planner instead of trusting a stale
  layout that used to be printable.
- Expand prepared-solution renderer cases when compact labels or bilingual
  metadata produce layout pressure.

Acceptance:

- Prepared A4 primary, bottle supplemental, and tube quick-ID paths pass the
  same no-clipping, no-missing-pictogram, truthful-output standards as regular
  labels.
- Prepared preset reuse pre-fills recipe fields only and requires fresh
  operational context where appropriate.
- Prepared sidebar reprint opens the current print modal and remains subject to
  current planner, image, layout, and content-policy checks.

Current status:

- Prepared recents and presets now normalize both localStorage and optional
  workspace-sync payloads before hydrating state. Recents keep only workflow
  identity plus operational fields; presets keep recipe fields only. Stale GHS
  hazard snapshots, signal words, pictograms, and accidental operational fields
  are stripped even if an older or corrupted payload contains them.
- Add/update paths also normalize before persistence, so future callers cannot
  accidentally store hazard data in workflow-only prepared records.
- The prepared reprint sidebar now uses the same expiry-status logic as the
  prepare modal. Expired or soon-expiring entries are visually marked before the
  user reprints, while reprint still refetches the current parent chemical and
  reruns the current print planner.

Suggested verification:

- Prepared workflow integration tests
- `npm run qa:production-prepared`
- `npm run qa:print-pdf` when renderer output changes

## 5. Whole-Product UX And Brand-Utility Convergence

Why this matters: the product should feel like one focused utility, not a set of
separate features added over time. The free-utility positioning can support
brand visibility, but the core safety workflow must stay calm, useful, and
non-promotional.

Work to continue:

- Review the full user path: empty state, search, result table, detail modal,
  SDS path, print modal, prepared solution, recents, exports, and footer.
- Remove duplicate explanations, noisy controls, and UI language that describes
  implementation rather than user decisions.
- Use generated images or branded visuals only where they improve orientation
  or polish without weakening safety trust.
- Keep visual hierarchy consistent: primary task first, verification second,
  advanced controls third, brand/support surfaces last.

Acceptance:

- A first-time lab or operations user can complete the main flow without reading
  long instructions.
- The app looks consistent across search, detail, print, and prepared workflows.
- Brand visibility exists only in places that do not compete with hazard
  communication or print output.
- Remaining roadmap items are tracked in documents, tests, or QA reports rather
  than being preserved only in chat.

Current status:

- The product trust/support surface has been downgraded from a nested card
  block into a lightweight support band after results, so it no longer competes
  with the primary search and print task.
- Empty-state and footer copy now describes the user value directly: search,
  verify, print/export, and report corrections or workflow requests only after
  the safety task is complete.
- Brand/support positioning is now explicit in UI copy: labels and hazard
  content stay ad-free, while feedback and workflow links stay outside
  safety-critical label content.

Suggested verification:

- Manual product walkthrough against production
- `npm run qa:production-search-ui`
- `npm run qa:production-smoke`
- Screenshot review across desktop and narrower modal widths

## Default Next Order

Unless a fresh bug report or failing check points elsewhere, continue in this
order:

1. Print renderer and stock fit robustness.
2. Result table and GHS pictogram visual unity.
3. Trust/source/SDS safety boundaries.
4. Prepared solution and reprint workflow maturity.
5. Whole-product UX and brand-utility convergence.

This order prioritizes safety-critical printed output first, then the search
surface that creates trust before the print workflow begins.
