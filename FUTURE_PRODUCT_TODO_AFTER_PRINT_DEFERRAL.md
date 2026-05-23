# Future Product To-Do After Physical Print Deferral

This is the tracking document for the next product maturity phase while
real-printer validation is intentionally deferred.

The goal is not to add more features for their own sake. The goal is to bring
the public free utility to a "ready enough for repeated daily use" level:
trustworthy data boundaries, calm task-first UX, clean public documentation,
and brand/support surfaces that do not interfere with safety-critical work.
Fixed-stock batch label printing is now tracked as a first-class product slice
in `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` because it is a non-physical-print
workflow gap that affects daily usability before real-printer validation.
Current user-confirmed product requirements and closure rules are pinned in
`PRODUCT_REQUIREMENTS_DECISIONS.md`; use that file before expanding this
backlog or implementing correction-intake work.

## Scope And Status Model

Physical print validation is out of scope for this document except where a
future issue affects QR scan reliability, label meaning, or user guidance. Keep
real-printer work in `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`.

Use these status labels when updating items:

| Status | Meaning |
| --- | --- |
| `Open` | Needs product/design/engineering work. |
| `Planned` | Direction is clear, but implementation has not started. |
| `In progress` | Active branch/work exists. |
| `Gate added` | A test, QA script, or checklist now catches regressions. |
| `Shipped` | Implemented, verified, pushed, and documented. |
| `Monitoring` | Stable for now; keep watching for real examples. |
| `Deferred` | Intentionally postponed with a reason. |

Definition of done for any item:

- The user-facing outcome is clear.
- The safety/authority boundary is unchanged or explicitly documented.
- Tests or production QA cover the expected behavior where practical.
- The relevant planning docs are updated.
- Production-facing changes pass CI and the appropriate production QA gate.

## 1. Data Trust, Source Governance, And Correction Workflow

Status: `Monitoring` on 2026-05-16.

Why this matters: users need to trust the tool without mistaking it for the
legal authority. PubChem, ECHA, supplier SDS, local dictionary aliases, manual
curation, and user corrections can disagree. The product should make those
differences understandable and safe.

Current baseline: the core data-trust surfaces now have regression gates for
source conflicts, no-GHS states, selected-classification evidence, SDS/reference
authority ordering, QR target metadata, correction links, telemetry caps, and
trusted Chinese-name display. Keep this section open as a monitoring prompt
rather than as an unfinished feature list; add new implementation work only
when a new source conflict, correction pattern, unsafe-link example,
upstream-data failure, or missing-name curation example appears.

### 1.1 Source-Conflict Handling

Status: `Gate added` on 2026-05-16.

Goal: when PubChem/ECHA/manual/reference sources disagree or look incomplete,
the app should expose the uncertainty without creating false certainty.

Work items:

- Completed: added a Detail modal source-conflict note for chemicals with
  multiple public classifications, and reframed classification switching as an
  SDS/supplier/local-rule verified action rather than a casual preference.
- Completed: expanded `qa:production-search-ui` so the deployed Detail modal
  must keep the source-conflict note visible for the Hydrochloric Acid
  multiple-classification path.
- Completed: tightened label-print entry points so found chemicals with no GHS
  hazard content cannot be auto-selected, selected from result rows, printed
  from Detail, or printed from Favorites. Text-only GHS records remain
  selectable because they still carry hazard content.
- Completed: expanded `qa:production-search-ui` with a deployed no-GHS data
  state using Urea (`57-13-6` by default). The gate now verifies the result row
  and Detail modal both show the no-GHS warning, keep text-only-GHS warnings
  separate, disable print entry points, and keep the row out of label
  selection.
- Completed: aligned effective-classification source evidence across result
  rows, Detail trust/provenance surfaces, print/export data preparation, CSV
  fallback rows, backend CSV/XLSX export rows, and the export preview. If a
  user selects an alternate classification, the visible source/report count and
  exported trust columns follow that selected classification rather than the
  original primary report.
- Completed: expanded `qa:production-search-ui` so the deployed export preview
  must expose data state, primary source, and classification-selection columns.
- Completed: audited the print modal and QR supplement path so scan targets
  expose role/source/label metadata before print and in production handoff QA.
- Completed: defined the current baseline language for PubChem/ECHA/manual
  source context through result rows, Detail trust/provenance surfaces,
  print/export preparation, export preview, and CSV/XLSX exports.
- Completed: added a shared frontend data-quality issue model so result rows
  and Detail can consistently distinguish upstream retry states, no-GHS data
  gaps, text-only GHS without pictograms, source-conflict review, and missing
  trusted Chinese names. Correction links now prefill CAS/name context and the
  specific issue type for maintainers.
- Completed: made the Detail same-chemical comparison expose compact
  source/ranking evidence per classification: currently selected report,
  report count, source family, and pictogram/H/P coverage. Desktop and narrow
  card layouts now share the same evidence model, and production search UI QA
  fails if those evidence panels disappear.
- Add more regression cases when new examples appear for multiple
  classifications, text-only GHS records, no GHS data, or upstream transient
  failures.

Acceptance:

