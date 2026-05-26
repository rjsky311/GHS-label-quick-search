# Next Product Work

This is the short live queue for autonomous product work. The canonical
planning entry point is `PROJECT_STATUS_AND_NEXT_PLAN.md`; read it first when
choosing what to do next.

Use `NEXT_REMAINING_PRODUCT_WORK.md` for detailed execution notes after the
current priority is chosen. Use `AUTONOMOUS_WORKFLOW.md` for standing approval,
stop conditions, verification, pushing, deployment, and production QA rules.
Use `PRODUCT_REQUIREMENTS_DECISIONS.md` for the current product decisions,
priority order, correction-intake direction, Chinese-name candidate policy, and
done criteria.
For the next label-printing refactor, use
`SIMPLIFIED_LABEL_OUTPUT_MODEL.md` as the active product contract.
For broad or ambiguous product decisions, use `PRODUCT_SCOPE_GATE.md` before
implementation so the goal, non-goals, acceptance criteria, and verification
gates are explicit.
For the current post-95 target selection, use
`POST_95_REPRIORITIZATION.md` after the canonical project entry point.
The shipped post-95 owner doc is `PILOT_OPERATIONS_READY_PLAN.md`, and the
operator checklist is `PILOT_RUNBOOK.md`.
The shipped short-term evidence owner doc is
`PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md`.
The Batch-First shipped/monitoring owner doc is
`BATCH_FIRST_LAB_PILOT_V1_PLAN.md`.
`LAB_READY_PILOT_95_PLAN.md` is now the shipped evidence packet for the 95%
Lab-Ready Pilot milestone, not the active unfinished target.

## Product North Star

This project is a free public GHS utility that should help lab and operations
users quickly search chemicals, understand hazard classifications, preview the
right label output, and print usable labels without becoming print-layout
experts.

The product should be:

- Useful before it is promotional.
- Trustworthy before it is clever.
- Visually calm, clear, and easy to scan.
- Honest about supplemental labels versus complete primary labels.
- Simple in label printing: three user-facing outputs instead of exposing
  internal print-planning concepts.
- Friendly to future brand visibility without putting ads, sponsor copy, or
  unrelated promotion inside safety-critical label content.

## Live Queue

This file is intentionally short and operational. It should answer what the
next autonomous slice is, why it matters now, when to stop, and when to switch
workstreams. Use `AUTONOMOUS_WORKFLOW.md` for the dynamic re-rank loop; do not
treat this queue as a permanent order.

When closing a slice, include proactive observations from the work: what newly
noticed risk, stale assumption, repeated pattern, or QA/user-purpose mismatch
should affect the next slice. If there is no new observation, say that instead
of expanding the queue by inertia.

### Current Product Thesis

The 95% Lab-Ready Pilot, Pilot Operations Ready, Pilot Evidence And
Maintainability Pass, and Batch-First Lab Pilot v1 targets have shipped. The
next product round should not keep adding QA, print polish, or admin tooling by
inertia. Choose the next major target from monitoring evidence: user-provided
batch lists, production QA failures, admin queue evidence, export handoff
confusion, or a recurring data-governance issue.

### Active Slice

Current default active slice: none from Batch-First by default. Select a new
evidence-driven slice from the shipped Batch-First monitoring baseline. Use
`BATCH_FIRST_LAB_PILOT_V1_PLAN.md` as the Batch-First owner doc. Use
`PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` as the shipped evidence packet,
`POST_95_REPRIORITIZATION.md` as the post-95 decision history,
`PILOT_OPERATIONS_READY_PLAN.md` as the shipped pilot-operations baseline, and
`PILOT_RUNBOOK.md` as the operator checklist.

Current housekeeping state: the Repository Hygiene / Code Splitting / Docs
Consolidation pass is complete. The Batch-First Lab Pilot v1
handoff/export closure slice has shipped on `main`: the print modal shows
selected item count, physical label count, physical page count, and stock
purpose consistently, backend XLSX exports split the same batch into ready,
needs-review, unresolved, and summary sheets for lab-manager triage, CI passed,
Zeabur production refreshed, and the production health, batch-print, and
product QA gates passed after `5d51401`.

The 2026-05-26 closure audit moved `Batch-First Lab Pilot v1` to
`Shipped / Monitoring`. The next slice should now be selected from monitoring
evidence instead of continuing Batch-First implementation by inertia:

1. Batch review flow monitoring: add cases only when a real batch list,
   production QA failure, or user screenshot shows review reasons or next
   actions are still unclear.
2. Batch label output confidence monitoring: add cases only when a new batch
   list, screenshot, PDF, or production gate exposes a mismatch.
3. Batch export v1 monitoring: add scope/filename/sheet improvements only when
   a lab-manager handoff example shows confusion after the new total-row and
   visible-row summary evidence.
4. Data correction and admin triage: this is the next likely product slice if
   real admin queue evidence shows maintainers still cannot identify the next
   data-quality action quickly.
