# Project Status And Next Plan

This is the canonical planning entry point for the project. Read this file
first when choosing the next autonomous product slice. Use the linked planning
and QA files only after this file has set the priority.

## 1. Product Positioning

GHS Label Quick Search is a free public GHS lookup and label-printing utility.
Its first job is to help lab, operations, and safety-adjacent users search a
chemical, understand the hazard source, preview the correct label output, and
print without becoming layout experts.

The product may support brand visibility, support requests, education, and
future indirect monetization, but those surfaces must stay outside
safety-critical label content. Printed GHS labels are not ad inventory.

Core product promises:

- Search should quickly return useful chemical identity, GHS classification,
  SDS/reference paths, and export/print actions.
- Preview should show the actual output role: complete primary label,
  supplemental label, quick-ID label, QR supplement, continuation output, or
  blocked output with a concrete recovery path.
- Print output must preserve available GHS pictograms on hazard labels. QR,
  brand surfaces, or supplemental labels must not replace required visual
  hazard communication.
- The app must remain honest about its authority boundary: it is a reference
  tool, and users should verify against SDS, supplier labels, and local rules.

## 2. Current Baseline

Runtime/code version is `1.10.0`. Do not version-bump without an explicit
request.

Production:

- Frontend: https://ghs-frontend.zeabur.app
- Backend: https://ghs-backend.zeabur.app
- Zeabur auto-deploys on push to `main`.

Current baseline capabilities:

- Vite/npm frontend build and FastAPI backend are aligned for Zeabur.
- Print workflow has stock presets, QR supplements, live preview, recent print
  reload, lab profile, saved templates, calibration controls, and prepared
  solution support.
- A4 and Letter are complete primary outputs. Smaller physical stocks are
  supplemental or quick-ID unless the renderer proves a truthful complete label
  can fit.
- `PRINT_LABEL_CONTRACT.md` defines the print safety contract.
- `NEXT_REMAINING_PRODUCT_WORK.md` holds the detailed execution backlog for the
  five current product work blocks.
- `AUTONOMOUS_WORKFLOW.md` defines when to continue, verify, push, deploy, and
  stop for user input.

Current validation gates:

- Docs-only: `git diff --check`
- Frontend: `npm test -- --runInBand`, `npm run test:i18n`, `npm run build`
- Print contract: `npm run test:print-contract`
- Print PDF QA: `npm run qa:print-pdf`
- Production search UI: `npm run qa:production-search-ui` (desktop
  search/detail plus 390px narrow read-first result and detail-comparison
  checks)
- Production print handoff: `npm run qa:production-smoke`,
  `npm run qa:production-primary`, `npm run qa:production-compact`,
  `npm run qa:production-multi-chemical`, `npm run qa:production-print`
- Prepared production workflow: `npm run qa:production-prepared`
- Whole product closure: `npm run qa:production-product`
- Backend: `python -m py_compile server.py` and
  `python -m pytest test_name_search.py -v`

## 3. Next Priority Order

Use this order unless a fresh production screenshot, failing CI/QA run, security
finding, or user-reported blocker clearly points elsewhere.

### 1. CI And Production QA Operationalization

Goal: deployment confidence should not depend on memory or manual screenshots.

Do next:

- Keep `qa:production-product` as the default closure gate for user-facing
  product work.
- Keep split gates available for narrower rounds: search UI, primary print,
  compact print, prepared workflow, and full print matrix.
- Make production QA artifacts easy to review: JSON reports, screenshots,
  generated PDFs, print HTML, and summary reports.
- Keep stale-deploy checks and bundle markers strict enough that production QA
  cannot accidentally validate an old frontend asset.

Current status:

- The `Production Print QA` GitHub Actions workflow exposes `product` mode as
  the manual default and scheduled fallback.
- Workflow job summaries include product-block pass/fail status when product
  block evidence is present.
- Split modes remain available for focused reruns: `smoke`, `primary`,
  `compact`, `multi-chemical`, `prepared`, `full`, and `all`.
- Local `qa:production-product` runs should be given at least a 10 minute
  timeout; a healthy full product pass often takes 5-6 minutes because it runs
  deployed Chrome flows, print handoff checks, prepared workflow checks, and
  summary generation.

Done means:

- A user-facing frontend change can be traced from code change to CI result,
  Zeabur deployment, production asset refresh, and production QA evidence.
- The final report can name which product block passed or failed.

### 2. Documentation Consolidation And Autonomous Continuation

Goal: future work should have one entry point and no competing roadmaps.

Do next:

- Keep this file as the canonical current planning file.
- Keep `NEXT_PRODUCT_WORK.md` as a short live queue only.
- Keep `NEXT_REMAINING_PRODUCT_WORK.md` as the detailed execution backlog.
- Keep historical documents such as `NEXT_PRINT_WORKSTREAMS.md`,
  `PRINT_OUTPUT_REFACTOR_PLAN.md`, and v1.8/v1.10 planning docs as baseline or
  historical context, not active priority selectors.
- Update docs whenever behavior, acceptance criteria, QA gates, or workflow
  assumptions change.

Done means:

- A new session can read `AGENTS.md`, this file, and
  `AUTONOMOUS_WORKFLOW.md` and know exactly how to continue.
- No active doc contradicts the canonical queue or claims that completed
  baseline work is still the next product target.

Current status:

- `PROJECT_STATUS_AND_NEXT_PLAN.md` is now the canonical planning entry point.
- `NEXT_PRODUCT_WORK.md` is the short live queue.
- `NEXT_REMAINING_PRODUCT_WORK.md` is the detailed execution backlog, not the
  priority selector.

### 3. Physical Print Validation

Goal: browser/PDF QA should be complemented by real-world print evidence.

Do next:

- Define a manual physical-print checklist for A4, Letter, common bottle
  labels, tube/vial labels, rack labels, 62 mm continuous stock, QR supplement,
  and prepared-solution outputs.
- Check browser print scaling, printer margins, orientation, paper/label stock,
  thermal/label-printer legibility, QR scan success, and pictogram readability.
- Record when the expected outcome is a complete primary label versus a
  truthful supplemental or quick-ID label.
- Convert repeated manual findings into automated geometry/PDF/production QA
  assertions where possible.

Done means:

- Each supported physical stock family has a clear print expectation and at
  least one representative physical or production-rendered acceptance path.
- Real-printer failures become checklist items, tests, or renderer rules rather
  than remaining only in chat.

Current status:

- `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md` defines the real-printer evidence
  workflow for paper/stock, printer scaling, QR scan success, and physical
  readability.
- `npm run qa:physical-print-plan` converts the current print QA matrix report
  into `frontend/build/physical-print-validation-plan.md` and `.json`, giving
  each physical stock family a generated work order with expected output role,
  pictograms, QR expectations, browser steps, and evidence fields.
- Real-printer validation is intentionally deferred until physical paper/stock
  and printer access are available.
- Automated Browser/PDF/production QA remains the precondition before physical
  print validation, not a replacement for it.

### 4. Data Governance And Safety Boundaries

Goal: users should trust the workflow without mistaking the app for the legal
authority.

Do next:

- Clarify source conflict handling between PubChem, ECHA, manual entries, SDS
  links, and local dictionary aliases.
- Keep unsafe URLs filtered on frontend and backend.
- Keep dictionary miss telemetry opt-in, bounded, and abuse-resistant.
- Keep manual entries, aliases, and reference links admin-gated.
- Make "unavailable upstream data" impossible to confuse with "no hazards."
- Keep data-correction requests separate from workflow/business requests.

Done means:

- A user can tell where data came from and when to verify against SDS,
  supplier labels, or local regulations.
- Admin/manual data paths remain constrained, auditable, and safe to expose in
  labels, references, QR targets, and exports.

Current status:

- `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` defines source roles, hazard data
  states, reference-link policy, conflict handling, admin boundaries, telemetry
  boundaries, and required regression tests.
- QR target selection now prefers SDS, regulatory, and occupational links before
  generic references, even when a generic reference has a lower numeric
  priority.
- Duplicate reference URLs preserve the strongest role on backend and frontend
  before priority sorting, so a generic mirror cannot downgrade the same URL
  when it is also available as SDS or regulatory evidence.
- Detail/reference lists now share the QR target's role-first source order
  (`SDS`, `Regulatory`, `Occupational`, then generic `Reference`) before
  numeric priority, so low-priority values cannot make a generic note look more
  authoritative than verification links.
- Backend reference-link payloads now use the same role-first source order, so
  the API, frontend display, and QR target selection share one authority model.
- Admin curation writes are bounded on the backend: manual dictionary entries,
  aliases, and reference links trim text, cap long fields, reject unsupported
  locale/status values, and constrain numeric priority/confidence before data
  reaches SQLite. Optional workspace document writes also reject oversized JSON
  payloads.
- Detail views now match the result table's data-state contract: GHS text
  without renderable pictograms is called out explicitly, and alternate
  classifications remain inspectable even if the primary report has no icons.

### 5. User Guidance, Brand Utility, And Low-Noise UX

Goal: the tool should feel useful, calm, and trustworthy enough for repeated
daily use.

Do next:

- Keep the first-screen workflow task-first: search, inspect, print/export, and
  verify.
- Keep advanced controls behind secondary surfaces unless they directly affect
  the immediate decision.