- A user can tell what came from the app, what came from PubChem/ECHA, and what
  must be verified against SDS/supplier/local rules.
- No UI state presents missing upstream data as "no hazards."
- `npm run qa:production-search-ui` or a focused test catches source-state and
  comparison-evidence regressions.

### 1.2 Correction Intake And Review Flow

Status: `Gate added` for in-app/backend intake on 2026-05-22; backend/API/admin
queue, public in-app correction dialog, and admin-only candidate evidence
bundles are in place. Existing GitHub issue-form prefill remains `Gate added`
as fallback.

Goal: data-correction requests should become an auditable improvement path, not
an unstructured support inbox.

Work items:

- Completed: clarified the public correction path in `README.md` and
  `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`.
- Completed: added separate GitHub issue templates for data corrections and
  workflow requests.
- Completed: routed frontend support links to the specific issue templates.
- Completed: added contextual correction links from result rows and Detail for
  no-GHS gaps, pictogram gaps, source conflicts, and missing trusted Chinese
  names; upstream transient failures stay as retry guidance rather than a data
  correction shortcut.
- Completed: data-correction links now prefill the structured issue-template
  fields for CAS, chemical name, issue type, current output, expected output,
  evidence type, and local context. Workflow-help links can also prefill the
  workflow area, user goal, current problem, desired behavior, and examples, so
  support requests stay actionable without mixing into safety-data corrections.
- Completed: structured support links now respect the actual GitHub
  issue-form dropdown schemas. Public links send human dropdown values such as
  `Chemical identity or alias`, `Source/provenance display`, or
  `Search and results`, while the app's internal keys such as
  `missing-chinese-name`, `source-conflict`, and `unresolved-search` remain in
  the generated issue body as `Issue key`. Data-correction links also keep
  broad source guidance in the generated body as `Evidence prompt`, while the
  `evidence_type` query parameter uses one valid template dropdown option.
  Unit tests now read the actual issue-template dropdown options and field ids
  and fail if generated support-link values or query keys drift from the
  repository forms. Production search UI QA now reads those same repository
  issue templates at run time, so the deployed gate validates current form
  schemas instead of duplicated option or field-id lists.
- Completed: expanded production search UI QA so it fails when row/Detail
  correction links stop using the data-correction issue template or lose CAS
  context for no-GHS gaps, source conflicts, or missing trusted Chinese names.
- Completed: expanded production search UI QA so the deployed product-trust
  workflow link must keep structured workflow-request fields, and missing
  Chinese-name correction links must keep structured CAS/issue/current-output
  fields in both result-row and Detail paths.
- Completed: expanded the same production gate so no-GHS data gaps and
  source-conflict review links must also keep structured issue type, CAS,
  current output, and expected output fields. This keeps all public
  data-quality correction links actionable instead of only testing the
  missing-Chinese-name path.
- Completed: added unresolved lookup rows to the same correction intake model.
  A not-found search now exposes a structured `unresolved-search` correction
  link for dictionary curation, while upstream transient failures remain retry
  states. `qa:production-search-ui` covers this with a mocked deployed lookup.
- Completed: added backend correction-request storage/API in the existing
  pilot/admin SQLite store. Public submissions are bounded, rate-limited, and
  source/evidence fields are normalized before persistence. Admin users can
  list correction requests and update status from the dashboard.
- Completed: added a small correction-request status model that is easy for
  coding agents to process: `open`, `candidate_found`, `approved`, `rejected`,
  and `ignored`. Approved requests must still convert into the relevant curated
  record before affecting public lookup, labels, or exports.
- Completed: wired user-facing station/in-app correction actions to the new
  backend correction-request API from result rows, Detail, and the product
  trust panel. Contextual links still preserve their GitHub issue-form URL as a
  visible fallback if the API is unavailable.
- Completed: admin correction requests can now be marked `candidate_found`
  with a structured candidate evidence bundle. The bundle captures request id,
  issue type, CAS, candidate English/Chinese names when present in the request
  text, evidence link/type, and review notes, and it is explicitly
  `approved_for_public_use: false` until a maintainer converts it into an
  approved curated record.
- Completed: stored correction candidate evidence can now create a pending
  manual-dictionary review entry from the admin dashboard. The conversion
  preserves request/evidence notes and still keeps the entry out of public
  lookup, labels, and exports until a maintainer explicitly approves the manual
  entry.
- Completed: candidate-to-manual-entry conversion now writes back to the
  originating correction request as `candidate_found` with manual-review
  metadata. This keeps the admin queue traceable while still recording
  `public_data_changed: false` until the manual entry itself is approved.
- Completed: admin dictionary summary now counts correction candidates that
  have already entered manual review, so maintainers can see conversion
  throughput without opening each request.
- Completed: admin overview now also lists the converted correction candidates
  that are waiting in manual review, including their review-only candidate
  evidence and pending-manual-entry hint. This keeps the report-to-manual-entry
  trail visible without implying that public lookup, labels, or exports changed.
- Completed: converted correction candidates are filtered out of the ordinary
  open correction-request summary list and shown only in the manual-review
  section. This keeps the admin overview low-noise while preserving the full
  correction history in the detailed queue/export paths.