5. Maintainability slice: the required low-risk extraction criterion is
   already satisfied; reopen only when the next batch/admin/data change needs a
   narrower boundary.

Current monitoring slice opened from real roster evidence:

- Excel/roster data should be used as a representative QA corpus, not imported
  wholesale into the product. Users still run bounded batches, usually up to
  100 rows.
- Deployment freshness is currently part of the evidence loop. Zeabur received
  the latest frontend commit but showed the `ghs-frontend` deployment stuck
  before build start with no build log and empty service build metadata. A
  service-name-specific `zbpack.ghs-frontend.json` now pins `frontend` as the
  app directory and `build` as the static output, and `zeabur.yaml` now uses
  the live service names (`ghs-frontend`, `ghs-backend`); after push, re-run
  `npm run qa:zeabur-deployment` and expected-SHA `npm run qa:production-health`
  before treating production QA as authoritative.
- Batch paste cleanup now includes pure numeric CAS rehyphenation, while
  duplicate, invalid-format, and checksum-failed rows remain separate. The
  representative roster fixture now also covers Chinese `CAS編號` headers,
  Excel-style decimal CAS cells such as `73183343.0`, harmless trailing
  punctuation such as `7719-09-7.`, and spreadsheet formula/date errors that
  must stay invalid.
- Real roster evidence showed a tabular-paste false-positive risk: dates,
  supplier IDs, and item numbers can pass CAS checksum after naive numeric
  rehyphenation. Batch parsing now treats spreadsheet rows with a `CAS`,
  `CAS No.`, `Cas`, or `CAS編號` header as a CAS-column extraction, and
  headerless multi-column rows only accept explicit CAS-prefixed or hyphenated
  CAS cells instead of rehyphenating every unrelated numeric cell.
- Batch review fixtures should keep missing Chinese names, unresolved searches,
  no-GHS rows, multiple-GHS rows, and upstream retry states separate.
- The real-roster review fixture is now also wired into the batch result
  workflow summary test. The UI must keep found, unresolved, label-ready,
  needs-review, and each review-action bucket separate before this monitoring
  slice can be treated as still healthy.
- Batch result summaries now include a review action queue and keep upstream
  retry rows out of the unresolved lookup count; use that as the baseline for
  future "what should I do next?" UI instead of adding another competing review
  surface.
- Export preview ready scope is aligned with the backend XLSX `Ready Rows`
  sheet: ready means GHS data with no review reason, while needs-review and
  unresolved rows remain separate scopes.
- Export preview now shows the selected scope's ready, needs-review, and
  unresolved counts before download, so lab managers can decide whether they
  are exporting a working handoff or a cleanup queue without opening the file
  first.
- Upstream/source outages stay in needs-review retry scope instead of
  unresolved identity scope, matching the data-quality rule that transient
  PubChem failures should not become correction requests.
- Production Print QA now writes a failure triage bucket into the summary JSON
  and GitHub job summary, separating upstream/source outages, image/QR asset
  load failures, deployment freshness problems, QA-runner failures, and true
  product print/layout regressions. Use that bucket before opening another
  product fix from a scheduled QA email.
- Admin triage now promotes the first recommended focus into a primary action
  card before the metric grid, so the maintainer can see the next data-quality
  action without scanning every correction, unresolved-search, candidate, and
  telemetry counter first. The primary action and each recommended focus row
  now carry stable target queues, human-readable target labels, and open the
  related admin section, keeping the dashboard oriented around "what should I
  handle next?" rather than summary-only reporting. Keep future admin work
  oriented around this operator-first pattern.
- Candidate discovery dry-run reports now summarize no-candidate rows,
  candidate-found rows, and evidence-type counts before the item list. Use
  those summary counts when deciding whether a queue needs manual review,
  source expansion, or no action; do not wire external discovery into runtime
  lookup without a separate source/cost decision.

### Exit Condition

Stop extending this target: `BATCH_FIRST_LAB_PILOT_V1_PLAN.md` now records
shipped evidence that a representative 50-100 item batch can complete lookup,
review, selected label print handoff, export, and correction/admin routing with
clear review reasons and no hidden data/print state. The target also satisfied
the maintainability criterion. Future work should be a new evidence-driven
slice, not more Batch-First closure work.

Current closure note: `PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md` remains
`Shipped`; do not reopen it unless new pilot evidence contradicts its
conclusions.

### Next Likely Switch

Likely switch points inside this target are: a failed Batch-First closure
audit, multiple-GHS confirmation clarity, correction/admin queue triage,
export-handoff confusion from real use, or a new production/user-provided
blocker. Physical print validation remains deferred until real stock and
printer access are available.

### Default Order

Unless a blocker, fresh evidence, or the re-rank loop points elsewhere, continue
in this order:

Current mode:

- CI / production QA and documentation consolidation are in **maintenance**
  state: keep them healthy, but do not treat them as unfinished product work
  unless a gate fails or a workflow assumption changes.
