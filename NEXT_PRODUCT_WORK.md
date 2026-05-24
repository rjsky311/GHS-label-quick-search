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
The active post-95 owner doc is `PILOT_OPERATIONS_READY_PLAN.md`, and the
operator checklist is `PILOT_RUNBOOK.md`.
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

The 95% Lab-Ready Pilot target has shipped. The last 10-20 commits were
weighted toward closure docs, production QA/deploy reliability, batch result
trust, and review-only candidate discovery. That was reasonable milestone
closure work, but the next product round should not keep adding QA or print
polish by inertia. The next highest-value target is a small pilot observation
and operator loop: real trial usage should create clear maintenance decisions
instead of another open-ended backlog.

### Active Slice

Current default active slice: Pilot Operations Ready.
Use `POST_95_REPRIORITIZATION.md` as the decision packet,
`PILOT_OPERATIONS_READY_PLAN.md` as the owner doc, and `PILOT_RUNBOOK.md` as
the operator checklist. This slice should make small real pilot usage visible
through admin/report triage, export summary, and documented QA cadence instead
of relying on screenshots and chat memory.

### Exit Condition

Stop extending this slice when the pilot operator can answer, from repo docs
and existing or updated reports, what happened in the pilot, which correction
or data-quality items need action, which batch/export/UX issues appeared, and
which gate or checklist proves the app is still safe to continue using.
The target is not closed until `PILOT_OPERATIONS_READY_PLAN.md` has local,
CI, deployment, production-QA, remaining-risk, and next-rank evidence filled in.

### Next Likely Switch

Likely switch points after the pilot operator loop are: review-only
data-quality expansion for Chinese names/source evidence, batch export
usefulness, evidence-triggered low-noise UX or narrow polish, and physical
print validation once real stock and printer access are available.

### Default Order

Unless a blocker, fresh evidence, or the re-rank loop points elsewhere, continue
in this order:

Current mode:

- CI / production QA and documentation consolidation are in **maintenance**
  state: keep them healthy, but do not treat them as unfinished product work
  unless a gate fails or a workflow assumption changes.
- Product priority is now explicit: batch lookup -> batch print, batch export,
  data correction/governance, single lookup polish, then brand/support polish.
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
   supports one physical stock, Quick ID / Supplemental / Complete purpose,
   per-item fit results, representative previews, acknowledged
   reduced/continuation scope, PDF artifact coverage for a 50-item Quick ID
   batch, and deployed `qa:production-batch-print` / `qa:production-product`
   evidence. Future changes should converge toward the simplified batch rules:
   one output type, one stock, and same-output continuation labels.
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