- Completed: correction candidate evidence payloads are now sanitized at the
  backend boundary. Candidate bundles accept only known fields, reject unsafe
  evidence URL schemes, cap free text, normalize CAS values, and always store
  review-only flags so future external/LLM lookup helpers cannot imply public
  approval by payload shape. Manual-review conversion metadata is admin-only,
  so public submissions cannot mark themselves as converted or approved.
- Completed: added `CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md` as the implementation
  contract for future Wikidata/PubChem synonym/NCI/LLM/scientific-skill
  candidate discovery. Candidate discovery must be dry-run first and must emit
  review-only candidate evidence bundles.
- Completed: added the first maintainer-only dry-run discovery tool:
  `backend/candidate_discovery.py` and
  `backend/scripts/discover_candidates.py`. The CLI can inspect a single CAS or
  open/candidate correction requests, reads approved manual entries plus the
  local seed dictionary by default, and can optionally query Wikidata by CAS
  when `--sources manual,local,wikidata` is explicitly requested. It emits
  suggested admin candidate payloads but performs no database write and changes
  no public lookup, label, export, or QR output.
- Planned: candidate Chinese names from LLM/translation, PubChem synonyms, NCI
  resolver, EPA CompTox, scientific lookup skills, or richer Wikidata fields
  can be added later as external discovery helpers, but their output must use
  the same candidate evidence bundle and remain admin-approved only. Existing
  Gemini-generated seed dictionary names remain the current project baseline
  and should not be bulk invalidated without a dedicated dictionary review.
- Completed: added admin manual-dictionary review statuses (`approved`,
  `pending`, `needs_evidence`, `rejected`). Only approved entries affect public
  lookup, trusted display names, labels, or exports; pending/needs-evidence
  records stay visible in admin review and exports.
- Completed: made pending/needs-evidence manual entries actionable from the
  admin overview. Maintainers can approve, mark needs-evidence, or reject a
  candidate without copying it back into the manual-entry form.
- Completed: exposed manual-entry status counts in the admin overview so the
  review queue shows whether approved, pending, needs-evidence, or rejected
  rows are accumulating.
- Completed: aligned the admin curation recency view across manual entries,
  aliases, and reference links. Recent rows now sort by latest update first and
  show explicit status badges, so maintainers can distinguish fresh
  needs-evidence work from older approved or rejected records without opening
  separate exports.
- Completed: added alias status counts to the admin summary, matching manual
  entry and reference-link status reporting. This keeps alias review visible as
  a governed queue instead of only showing the pending total.
- Completed: made pending and recent aliases directly actionable from the admin
  curation list. Maintainers can approve, mark needs-evidence, or reject aliases
  without retyping the alias payload, while automated synonym capture still
  cannot downgrade an already approved, needs-evidence, or rejected alias.
- Completed: made recent manual dictionary entries directly actionable from
  the admin curation list. Maintainers can approve, mark needs-evidence, or
  reject visible recent rows without retyping the same CAS/name payload.
- Add optional external/sandbox candidate discovery only after a scope, cost,
  and source-reliability decision. Do not let that discovery bypass the admin
  candidate evidence bundle or manual-entry approval flow.
- Keep manual dictionary review status usage consistent with the correction
  path.
- Keep workflow/business requests separate from safety-data corrections.

Acceptance:

- Data correction and workflow requests stay visibly separate.
- Manual curation remains admin-gated and bounded.
- A correction can be traced from user report to reviewed manual entry,
  reference link, or explicit rejection.

### 1.3 SDS And Reference-Link Authority Model

Status: `Gate added` on 2026-05-15.

Goal: SDS/regulatory/occupational/reference links should remain useful without
implying that the app has resolved compliance.

Work items:

- Completed: `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md` defines the role-first
  order, safe-scheme requirement, duplicate-URL strongest-role rule, and QR
  target boundary.
- Completed: frontend and backend tests cover unsafe schemes, unknown roles,
  role-first ordering, duplicate role merging, and QR target preference.
- Completed: export preview, frontend CSV fallback, and backend CSV/XLSX
  exports now carry data-state, primary-source, report-count, cache,
  reference-link, and classification-selection context, so exported rows do not
  lose the trust boundary users saw in the app.
- Completed: QR target selection now exposes role/source/label metadata through
  `getPreferredQrTargetInfo`; QR supplement preflight shows the selected scan
  target role, and printed QR images carry target URL/type/source/label data
  attributes for QA and troubleshooting.
- Completed: production print handoff QA now enforces QR target metadata and
  visible QR target role copy for QR supplement cases.
- Completed: admin reference-link curation now supports explicit `active` and
  `inactive` statuses. Public lookup, Detail, QR target selection, labels, and
  exports keep using active links by default, while admin fetches include
  inactive links and the overview shows active/inactive counts so retired SDS
  or obsolete reference links remain auditable without becoming user-facing.
  Recent reference links can also be activated or deactivated directly from the
  admin list, and the list prioritizes newly updated links so maintainers do
  not need to retype a URL or hunt through older records just to retire or
  restore it.