- Code splitting is also now in **maintenance** state after the lazy-loading
  pass: `npm run build` should stay free of the 500 kB chunk warning, with the
  heavy print/admin/detail/export surfaces outside the initial app chunk. Do
  not continue splitting solely for line-count or bundle aesthetics unless a
  measured regression appears. Use `npm run qa:bundle-budget` after
  `npm run build` as the local guardrail: it records
  `build/bundle-budget-report.json` and fails if the initial app chunk or the
  critical lazy print/admin chunks cross their explicit raw/gzip budgets or get
  accidentally merged back into the app shell. CI now runs this budget gate
  after frontend build, so future code-splitting work should start from a
  failing or drifting budget report rather than a general cleanup instinct.
- Product priority should now be selected from monitoring evidence after
  `Batch-First Lab Pilot v1`: batch lookup, batch review clarity, batch print,
  batch export, correction/admin triage, and maintainability are shipped
  baselines. Single lookup polish and brand/support polish should wait unless
  new evidence proves they block the batch path or a newly selected product
  slice.
  The correction-request backend store/API, admin review queue, and public
  in-app correction dialog are now in place. Admin correction requests can now
  carry review-only candidate evidence bundles for missing Chinese names and
  unresolved searches, and stored bundles can now create pending manual-entry
  review records from the dashboard and write conversion metadata back to the
  originating correction request; generated or external suggestions must still
  remain admin-reviewed candidates before they can affect public lookup,
  labels, or exports. The next data-governance slice is an external discovery
  sandbox only after a scope/cost/source decision, or further admin reporting
  if real queue evidence shows maintainers still cannot tell what happened.
  The backend candidate-evidence payload boundary is now hardened first:
  candidate bundles are allow-listed, bounded, safe-url-only, and forced to
  review-only flags before storage. `CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md`
  now pins the future external-discovery contract before any service or skill
  is wired into the app.
- Physical print validation is **deferred** until real paper, stock, printer,
  and QR-scan evidence can be collected.
- While physical printing is deferred, fixed-stock batch label printing is now
  in gate/monitoring state. The default active continuation targets are data
  governance / safety boundaries, low-noise UX, and narrow/mobile polish. Track
  non-physical-print work in `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`;
  use `BATCH_LABEL_PRINT_REFACTOR_PLAN.md` before changing batch behavior.
- The product simplification decision for label printing is now the active
  implementation baseline: `SIMPLIFIED_LABEL_OUTPUT_MODEL.md` supersedes the
  old first-level print UI model. Keep future print work inside the three
  outputs before adding more stock, purpose, density, or front-label options.
- Current print closure item from 2026-05-18: the A4/Letter complete-primary
  overflow fix is deployed and covered by `test:print-contract`,
  `qa:print-pdf`, `qa:production-batch-print`, and `qa:production-primary`.
  Keep monitoring this class of issue, but return the default continuation
  target to data governance / safety boundaries and low-noise UX polish.
- Completed current slice: batch search input is normalized, deduplicated, and
  checked for CAS format/checksum before the backend call. The UI summarizes
  ignored duplicates and invalid entries early, because bad batch input is a
  major source of later label-print confusion. The parser now also accepts
  same-line space-separated CAS values with `CAS No.` / `CAS:` prefixes without
  splitting the spaces that belong inside one CAS token. The batch panel now
  names the exact valid unique CAS count that will be submitted. The same
  normalized CAS path now feeds search history and bounded frontend
  observability, so duplicate or invalid raw paste content does not leak into
  later diagnostics. `qa:production-search-ui` now covers that deployed
  messy-paste path, including the ready summary, duplicate/invalid diagnostics,
  and enabled search handoff.
- Completed current slice: the production search UI gate now covers the QR
  return path by opening the deployed app with `?cas=<CAS>`, checking that the
  single-search input hydrates, and verifying the matching result row appears.
  QR labels therefore stay connected to a real lookup path, not just a
  printable QR bitmap. The same gate now also retries the initial deployed
  search attempt instead of aborting on one transient result-row timeout.
- Completed current slice: Chinese-name display now uses a shared trust helper
  across localized names, favorites/history/autocomplete, prepare-solution
  summaries, print preview/scoring, printed labels, export preview, backend
  export payloads, and frontend CSV fallback. English-only placeholders are
  omitted instead of being shown as Chinese.
- Completed current slice: missing trusted Chinese names now have a contextual
  Detail correction link that pre-fills CAS and English-name evidence context.
  The admin manual-entry UI also blocks English-only `name_zh` before submit,
  matching the backend validation boundary. `qa:production-search-ui` now
  includes a mocked production check for that correction path.
- Completed current slice: admin manual dictionary entries now carry review
  status (`approved`, `pending`, `needs_evidence`, `rejected`). Only approved
  manual entries affect public lookup, display names, labels, or exports;
  pending/needs-evidence rows remain visible and directly actionable for admin
  curation and dictionary snapshot review.