- Use brand/support surfaces only after the safety task has been served:
  footer, support band, help/education, optional exports, and correction
  requests.
- Improve first-time orientation without adding marketing-style noise or
  instructions that compete with the main task.
- Review narrow-width and mobile read-only usage for search/SDS/reference
  workflows, even if mobile printing remains secondary.

Done means:

- A first-time user can complete the main search-to-print path without reading
  long instructions.
- The app can create visibility and trust for the broader brand without
  weakening hazard communication.

Current status:

- Search results now use the same result-row DOM as a narrow-screen card layout
  on phone-width viewports, keeping chemical identity, GHS pictograms, signal
  word, detail action, and SDS action inside the viewport instead of requiring
  horizontal table scrolling.
- The detail modal's same-chemical classification comparison uses readable
  stacked cards on narrow viewports instead of a desktop-width comparison
  table, so alternate GHS reports can be inspected without horizontal dragging.
- `qa:production-search-ui` now captures 390px deployed screenshots for both
  search results and detail comparison, and fails when either area needs
  horizontal scrolling or when key actions/cards are outside the narrow
  viewport.

## 4. Known Blind Spots

Treat these as recurring review prompts before claiming a larger milestone is
complete.

- Physical printing: automated browser/PDF checks do not fully prove printer
  scaling, margin, media, thermal resolution, or label-stock behavior.
- Browser and OS print dialogs: Chrome, Edge, Windows print scaling, PDF
  viewers, and printer drivers can change output after the app hands off.
- QR reliability: QR must stay large enough, scan quickly, and point to safe,
  persistent http(s) targets.
- Compact multilingual layout: long names, bilingual H/P text, case numbers,
  prepared metadata, and custom fields can create pressure in small labels.
- Data conflicts: PubChem, ECHA, SDS, supplier labels, and manual curation can
  disagree; the app needs clear precedence and verification language.
- Upstream availability: transient PubChem or network failures must remain
  visible and must not degrade into false no-hazard states.
- Admin and telemetry surfaces: storage growth, privacy, abuse limits, and
  admin-key CORS behavior need ongoing review.
- Mobile and narrow screens: mobile may be read/search/SDS-first rather than
  print-first, but the core path should not break visually.
- Accessibility: complex modals, focus traps, keyboard paths, and screen-reader
  labels should stay aligned as UI is simplified.
- Documentation drift: old roadmap documents can become misleading if they are
  not explicitly marked as baseline, backlog, or historical.

## 5. Definition Of Done

Every autonomous work slice should close with evidence, not just code changes.

Minimum closure requirements:

- State the user-facing problem being solved.
- State the product block affected.
- Update docs when assumptions, user behavior, QA gates, or acceptance criteria
  change.
- Add or update the test/QA layer that would have caught the issue.
- Run targeted checks first, then broader checks based on blast radius.
- For production-facing UI changes, verify the deployed production path after
  Zeabur has refreshed the frontend asset.
- For print changes, preserve the print contract: no silent missing required
  images, no hidden GHS pictograms, no clipped output treated as printable, and
  no QR/supplemental label presented as a complete primary label.
- If a slice cannot be fully verified, record the exact blocker and do not
  claim it as complete.

Docs-only closure:

- `git diff --check`
- `rg "PROJECT_STATUS_AND_NEXT_PLAN" .`
- Confirm the changed docs do not contradict the canonical planning role of
  this file.

## 6. Supporting Documents

Use these files by role:

- `AGENTS.md`: project context, architecture, current runtime state, and
  session bootstrap guidance.
- `AUTONOMOUS_WORKFLOW.md`: standing approval, default work loop, stop
  conditions, and verification rules.
- `NEXT_PRODUCT_WORK.md`: short live queue and default continuation order.
- `NEXT_REMAINING_PRODUCT_WORK.md`: detailed five-block execution backlog and
  current status.
- `PRINT_LABEL_CONTRACT.md`: print safety contract.
- `PRINT_ACCEPTANCE_STANDARD.md`: print acceptance bar.
- `PRINT_BROWSER_QA_CHECKLIST.md`: browser QA checklist.
- `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`: real paper, label stock, printer
  scaling, QR scan, and physical readability checklist.
- `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`: source roles, SDS/reference
  policy, admin/manual data boundaries, telemetry limits, and conflict handling.
- `PRINT_OUTPUT_REFACTOR_PLAN.md`: v1.10 print refactor baseline.
- `NEXT_PRINT_WORKSTREAMS.md`: completed print workstream baseline.
- `DESIGN.md`, `BRANDED_UTILITY_STRATEGY.md`, and `REDESIGN_ROADMAP.md`:
  productized utility design direction.