- Keep role-first ordering (`SDS`, `Regulatory`, `Occupational`, `Reference`)
  aligned across backend, frontend, QR target selection, detail views, and
  exports.
- Add visual or copy polish only if it reduces confusion; avoid making
  reference links look like final legal approval.
- Continue monitoring QR target fallback behavior when no SDS/regulatory link
  is available.
- Add examples for unsafe/legacy links, duplicate URLs with different roles,
  and manual SDS links with higher priority.

Acceptance:

- Unsafe URL schemes never render or become QR targets.
- Generic references cannot outrank SDS/regulatory evidence by numeric priority
  alone.
- QR supplement users can see whether the scan path is SDS, regulatory,
  occupational, or generic reference support before printing.
- Production QA continues checking safe schemes, roles, sources, ordering, and
  QR supplement target metadata.

### 1.4 Telemetry, Admin Cost, And Privacy Boundaries

Status: `Gate added` on 2026-05-15.

Goal: pilot telemetry should help improve coverage without becoming a storage,
privacy, or abuse risk.

Work items:

- Completed: restricted public miss-query `context` to a small allow-list of
  non-freeform metadata keys and primitive values; unsupported keys such as
  email/free-text/nested payloads are dropped before persistence.
- Completed: added backend tests for miss-query context sanitization,
  long-allowed-scalar rejection, existing oversized payload rejection, opt-in
  behavior, and rate-limit registration.
- Completed: added maintainer retention and review rules to
  `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`: public production keeps capture
  disabled by default, pilot raw rows get monthly review and 90-day delete or
  aggregation, exports are not analytics storage, identity/free-form payloads
  stay out of miss context, and abuse is handled by disabling capture before
  loosening caps.
- Completed: added a frontend opt-in gate for dictionary miss capture. The app
  now only posts unresolved-search miss telemetry when
  `VITE_ENABLE_DICTIONARY_MISS_CAPTURE=true`; payloads are trimmed, context is
  allow-listed, and failed telemetry never affects the search flow.
- Completed: added an admin miss-query review loop. Admins can mark captured
  miss queries as `resolved`, `needs_evidence`, or `ignored`; resolved rows
  require a reviewed CAS number, and repeated capture preserves a non-open
  review state instead of reopening already triaged rows.
- Completed: added miss-query status counts to the admin report/dashboard so
  pilots can distinguish open backlog, needs-evidence work, resolved items, and
  ignored noise.
- Completed: limited the dashboard top-miss queue to open and needs-evidence
  rows so resolved/ignored high-hit searches do not keep stealing review
  attention.
- Completed: enforced miss-query retention/export scope. Admin reports now show
  purgeable stale rows, the dashboard can trigger retention cleanup, the
  maintainer CLI exposes `purge-miss-queries`, and dictionary snapshot exports
  redact miss-query context unless explicitly requested. Summary/report payloads
  also redact miss-query context because the dashboard does not need raw
  telemetry metadata for triage.
- Continue reviewing dictionary miss telemetry payload caps and rate limits
  only if a future pilot shows real abuse or storage growth.
- Decide what data is worth collecting for a public free tool and what should
  never be stored.
- Keep observability exports admin-gated and avoid user-identifying payloads
  unless explicitly justified.

Acceptance:

- Public write paths are bounded.
- Admin reports are useful but not over-collected.
- Captured miss queries can be reviewed to closure without being reopened by
  later duplicate searches.
- Abuse and privacy assumptions are documented.

### 1.5 Chinese Name Display And Curation Boundary

Status: `Gate added` on 2026-05-20.

Goal: Chinese names should help identity checks without creating false
coverage. When the dictionary does not have a real Chinese name, the UI should
not repeat English and make the user think a Chinese name was curated.

Work items:

- Completed: added a shared frontend resolver that accepts Chinese display
  names only when they contain CJK text and are not the English name repeated
  through `name_zh`, `name_zh_tw`, or `name`.
- Completed: aligned localized names, autocomplete, favorites/history,
  prepare-solution summaries, print fit scoring, label preview display, printed
  small labels, export preview, backend export payloads, and frontend CSV
  fallback to that resolver.
- Completed: added focused tests for trusted Chinese names, English-only
  placeholders, bilingual localized display, and CJK detection.
- Completed: added a Detail-modal correction path for missing trusted Chinese
  names. The generated GitHub data-correction link carries CAS and English
  name context so maintainers can review a sourced Chinese name without asking
  the user to retype the basics.
- Completed: added frontend admin curation validation for manual dictionary
  entries so English-only `name_zh` values are blocked before the backend write
  request. The backend remains the final enforcement layer.
- Completed: manual dictionary entries can now be saved as pending,
  needs-evidence, rejected, or approved. Non-approved entries remain
  admin-visible review records and are filtered out of public name/CAS lookup
  and printed/exported identity surfaces.
- Keep missing Chinese names in the data-correction/admin-curation path rather
  than using automated translation as runtime label text.
- Add examples when users find a CAS with a known Chinese name that is missing
  from the seed dictionary or manual entries.

Acceptance:

- A record with `name_zh: "Allyl Alcohol"` displays one English identity, not
  two lines of the same English name.