- Completed current slice: data-quality issue links are now shared across
  result rows and Detail for missing Chinese names, no-GHS data gaps,
  text-only GHS without pictograms, and source-conflict review. Upstream
  transient failures remain retry states and do not become correction links.
  The production search UI gate now asserts those correction links keep their
  data-correction template and CAS context.
- Completed current slice: contextual support links now prefill the structured
  GitHub issue-form fields instead of relying only on free-form bodies. Data
  corrections carry CAS/name, issue type, current output, expected output,
  evidence type, and local context; product-trust workflow help carries the
  workflow area, goal, current problem, desired behavior, and examples while
  generic footer links stay low-pressure. Production search UI QA now checks
  those structured fields where deployed context exists. The deployed gate now
  specifically covers missing Chinese names, no-GHS data gaps, and
  source-conflict review in both result-row and Detail paths.
- Completed current slice: unresolved not-found search rows now expose a
  structured `unresolved-search` correction link for dictionary curation
  instead of ending at a dead error message. Upstream transient failures remain
  retry-only states. Production search UI QA now includes a mocked deployed
  unresolved lookup to keep this correction path from regressing.
- Completed current slice: structured support links now match the GitHub
  issue-form dropdown schemas instead of sending internal app keys as dropdown
  values. Data-correction links keep machine issue keys in the generated issue
  body, but `issue_type` uses a valid issue-template option; product-trust
  workflow links do the same for `workflow_area`. Data-correction evidence
  prompts now stay in the body, while `evidence_type` uses one valid dropdown
  option. Unit tests now compare generated dropdown values and prefill field
  ids with the actual issue-template option and field-id lists. The production
  search UI gate now also reads the issue-template dropdown options and field
  ids directly instead of keeping separate hard-coded lists, and treats schema
  compatibility as part of the deployed support-link contract.
- Completed current slice: user requirements were pinned in
  `PRODUCT_REQUIREMENTS_DECISIONS.md`. The project now treats batch
  lookup/print/export as the highest-value workflow, keeps three public label
  outputs, routes future generated Chinese names through candidate/admin review,
  and prefers in-app correction intake stored in the backend pilot/admin SQLite
  store over GitHub issue-first correction.
- Completed current slice: correction-request storage/API now exists in the
  backend pilot/admin SQLite flow, with public bounded submissions, admin list
  and status update endpoints, dashboard status counts, and an admin review
  queue. This turns data-quality reports into reviewable records before any
  public dictionary, label, or export output can change.
- Completed current slice: converted correction candidates are now visible from
  the admin overview as a traceable list, not only as a summary count. Each row
  keeps its review-only candidate evidence and pending-manual-entry state, so a
  maintainer can continue curation without implying public data has changed.
  The ordinary open correction summary excludes those converted rows, keeping
  the overview focused on unconverted next-action items.
- Completed current slice: correction candidate evidence payloads are now
  sanitized at the backend API boundary. Unknown fields are dropped, candidate
  evidence URLs must use `http` or `https`, text fields are capped, CAS values
  are normalized, and the stored payload always remains review-only
  (`approved_for_public_use: false`, `public_data_changed: false`). Public
  submissions cannot set manual-review conversion metadata; only admin
  status-update flows can mark a candidate as converted to manual review.
- Completed current slice: added `CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md` and
  included it in the docs drift gate. Future Wikidata, PubChem synonym, NCI,
  LLM, or scientific-skill candidate discovery now has a dry-run-first contract
  with review-only evidence bundles and no public-data side effects.
- Completed current slice: added a maintainer-only candidate discovery dry-run
  implementation. `backend/candidate_discovery.py` builds review-only
  candidate evidence bundles; `backend/scripts/discover_candidates.py` can
  inspect one CAS or open/candidate correction requests. It reads approved
  manual entries and the local seed dictionary by default, can resolve exact
  local names to CAS for unresolved-search rows, requires explicit opt-in for
  Wikidata network lookup, and never writes approved data or changes public
  lookup, labels, exports, or QR targets.
- Completed current slice: batch result pages now include a low-noise workflow
  summary above the table. Multi-row results show found count, label-ready
  count, rows needing data review, and export scope before the user starts
  selecting labels or downloading files. This makes the batch path easier to
  judge without opening the print modal first.
- Completed current slice: batch review reasons are now actionable instead of
  passive warnings. The summary separates source conflicts from multiple GHS
  classifications, lets users filter the table by a specific review reason,
  and makes the multiple-GHS row chip open the alternate-classification chooser
  so the user can confirm the primary version before print/export. CSV/XLSX
  exports now keep printable/review state, review reasons, source conflict,
  missing trusted Chinese name, and multiple-GHS confirmation status. The print
  modal also warns before handoff when the selected batch still contains
  unconfirmed multiple-GHS items, without blocking users who accept the
  system-suggested primary version.
- Completed current slice: the batch workflow summary now stays batch-wide
  even when the table is filtered. The visible-row scope is still shown
  separately, so users can distinguish "what is in the whole batch" from
  "what the next print/export action will affect."
- Completed current slice: `qa:production-search-ui` now follows the deployed
  batch input normalization path through an actual batch search result and
  fails if the batch workflow summary disappears, reports the wrong total row
  scope, or shows a filtered-scope note when no filter is active.
- Completed current slice: `qa:production-health` can now require an expected
  frontend bundle marker via `PRINT_QA_EXPECTED_ASSET_TEXT` or
  `PRODUCTION_HEALTH_EXPECTED_ASSET_TEXT`. Use this after frontend UI changes
  when Zeabur reports success but the production URL may still be serving an
  older Vite asset.
- Completed current slice: Vite production builds now emit `/build-info.json`
  with app version, git SHA, branch, build time, and Node version.
  `qa:production-health` can compare this file with
  `PRODUCTION_HEALTH_EXPECTED_GIT_SHA`, `PRINT_QA_EXPECTED_GIT_SHA`, or the
  GitHub workflow SHA, so stale Zeabur deployments fail with explicit commit
  evidence instead of only passing a generic 200 OK health check.
- Completed current slice: the main `CI` workflow now has a manual
  `workflow_dispatch` fallback. If future pushes show Zeabur deployment checks
  but no automatic GitHub Actions `CI` run, trigger `gh workflow run CI --ref
  main` and watch that run instead of treating the missing run as a pass.
- Completed current slice: the batch workflow summary now calls the final
  card "Batch rows" instead of "Export scope" because the cards summarize the
  whole batch while export buttons still follow the currently visible filtered
  scope.
- Completed current slice: batch results now show compact review-reason chips
  under the workflow summary, so a high "Needs review" count is immediately
  explainable as unresolved lookup, no GHS data, source conflict, missing
  Chinese name, upstream error, or text-only GHS data. Production search UI QA
  now fails if a nonzero review count has no reason breakdown.
- Completed current slice: Zeabur deploy freshness is now part of the working
  agreement. This round showed GitHub CI can pass while the frontend production
  service remains on the previous Vite asset because no Zeabur deployment was
  created for the latest commit. `AUTONOMOUS_WORKFLOW.md` and
  `PROJECT_STATUS_AND_NEXT_PLAN.md` now document the Zeabur CLI deployment
  check and safe frontend `service redeploy` fallback before production QA.
- Completed current slice: Zeabur deploy freshness now has a repeatable
  `npm run qa:zeabur-deployment` gate. The report distinguishes missing
  deployments, expected commits stuck before build start, non-`RUNNING`
  deployments, and stale `RUNNING` production commits, so future work does not
  rely on manual CLI JSON comparison before production QA.
- Completed current slice: production verification now explicitly separates
  code failures from external platform/access failures. If GitHub Actions fails
  at checkout with 403/account access, or Zeabur creates a deployment that
  never reaches build start and emits no build log, the next action is account
  or platform recovery plus a fresh CI/deploy rerun, not more product-code
  churn.
- Completed current slice: documentation drift checks now cover the active
  owner docs for data governance, simplified labels, print contract, physical
  print deferral, brand/support strategy, and scientific-skill evaluation. Each
  owner doc now points back to `PROJECT_STATUS_AND_NEXT_PLAN.md`, reducing the
  chance that future continuation work starts from a stale local plan.
- Completed current slice: Detail same-chemical comparison now shows compact
  source/ranking evidence for each public classification: current selection,
  report count, source family, and pictogram/H/P coverage. The same evidence is
  rendered in desktop tables and narrow cards, with `qa:production-search-ui`
  checking deployed coverage.
- Completed current slice: dictionary miss telemetry now has an admin review
  closure path. The dashboard can mark captured misses as resolved with CAS,
  needs-evidence, or ignored, and duplicate capture preserves already reviewed
  non-open rows.
- Completed current slice: miss-query retention/export scope is now enforceable.
  Admin reports show purgeable stale rows, the dashboard and maintainer CLI can
  clean stale telemetry, and dictionary exports redact miss-query context unless
  explicitly requested.
- Completed current slice: admin reference links now have active/inactive
  curation status. Inactive links stay visible in admin lists, overview counts,
  and snapshots, but public lookup, Detail, QR target selection, labels, and
  exports keep active-only defaults. Recent links can be activated or
  deactivated directly without retyping the same URL.
- Completed current slice: admin curation lists now share the same newest-first
  review posture. Recent manual entries, aliases, and reference links show
  explicit status badges so maintainers can spot fresh pending or
  needs-evidence work without confusing it with older approved records. Alias
  review counts are now visible beside manual-entry and reference-link status
  counts in the admin overview, and pending or recent aliases can be approved,
  marked needs-evidence, or rejected directly from the list. Recent manual
  dictionary rows can also be approved, marked needs-evidence, or rejected
  directly without retyping the same CAS/name payload.