- A record with `name_zh: "丙酮"` still shows bilingual identity where the
  workflow expects it.
- Small labels omit the Chinese line when it is not trusted, while keeping CAS,
  English name, QR where applicable, and all GHS pictograms.
- Exported `Chinese Name` cells follow the same trust boundary as the UI; CSV
  fallback still neutralizes spreadsheet formulas in the remaining cells.
- Missing trusted Chinese names expose a contextual correction path in Detail
  instead of being silently treated as translated or complete.
- Admin manual-entry UI and backend validation both reject English-only
  `name_zh` values.
- The deployed production search UI gate verifies the missing-Chinese-name
  Detail correction path with CAS, English-name, template, label, and evidence
  body checks.

## 2. User Guidance, Low-Noise UX, And First-Time Success

Status: `Monitoring` on 2026-05-16.

Why this matters: the tool already has many capabilities. The next maturity
step is helping a first-time lab or operations user complete the main task
without reading long explanations or understanding internal print logic.

Current baseline: first-time decision guidance, narrow result/detail reading,
print recovery routing, fixed-stock batch guidance, and keyboard containment
are now covered by production QA. Keep iterating when screenshots or user
feedback show confusion; do not add more visible controls simply because an
implementation option exists.

### 2.1 First-Time Search-To-Decision Path

Status: `Gate added` on 2026-05-15.

Goal: a new user should understand what to do first and what result they are
looking at within seconds.

Work items:

- Completed: reviewed empty state, search examples, autocomplete, result row
  hierarchy, source chips, SDS links, detail action, print action, and export
  actions.
- Completed: added a compact results decision guide that fixes the first result
  path as identity check, SDS/source verification, then print/export.
- Completed: extended production search UI QA to require the decision guide and
  three decision steps.
- Completed: made common paths explicit through the result decision guide,
  result actions, SDS/detail paths, print entry, export preview, and support
  links.
- Completed: batch input now shows the exact valid unique CAS count that will
  be submitted, so duplicates and invalid paste noise do not make users expect
  a different result/history/print count.
- Completed: `qa:production-search-ui` now exercises a deployed messy-paste
  batch path with same-line CAS values, `CAS No.` / `CAS:` prefixes, duplicate
  entries, and an invalid checksum example. The gate fails if the ready
  summary, duplicate/invalid diagnostics, or enabled search handoff regress.
- Completed: `qa:production-search-ui` now opens the deployed app with
  `?cas=<CAS>` and verifies that the QR return path hydrates the single-search
  input and renders the matching result row.
- Completed: the same production gate now stores screenshots for both the
  messy-paste batch path and QR return-path hydration, so future failures can
  be reviewed from artifacts instead of relying on memory.
- Keep reducing wording that explains implementation details instead of user
  decisions when copy changes.
- Keep production QA or screenshot review for first-screen readability when UI
  changes.

Acceptance:

- A first-time user can search Hydrochloric Acid and understand identity,
  hazard visuals, source context, SDS path, and print entry without opening
  documentation.
- Result actions stay readable on desktop and 390px narrow width.

### 2.2 Print Workflow Guidance Without More Controls

Status: `Gate added` on 2026-05-16.

Goal: users should feel the app is choosing the right print output with them,
not forcing them to become layout experts.

Work items:

- Completed: added a recovery route inside the existing print-output
  diagnostics for blocked or upgraded complete-primary flows. It names the
  current physical stock, the concrete next action, and the recommended
  complete-primary stock or missing requirement without adding another
  first-screen control.
- Completed: added component coverage so dense complete-primary routing and
  missing responsible-profile states must keep the recovery route visible and
  specific.
- Completed: added a deployed production handoff case for an A4 complete
  primary label with missing responsible profile. The production runner now
  clears browser storage per case and fails if the recovery route is missing or
  does not expose the expected recovery kind.
- Keep the first-level print modal focused on physical target, output role,
  preview, and print action.
- Move rare tuning into secondary or advanced areas.
- Completed: blocked-output recovery now names the current stock, the concrete
  next action, and either the larger complete-primary stock or the missing
  responsible-profile requirement.
- Keep supplemental/quick-ID/QR labels honest and visually distinct from
  complete primary labels.

Acceptance:

- Users can tell when the app will print a complete primary label versus a
  supplemental or quick-ID output.
- Blocked states provide a usable next step, not just a warning.
- `npm run qa:production-product` remains green after UI changes.

### 2.3 Narrow And Mobile Read-First Polish

Status: `Gate added` on 2026-05-15.

Goal: mobile and narrow screens may be read/search/SDS-first rather than
print-first, but the core workflow should not visually break.

Work items:

- Completed: expanded `qa:production-search-ui` so the first-time decision
  guide must remain visible, complete, and non-vertical at 390px width.
- Continue expanding `qa:production-search-ui` when new narrow/mobile
  regressions appear.
- Review result cards, detail comparison cards, trust notes, SDS/reference
  links, and modal close/focus behavior at narrow widths.
- Do not over-invest in mobile print UX until real mobile-print usage exists.

Acceptance:

- No horizontal scrolling for core search/detail reading paths at 390px.
- Detail and SDS actions remain visible and usable.
- Complex dialogs keep focus containment and Escape behavior.

### 2.4 Accessibility And Keyboard Continuity

Status: `Gate added` on 2026-05-15.

Goal: safety workflow surfaces should stay usable by keyboard and screen-reader
users as the UI is simplified.

Work items:

- Keep shared focus-trap behavior for all modal/sidebar surfaces.
- Review aria-modal, inert, aria-hidden, labels, close buttons, and stacked
  modal ownership when dialogs are added or simplified.
- Add production or unit tests for any newly complex keyboard path.

Acceptance:

- Tab/Shift+Tab stays inside the active modal.
- Escape closes the top active layer without accidentally closing background
  layers.
- Production search UI QA continues covering Detail and Prepare Solution.

### 2.5 Fixed-Stock Batch Label Printing

Status: `Gate added` on 2026-05-16.

Goal: users should be able to print a realistic batch by choosing one physical
stock and one purpose, then reviewing which chemicals can print, which are
reduced, and which are excluded.

Owner document: `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.

Work items:

- Completed: Quick ID, Supplemental, and Complete are first-level batch
  purposes in the batch planner.
- Completed: the planner keeps one selected stock for the batch and does not
  silently mix A4/Letter, bottle, tube, rack, and QR stocks in one automatic
  print job.
- Completed: the batch fit report uses per-item categories: `ready`,
  `ready-tight`, `reduced-purpose`, `same-stock-continuation`,
  `excluded-data`, and `excluded-fit`.
- Completed: representative previews cover first included, worst fit, longest
  name, most pictograms, densest text, and excluded list.
- Completed: a true 50-item fixed-stock fixture is covered by planner tests,
  production Browser QA, product-level QA, and a print HTML/PDF artifact for a
  fixed-stock Quick ID batch.
- Keep this area in monitoring and add new examples when screenshots, QA
  failures, or real-world batch lists expose new layout or guidance issues.

Acceptance:

- One dense or missing-data chemical does not block unrelated printable labels.
- Quick ID and Supplemental batches can print truthfully without full H/P text.
- Complete batches either fit, continue on the same stock, exclude items, or
  ask the user to change purpose/stock; they never silently omit required
  content.
- Users can see included, reduced, continuation, and excluded counts before
  print handoff.

## 3. Public Documentation, README Cleanup, And Maintainer Clarity

Status: `Shipped` on 2026-05-16.

Why this matters: the project has strong internal planning docs, but the public
README must stay readable, user-facing, and aligned with the internal planning
entry points. A public tool needs clean docs that build trust.

Current baseline: public README cleanup, maintainer doc split, and docs drift
checks are complete. Treat this section as a shipped documentation baseline;
reopen it only when canonical entry points, public claims, or workflow rules
change.

### 3.1 README Encoding And Public-Facing Rewrite

Status: `Shipped` on 2026-05-15.

Goal: `README.md` should be clean, readable, and oriented toward users and
maintainers, not a corrupted historical dump.

Work items:

- Completed: replaced corrupted text with a concise, UTF-8 clean README.
- Completed: kept public-facing sections for what the tool does, safety
  boundary, local dev, production URLs, main commands, data sources,
  limitations, maintainer entry points, and correction paths.
- Completed: moved deep internal history out of the public README by pointing
  readers to the canonical planning and safety docs.
- Completed: avoided stronger legal/compliance claims than the product
  supports.

Acceptance:

- README renders cleanly on GitHub.
- A new visitor can understand the product without reading internal roadmaps.
- Maintainers can find canonical planning and QA entry points.

### 3.2 Maintainer Docs Split

Status: `Shipped` on 2026-05-15.

Goal: public docs and maintainer docs should not fight each other.

Work items:

- Completed: replaced `CLAUDE.md` with a short delegation file that points to
  `AGENTS.md`, `PROJECT_STATUS_AND_NEXT_PLAN.md`,
  `AUTONOMOUS_WORKFLOW.md`, and this future tracker instead of duplicating
  stale project context.
- Completed: added `AGENTS.md` to the README maintainer entry points.
- Keep `PROJECT_STATUS_AND_NEXT_PLAN.md` as the canonical internal planning
  entry.
- Keep `AGENTS.md` current for coding-agent/session bootstrap context.
- Keep `AUTONOMOUS_WORKFLOW.md` focused on how to continue work.
- Keep `CLAUDE.md` as a pointer only, unless the canonical entry-point order
  changes.

Acceptance:

- A new coding session can read `AGENTS.md`, `PROJECT_STATUS_AND_NEXT_PLAN.md`,
  and `AUTONOMOUS_WORKFLOW.md` and know how to proceed.
- Public README does not duplicate detailed internal backlog content.

### 3.3 Documentation Drift Checks

Status: `Gate added` on 2026-05-15.

Goal: docs should not silently contradict the product state.

Work items:

- Completed: added `npm run test:docs`, which checks runtime version alignment,
  canonical planning links, doc role statements, physical-print deferral
  wording, and future-tracker status labels.
- Completed: added the docs drift gate to CI so future pushes catch broken
  planning links or unsupported tracker status values.
- Completed: expanded `npm run test:docs` to include the active owner docs for
  data governance, simplified labels, print contract, physical print deferral,
  brand/support strategy, and scientific-skill evaluation, so those files keep
  a visible path back to `PROJECT_STATUS_AND_NEXT_PLAN.md`.
- Keep docs-only closure to `git diff --check` plus targeted `rg` checks unless
  generated docs are involved.
- When a behavior changes, update the closest owner doc instead of adding a new
  parallel roadmap.

Acceptance:

- Canonical links remain discoverable.
- Completed baseline work is not described as the next active queue.
- Deferred work is explicitly marked as deferred.

## 4. Brand Trust, Support Surfaces, And Non-Intrusive Conversion

Status: `Shipped` on 2026-05-15.

Why this matters: the tool can support brand visibility and future indirect
monetization, but it must never make printed safety labels feel promotional or
make users question whether hazard communication is being traded for ads.

### 4.1 Brand Trust Surface Rules

Status: `Shipped` on 2026-05-15.

Goal: brand presence should reinforce trust after the safety task has been
served.

Work items:

- Completed: expanded `BRANDED_UTILITY_STRATEGY.md` with a current product
  contract, surface matrix, regression expectations, and commercial-copy
  review gate.
- Keep printed labels, GHS pictograms, hazard statements, and SDS verification
  paths free of ads and unrelated promotion.
- Limit brand/support surfaces to footer, support band, help/education,
  correction paths, export metadata, or optional post-task prompts.
- Review copy tone so it feels like a useful lab utility, not a marketing page.

Acceptance:

- No safety-critical printed label content contains promotional text.
- Users can report data issues or workflow requests without feeling pushed into
  a sale.

### 4.2 Support And Feedback Funnel

Status: `Shipped` on 2026-05-15.

Goal: capture useful feedback while preserving the safety boundary.

Work items:

- Completed: documented the split between data corrections and workflow help in
  `BRANDED_UTILITY_STRATEGY.md`; existing ProductTrustPanel/Footer tests and
  production search UI QA cover the separated issue-template links.
- Keep data-correction requests separate from workflow/product requests.
- Completed: frontend support links now use structured issue-template
  prefill when context is available. Data-correction links carry evidence
  prompts such as CAS, source/evidence type, current output, expected output,
  and local context. Workflow-help links carry workflow area, goal, current
  problem, desired behavior, and examples.
- Completed: issue-form prefill now uses dropdown-compatible field values
  instead of internal app keys for `issue_type` and `workflow_area`, keeping the
  real GitHub form aligned with the repository templates. Production QA also
  rejects deployed support links that send query keys not declared by the
  selected issue form.
- Keep the low-noise workflow request path as a support link, not a first-level
  product control. Expand it only when real requests show missing categories
  such as batch labels, prepared-solution workflows, QR flows, or lab template
  support.

Acceptance:

- Feedback channels create actionable maintenance tasks.
- Safety-data corrections cannot be confused with business/service leads.

### 4.3 Educational Or Help Content

Status: `Monitoring` on 2026-05-15.

Goal: explain the tool's limitations and output roles without cluttering the
main workflow.

Work items:

- Completed: documented that help/education must support the task and must not
  become modal popups, sales heroes, or explanatory clutter.
- Add concise help content only where it reduces user confusion.
- Explain complete primary labels, supplemental labels, quick-ID labels, QR
  supplements, and why SDS/local verification still matters.
- Avoid visible in-app text that explains obvious UI mechanics.

Acceptance:

- Users understand why small labels may be supplemental.
- Help content supports the task instead of competing with it.

### 4.4 Future Conversion Experiments

Status: `Shipped` on 2026-05-15.

Goal: leave room for ethical indirect monetization without compromising the
free utility.

Work items:

- Completed: added a commercial-copy review gate that blocks conversion copy
  from GHS icons, signal words, H/P statements, SDS authority copy,
  blocked-output warnings, and printed label bodies.
- Define allowed surfaces for future brand or service prompts.
- Define disallowed surfaces: printed labels, GHS icons, hazard statements,
  warning panels, blocked-output recovery, and SDS authority copy.
- Treat any commercial copy change as a UX/trust change requiring production
  review.

Acceptance:

- Conversion experiments can be evaluated without reopening the safety
  contract.
- The free tool remains genuinely useful without forced sign-up or promotional
  interruption.

## 5. Optional Scientific Lookup Skills For Maintainer Work

Status: `Planned` on 2026-05-18, not installed.

Why this matters: future dictionary, SDS/reference, and source-conflict work
may benefit from a curated scientific lookup skill, but installing a broad
research-agent skill collection into this project would widen the agent's
behavior and dependency surface too much.

Current baseline: `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md` records the review
of `K-Dense-AI/scientific-agent-skills`. The decision is to avoid full
installation and keep a small future whitelist only.

### 5.1 Database Lookup Trial

Status: `Planned`.

Goal: use `database-lookup` as a maintainer-only evidence-gathering helper for
CAS/name/synonym/reference investigations.

Work items:

- Install only in an isolated skill sandbox or dedicated branch.
- Read the skill's `SKILL.md` and relevant references before use.
- Trial with public non-sensitive examples.
- Record raw sources queried, endpoints used, candidate evidence, and
  confidence notes.
- Keep all candidate data out of product dictionaries until reviewed.

Acceptance:

- The skill can produce evidence bundles without writing product data.
- Any candidate alias, Chinese name, SDS/reference link, or external identifier
  remains explicitly unapproved until admin/human review.

### 5.2 Literature Lookup Trial

Status: `Planned`.

Goal: use `paper-lookup` only when a source-conflict or correction request
needs DOI/PMID/PMCID/open-access evidence context.

Work items:

- Keep literature output as context, not authority.
- Prefer DOI/PMID/PMCID/OpenAlex/Crossref metadata with source URLs.
- Do not let summaries modify GHS classifications or printed hazard content.

Acceptance:

- A correction review can cite the evidence that was consulted.
- The product still tells users to verify SDS, supplier labels, and local
  rules.

### 5.3 Offline Structure Cleanup Trial

Status: `Deferred`.

Goal: use `datamol` first, then `rdkit` only if needed, for offline chemical
identity cleanup if the project adds SMILES/InChIKey curation.

Work items:

- Pin dependencies if a repo script is added.
- Keep execution offline and maintainer-only.
- Avoid adding RDKit/Datamol to the production backend request path without a
  separate design review.

Acceptance:

- Duplicate or inconsistent identity records can be detected in an offline
  report.
- No runtime query or label behavior changes just because the skill exists.

## Recommended Execution Order

1. Keep data governance and source-conflict examples monitored; add focused
   tests only when a new chemical/source case exposes ambiguity.
2. Keep first-time and low-noise UX monitored; improve copy or layout only when
   production screenshots or user feedback show confusion.
3. Keep narrow/mobile and keyboard QA extended as new complex UI paths are
   added.
4. Keep fixed-stock batch label printing in monitoring; add fixtures when new
   real-world batch lists expose new fit or guidance cases.
5. Reopen the optional scientific lookup skill whitelist only for a dedicated
   data-governance or dictionary-curation round.
6. Keep public documentation and brand/support rules stable; update them only
   when product behavior, canonical workflow, or conversion-copy boundaries
   change.

Use this order unless a production screenshot, code review finding, CI failure,
or user report points to a more urgent slice.

## Tracking Table

| Area | Current status | Next concrete step | Suggested gate |
| --- | --- | --- | --- |
| Data source conflicts | `Monitoring` | Source/ranking evidence is now visible in Detail comparison; keep expanding text-only GHS and upstream-degraded examples only when real cases appear | Backend/frontend focused tests + `qa:production-search-ui` |
| Correction intake | `Gate added` | Backend correction-request storage/API, admin review queue, public in-app correction dialog, and admin-only candidate evidence bundles are in place; maintainer dry-run candidate discovery now covers approved manual entries, local seed names, and optional Wikidata, while richer external discovery remains planned and review-only | Backend storage/API tests + focused frontend tests + `qa:production-search-ui` |
| SDS/reference authority | `Gate added` | Active/inactive reference-link curation is now visible in admin; keep role-first ordering and active-only public defaults aligned as links change | Existing reference-link tests + production search UI |
| Telemetry/privacy | `Monitoring` | Retention/export-review policy is enforced; review payload caps/rate limits only if a future pilot shows storage growth or abuse | Backend tests + admin/CLI retention checks |
| First-time UX | `Monitoring` | Keep reducing implementation wording while preserving the decision guide | Production search UI screenshots |
| Fixed-stock batch print | `Monitoring` | Keep monitoring future batch examples; production search UI now covers the current messy-paste parser fixture and QR `?cas=` return path, and new fixtures should be added when real lists expose new separators or prefixes | Batch parser/integration tests + production search UI + print PDF artifact + production batch QA |
| Print guidance copy | `Monitoring` | Keep no-GHS rows out of label selection; improve blocked/supplemental copy only when confusion persists | Production product QA |
| Narrow/mobile reading | `Gate added` | Add more cases when new narrow regressions appear | `qa:production-search-ui` |
| Accessibility | `Gate added` | Extend focus tests for new complex dialogs | Unit tests + production search UI |
| README cleanup | `Shipped` | Keep README concise and aligned with canonical docs | `git diff --check`, rendered review |
| Maintainer doc split | `Shipped` | Keep `CLAUDE.md` as a pointer only | Docs-only checks |
| Documentation drift checks | `Gate added` | Keep `test:docs` aligned when canonical docs change | `npm run test:docs` |
| Brand/support rules | `Shipped` | Structured support prefill is in place; apply the commercial-copy review gate to any future conversion change | Docs + production UX review |
| Education/help content | `Monitoring` | Add only task-supporting help where confusion persists | i18n + production walkthrough |
| Scientific lookup skills | `Planned` | Do not install now; trial only `database-lookup`, `paper-lookup`, and later `datamol` in an isolated maintainer workflow | `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md` + sandbox dry run |