- Completed current slice: the first maintainability extraction pass landed
  without changing product behavior. Admin triage UI now lives in
  `PilotTriagePanel`, print modal helper/config logic lives in
  `labelPrintModalHelpers.js`, rendered print overflow inspection lives in
  `printLayoutInspection.js`, and backend export trust/summary logic lives in
  `export_helpers.py`. Focused frontend and backend tests passed; future
  refactors should now be pulled by a specific batch/data/print slice rather
  than by line count alone.
- Completed current slice: the maintainability extraction pass was extended
  one bounded step. More `LabelPrintModal` pure helpers now live in
  `labelPrintModalHelpers.js`, correction candidate evidence UI now lives in
  `CorrectionCandidateEvidence.jsx`, and admin curation status/sort helpers
  now live in `pilotDashboardHelpers.js`. `LabelPrintModal.jsx` is now 3,871
  lines and `PilotDashboardSidebar.jsx` is now 1,824 lines. The combined
  focused frontend test run passed for label print, pilot dashboard, and print
  labels.
- Completed current slice: a further bounded maintainability pass split
  complete-label continuation pagination into `printContinuationPagination.js`
  and H/P statement print-priority scoring into `printStatementPriority.js`.
  Admin curation status-count summaries now share `CurationStatusSummary`.
- Completed current slice: print stylesheet, preview stylesheet generation,
  print-render text/identity/pictogram helpers, required print-image
  preflight, and print document layout/model helpers moved out of
  `printLabels.js`. Current worktree counts are `printLabels.js` 1,472 lines,
  `printDocumentLayoutHelpers.js` 483 lines, `printImagePreflight.js` 80
  lines, `printRenderHelpers.js` 148 lines, `printLifecycle.js` 239 lines,
  `printLabelStyles.js` 1,847 lines, `printPreviewStyles.js` 164 lines,
  `LabelPrintModal.jsx` 1,750 lines,
  `LabelPrintFooter.jsx` 49 lines, `MultipleGhsPrintWarning.jsx` 56 lines,
  `LabelPreviewPanel.jsx` 235 lines, `SelectedLabelsControls.jsx` 245 lines,
  `PreviewDiagnosticsPanel.jsx` 168 lines, `StockSizeSelector.jsx` 104 lines,
  `PrintOutputPlanDetails.jsx` 129 lines, `LabelOutputSelector.jsx` 72 lines,
  `BatchFitReport.jsx` 291 lines, `LabelAdvancedPrintOptions.jsx` 411 lines,
  `LabelPrintOutcomeSections.jsx` 179 lines, `LabelPreviewSection.jsx` 162
  lines, `labelPrintModalOptions.js` 113 lines,
  `LabelPrintConfigControls.jsx` 115 lines,
  `ResponsibleProfileControls.jsx` 120 lines, `SavedPrintControls.jsx` 237
  lines, `PilotDashboardSidebar.jsx` 1,076 lines,
  `PilotDictionaryForms.jsx` 306 lines, `PilotRecentCurationLists.jsx` 280
  lines, `PilotCorrectionRequestSections.jsx` 330 lines, `server.py` 1,613
  lines, `pilot_admin_routes.py` 281 lines, `api_models.py` 363 lines,
  `api_validation.py` 229 lines, `export_helpers.py` 204 lines, and
  `pilot_store.py` 1,639 lines.
- Completed current slice: backend pilot/admin endpoints for ops reports,
  dictionary curation, correction intake/review, miss-query retention, and
  workspace documents now live in `backend/pilot_admin_routes.py`. `server.py`
  is down to 1,613 lines while keeping shared admin verification, limiter
  setup, cache state, and public search/export routes in the main orchestrator.
- Completed current slice: preview-only print stylesheet sizing/scaling now
  lives in `frontend/src/utils/printPreviewStyles.js`. `printLabelStyles.js`
  is down to 1,847 lines and remains focused on printable CSS.
- Completed current slice: print lifecycle metadata, layout-blocked alert text,
  and QA handoff pending/blocked/ready status publishing moved out of
  `printLabels.js` into `frontend/src/utils/printLifecycle.js`, reducing the
  print orchestrator to 2,287 lines while preserving print contract tests and
  QA handoff status behavior.
- Completed current slice: compact pictogram pagination, print-template
  normalization, localized statement/signal text, identity density, and
  renderer text truncation moved into
  `frontend/src/utils/printRenderHelpers.js`, reducing the print orchestrator
  to 2,134 lines while preserving focused print-label and print QA tests.
- Completed current slice: the live preview panel shell, outcome summary
  composition, preview warning banner, and diagnostics composition moved out of
  `LabelPrintModal.jsx` into `components/label-print/LabelPreviewPanel.jsx`.
  Selected-label quantity/removal controls moved into
  `components/label-print/SelectedLabelsControls.jsx`. The modal is now 1,865
  lines while preserving existing `LabelPrintModal` tests.
- Completed current slice: multiple-GHS print warning UI and the sticky modal
  footer/action bar moved into `MultipleGhsPrintWarning.jsx` and
  `LabelPrintFooter.jsx`. The modal is now 1,750 lines while preserving
  existing `LabelPrintModal` and print-all integration tests.
- Completed current slice: fixed-stock batch fit report, representative preview
  selector, compact-fallback inclusion control, and batch review/export list
  moved out of `LabelPrintModal.jsx` into
  `components/label-print/BatchFitReport.jsx`, reducing the modal to 2,614
  lines while preserving the batch-print test surface.
- Completed current slice: simplified output-type selector moved out of
  `LabelPrintModal.jsx` into
  `components/label-print/LabelOutputSelector.jsx`, reducing the modal to 2,554
  lines while preserving the three-output test ids and selection behavior.
- Completed current slice: output-plan explanation, recovery route, decision
  summary, and embedded batch fit report moved out of `LabelPrintModal.jsx`
  into `components/label-print/PrintOutputPlanDetails.jsx`, reducing the modal
  to 2,476 lines while preserving the existing plan/recovery/decision test ids.
- Completed current slice: selected-stock summary, first-level stock picker,
  and secondary stock controls moved out of `LabelPrintModal.jsx` into
  `components/label-print/StockSizeSelector.jsx`, reducing the modal to 2,395
  lines while preserving existing stock summary and picker test ids.
- Completed current slice: preview output checks, preview checklist, hint
  panel, and sheet-layout preview details moved out of `LabelPrintModal.jsx`
  into `components/label-print/PreviewDiagnosticsPanel.jsx`, reducing the modal
  to 2,248 lines while preserving preview diagnostics and sheet-preview test
  ids.
- Completed current slice: the real print-fragment preview panel moved out of
  `LabelPrintModal.jsx` into
  `components/label-print/LabelPreviewSection.jsx`, reducing the modal to
  2,868 lines while preserving preview page navigation, Fit/Inspect zoom, iframe
  rendering, and inspection metadata.
- Completed current slice: recommended-output and print-outcome summaries
  moved out of `LabelPrintModal.jsx` into
  `components/label-print/LabelPrintOutcomeSections.jsx`, reducing the modal
  to 2,926 lines without changing readiness tone, profile-blocked actions,
  or supplemental-label routing. Focused `LabelPrintModal` tests, docs drift,
  diff check, and frontend build passed.
- Completed current slice: documentation audit refreshed the active planning
  docs after the latest extraction slices. `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`
  now treats `?cas=` QR return hydration as implemented baseline, the active
  batch owner doc no longer lists already-split pagination/stylesheet work as
  remaining candidate work, and the detailed backlog scopes compact renderer
  checks to the three public outputs before reopening older internal stock
  families.
- Completed current slice: advanced print options moved out of
  `LabelPrintModal.jsx` into
  `components/label-print/LabelAdvancedPrintOptions.jsx`, reducing the modal
  to 3,047 lines without changing template, density, calibration, custom
  field, saved-template, or recent-print handlers. Focused `LabelPrintModal`
  tests, docs drift, diff check, and frontend build passed.
- Completed current slice: admin dictionary add forms moved out of
  `PilotDashboardSidebar.jsx` into
  `components/pilot/PilotDictionaryForms.jsx`, reducing the sidebar to 1,563
  lines without changing admin save handlers, payloads, or API behavior.
  Focused `PilotDashboardSidebar` tests and docs drift checks passed.
- Completed current slice: recent alias, manual-entry, and reference-link
  review lists moved out of `PilotDashboardSidebar.jsx` into
  `components/pilot/PilotRecentCurationLists.jsx`, reducing the sidebar to
  1,385 lines while preserving existing row test ids and decision handlers.
  Focused `PilotDashboardSidebar` tests passed.
- Completed current slice: converted correction candidates, top correction
  request review, and recent correction-request rendering moved out of
  `PilotDashboardSidebar.jsx` into
  `components/pilot/PilotCorrectionRequestSections.jsx`, reducing the sidebar
  to 1,076 lines while preserving existing correction-request test ids and
  decision handlers. Focused `PilotDashboardSidebar` tests passed.
- Completed current slice: saved print presets and recent print queue controls
  moved out of `LabelPrintModal.jsx` into
  `components/label-print/SavedPrintControls.jsx`. Focused
  `LabelPrintModal` tests passed.
- Completed current slice: static label-print option definitions moved out of
  `LabelPrintModal.jsx` into
  `components/label-print/labelPrintModalOptions.js`. Focused
  `LabelPrintModal` tests passed.
- Completed current slice: config button grid and stock-choice card UI moved
  out of `LabelPrintModal.jsx` into
  `components/label-print/LabelPrintConfigControls.jsx`. Focused
  `LabelPrintModal` tests passed.
- Completed current slice: responsible-profile controls moved out of
  `LabelPrintModal.jsx` into
  `components/label-print/ResponsibleProfileControls.jsx`. Focused
  `LabelPrintModal` tests passed.
- Completed current slice: backend API payload models and bounded validation
  helpers moved out of `backend/server.py` into `backend/api_models.py` and
  `backend/api_validation.py`. `server.py` re-exports the existing model and
  constant names for compatibility. Backend compile and full backend pytest
  passed.

1. Data governance and safety boundaries for PubChem/ECHA/SDS/manual-reference
   flows. Use this as the active continuation target while physical printing is
   deferred. The policy lives in `DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md`;
   the detailed future tracker lives in
   `FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md`. The optional external
   scientific-skill evaluation lives in
   `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`; do not install the full
   `scientific-agent-skills` repo, and only reopen its whitelist for
   maintainer-side data lookup or evidence gathering. Keep source/QR/admin
   changes aligned with that policy and add tests when behavior changes. Keep
   missing Chinese names as a curation issue, not a display fallback that
   repeats English; missing-name correction links should remain evidence-first
   and admin-reviewed.
   Current baseline includes effective-classification source/report-count
   alignment, export-preview/CSV/XLSX trust columns, and contextual
   data-quality correction links with structured issue-form prefill. Detail
   comparison now also exposes source/ranking evidence directly beside
   alternate classifications.
2. Harden and monitor the simplified three-output label workflow in
   `SIMPLIFIED_LABEL_OUTPUT_MODEL.md`: complete A4/Letter label, QR small
   label, and identification small label. New work should improve QA,
   production verification, batch coverage, or visual polish without
   reintroducing old first-level complexity. Immediate focus: complete A4/Letter
   dense-content pagination must stay verified in PDF and deployed production
   QA.
   Current related follow-up: keep the simplified batch input path covered in
   regression QA so only valid, unique CAS values feed batch results, history,
   telemetry, and print counts; add new messy-paste fixtures when real batch
   lists expose another separator or formatting pattern. The current deployed
   production-search UI gate already checks same-line CAS, `CAS No.` / `CAS:`
   prefixes, duplicates, and invalid checksum examples. It also checks
   `?cas=` hydration so QR labels scan back into the single-search workflow.
3. Keep CI and production QA operationalization healthy. The GitHub Actions
   `Production Print QA` workflow now defaults to the product-level closure
   gate, with split modes for focused reruns.
4. Keep documentation consolidation and autonomous continuation hygiene healthy.
   `PROJECT_STATUS_AND_NEXT_PLAN.md` is the canonical planning entry point, and
   `PRODUCT_SCOPE_GATE.md` is the project-level alignment process for broad
   slices where "what good looks like" is not already explicit.
5. Fixed-stock batch label printing. Keep this in monitoring unless a new
   screenshot, QA failure, or product change reopens it. The current baseline
   supports one physical stock, the three public outputs (Complete A4/Letter,
   QR small label, Identification small label), per-item fit results,
   representative previews, acknowledged reduced/continuation scope, PDF
   artifact coverage for a 50-item compact batch, and deployed
   `qa:production-batch-print` / `qa:production-product` evidence. Future
   changes should converge toward the simplified batch rules: one output type,
   one stock, and same-output continuation labels.
6. Physical print validation for real paper, label stock, printer scaling, QR
   scan success, and pictogram readability. The checklist now lives in
   `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`, and
   `npm run qa:physical-print-plan` generates the current physical-print work
   order from `build/print-qa-report.json`. Real-printer execution is deferred
   until physical stock and printer access are available.
7. User guidance, brand utility, low-noise UX, and narrow/mobile read-first
   polish. Search-result and detail-comparison read-first layouts are now
   covered at 390px by `qa:production-search-ui`; the same production gate
   also checks Detail/Prepare Solution modal keyboard containment. Keep
   extending that gate when mobile, narrow, or modal behavior changes.

## Current Detailed Backlog

The detailed execution backlog lives in
`NEXT_REMAINING_PRODUCT_WORK.md`:

1. Print renderer and stock fit robustness.
2. Result table and GHS pictogram visual unity.
3. Trust, source, SDS, and safety boundaries.
4. Prepared solution and reprint workflow maturity.
5. Whole-product UX and brand-utility convergence.
6. Fixed-stock batch label printing, tracked in
   `BATCH_LABEL_PRINT_REFACTOR_PLAN.md`.
7. Optional scientific lookup skill trials, tracked in
   `SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`.
8. Product scope gate decisions, tracked in `PRODUCT_SCOPE_GATE.md` when a
   future slice needs pre-implementation alignment.

Treat the older `NEXT_PRINT_WORKSTREAMS.md` and
`PRINT_OUTPUT_REFACTOR_PLAN.md` as v1.10 baseline context unless a new failure
proves the baseline needs to be reopened.

## Completion Rule

A product slice is not complete just because code or docs changed. Close each
slice with the relevant test/QA evidence, update the affected docs, and for
production-facing UI changes verify the deployed Zeabur frontend path before
claiming the work is stable.
