# Data Governance And Safety Boundaries

This document defines how the app treats chemical identity, GHS classifications,
SDS/reference links, manual curation, telemetry, and source conflicts. It is a
product and engineering guardrail, not legal advice. Users must still verify
against the official SDS, supplier label, and local regulations.

Use `PROJECT_STATUS_AND_NEXT_PLAN.md` for current priority, continuation order,
and done criteria before changing these boundaries.
Use `PRODUCT_REQUIREMENTS_DECISIONS.md` for the current batch-first product
priority, in-app correction-intake direction, and Chinese-name candidate policy.

## 1. Source Roles

The app uses multiple data sources with different roles:

| Source | Role | Product treatment |
| --- | --- | --- |
| PubChem GHS data | Primary automated hazard lookup | Useful starting point; transient failures must be visible |
| ECHA report/source strings | Preferred regulatory signal when present in PubChem reports | Ranked higher when report count is otherwise tied |
| Local seed dictionary | Search/name resolution aid | Does not override current GHS hazard data |
| Manual dictionary entries | Admin-curated search/name resolution aid | Admin-gated; must not be treated as hazard classification authority |
| Manual reference links | Admin-curated verification aids | Admin-gated; only `http`/`https`; typed as SDS, regulatory, occupational, or reference |
| SDS/supplier/local rules | Final authority for real use | Always mentioned in trust copy as required verification |

Manual entries and aliases can help users find a CAS number. They must not
silently replace PubChem/ECHA hazard classifications or weaken upstream-error
handling.

Manual dictionary entries now carry an explicit review status:
`approved`, `pending`, `needs_evidence`, or `rejected`. Only `approved`
manual entries are allowed to participate in public name/CAS lookup, Chinese
display-name resolution, labels, or exports. `pending` and `needs_evidence`
entries are admin curation records only; they can preserve work-in-progress
candidate names without making those candidates visible to users.

Admin curation lists should preserve that boundary visually. Manual entries,
aliases, and reference links should sort recent rows by latest update first and
show explicit status badges. Admin summaries should expose review-state counts
for manual entries, aliases, and reference links so maintainers do not mistake
stale approved or retired records for active review work.

Manual alias changes are explicit curation actions. Admin updates may change a
final alias status when the maintainer approves, marks needs-evidence, or
rejects it, but automated synonym capture must not downgrade an already
approved, needs-evidence, or rejected alias. Manual dictionary status changes
should also be explicit curation actions: approved entries may affect public
identity helpers, while needs-evidence or rejected entries remain admin-only
records.

### Chinese Name Coverage

Chinese chemical names are identity aids, not hazard authority. The local seed
dictionary and admin manual entries can provide Traditional Chinese display
names, but the app must not invent or fake a Chinese name when coverage is
missing.

The existing seed dictionary includes Chinese names that were generated with
Gemini 3.1 Pro. Treat that seed as the current project baseline, but do not
extend that precedent into unreviewed runtime behavior: future LLM,
translation, Wikidata, PubChem synonym, NCI resolver, EPA CompTox, or other
external suggestions are candidate evidence until admin-approved.

Rules:

- If a search result only has an English name, printed small labels should keep
  the English name and omit the Chinese line rather than repeating English as
  fake Chinese.
- Frontend display surfaces must use the shared trusted-Chinese-name resolver:
  a value is printable/displayable as Chinese only when it contains CJK text and
  is not just the English name repeated through `name_zh`, `name_zh_tw`, or
  `name`.
- Results, detail/localized-name helpers, favorites, history, autocomplete,
  prepare-solution summaries, label previews, print layout scoring, and printed
  labels should share that resolver so the same chemical identity does not look
  different across workflows. Export preview, CSV/XLSX payload preparation, and
  frontend CSV fallback must use the same resolver; backend CSV/XLSX export
  endpoints must also enforce the same CJK-only Chinese-name boundary for
  direct API callers.
- When a known CAS/name pair is missing a Chinese display name, add it through
  the local dictionary or an admin-reviewed manual dictionary entry with source
  evidence. Admin manual entries should accept an empty `name_zh` while the
  name is unknown, but must reject English-only `name_zh` values so the source
  of truth does not create fake Chinese identity.
- Detail views may expose a contextual data-correction link when a result has
  an English identity but no trusted Chinese name. That link should carry CAS
  and English-name context, but the submitted correction still needs SDS,
  supplier-label, or regulatory evidence before it becomes an accepted
  dictionary/manual entry.
- Admin curation UI should enforce the same Chinese-name boundary as the
  backend: `name_zh` can be empty, but non-empty values must contain CJK text.
- Admin manual entries should default to `approved` when the maintainer is
  directly adding a reviewed name, but the UI and API must also support
  `pending`, `needs_evidence`, and `rejected` so candidate names can be tracked
  without affecting public lookup or printed labels.
- Future unknown-name support should treat Chinese-name discovery as a curation
  workflow: collect the missed CAS/name, suggest candidate names from trusted
  SDS/supplier/regulatory references or candidate lookup helpers when
  available, then require admin review before using the name in labels.
- Admin correction requests now support a structured review-only candidate
  evidence bundle for missing Chinese names and unresolved searches. The bundle
  may capture CAS, English name, Chinese candidate, evidence link/type, and
  review notes, but it is explicitly not approved for public lookup, labels, or
  exports until a maintainer converts it into an approved manual entry, alias,
  or reference record.
- Backend correction candidate payloads are allow-listed, bounded, and
  normalized before storage. Unknown keys are dropped, candidate evidence URLs
  must be `http` or `https`, oversized text is rejected, and the backend always
  forces `review_required: true`, `approved_for_public_use: false`, and
  `public_data_changed: false` on stored candidate evidence. Future LLM,
  Wikidata, PubChem synonym, resolver, or scientific-skill outputs must pass
  through this same boundary before they can enter the admin queue. Public
  submissions cannot set manual-review conversion metadata such as
  `converted_to_manual_entry`, `manual_entry_status`, `manual_entry_source`, or
  a correction `request_id`; those fields are accepted only through admin
  status-update flows.
- Stored correction candidate evidence may create a pending manual-dictionary
  review entry from the admin dashboard. That pending entry is still
  admin-only; public lookup, labels, QR targets, and exports may use it only
  after a maintainer explicitly approves the manual entry.
- Candidate-to-manual-entry conversion must also leave a trace on the original
  correction request. The request should remain `candidate_found` with
  manual-review metadata and `public_data_changed: false`, not `approved`,
  until the resulting manual entry, alias, or reference record is separately
  approved. The admin overview should surface both the count and the converted
  request list so maintainers can continue from the correction report to the
  pending manual review record without assuming public data has changed.
  Converted requests should be separated from the ordinary open correction
  summary so the next-action queue is not duplicated.
- Unresolved lookup rows should expose a contextual data-correction link that
  keeps the current query/CAS and issue type. This is a dictionary-curation
  entry point, not a claim that PubChem has no hazards and not an automatic
  approval path.
- Automated translation may be used only as a candidate suggestion. It must not
  silently become the printed Chinese identity because chemical common names,
  salts, hydrates, isomers, and mixtures can translate ambiguously.
- Real inventory workbooks are evidence sources, not public-data authorities.
  `backend/scripts/audit_inventory_workbook.py` may extract CAS cleanup issues,
  missing seed-dictionary coverage, and workbook-provided Chinese names, but
  those names remain review-only candidate evidence until converted into an
  approved manual entry or seed-dictionary update with separate source
  verification. The audit may canonicalize spreadsheet artifacts such as
  numeric CAS values and first-segment leading zeros for QA/reporting, but that
  cleanup does not approve workbook names, hazards, aliases, or SDS links.
  The audit `actionQueue` is a triage aid only: `fix-invalid-cas` may block
  batch use of those rows, while candidate-name and dictionary-gap actions
  still require evidence review before any public data can change.
  Handoff CSV/README packets generated with `--handoff-dir` carry the same
  review-only boundary and are not import files for public dictionary data.

### External Scientific Lookup Skills

Future maintainer work may use external scientific-agent skills only as
evidence discovery tools. The current review lives in
`SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`.
The candidate-discovery dry-run contract lives in
`CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md`.
The current maintainer-only dry-run implementation lives in
`backend/scripts/discover_candidates.py`; it defaults to approved manual
entries plus the local seed dictionary, can resolve exact local English/Chinese
names to CAS for unresolved-search rows, and requires explicit `wikidata`
source selection before any network lookup.

Rules:

- Do not install the full `K-Dense-AI/scientific-agent-skills` repository into
  the active project environment.
- If needed, trial only the documented whitelist: `database-lookup`,
  `paper-lookup`, and later `datamol` for offline structure cleanup.
- Output from those skills is a candidate evidence bundle, not an approved
  dictionary entry, source rank, SDS/reference link, QR target, or printed GHS
  statement.
- Any candidate name, alias, reference link, or source interpretation still
  needs the same admin/human review and safety boundary as other external data.

## 2. Hazard Data States

Keep these states separate in UI, planner logic, exports, and tests:

- `found with renderable GHS`: classification contains usable pictograms.
- `found with GHS text but no pictogram`: signal word or H/P text exists, but
  no pictogram can be rendered. Do not show this as "no hazard."
- `found with no GHS data`: the compound was found, but no GHS classification
  was available from the current data source.
- `upstream transient failure`: PubChem/backend was unavailable or partial
  enough that a no-data conclusion would be unsafe.
- `manual/reference-only`: admin curation helps lookup or verification, but the
  app still needs authoritative SDS/supplier/local verification.

The worst failure mode is silently converting upstream unavailability into
"no hazards." Treat that as a safety regression.

## 3. Reference Link Policy

Reference links are verification aids. They can appear in detail views and can
be QR targets, but they do not replace GHS pictograms or complete primary label
content.

Rules:

- Frontend and backend accept only `http` and `https` reference URLs.
- Backend writes reject unknown reference link roles.
- Backend writes reject unknown reference link statuses. Supported statuses are
  `active` and `inactive`.
- Frontend read paths downgrade legacy/unknown roles to `reference` rather than
  rendering them as privileged SDS/regulatory links.
- Unsafe backend/manual links are dropped before rendering, QR reuse, or export.
- Public lookup, Detail, QR target selection, labels, and exports consume active
  reference links by default. Inactive links are retained for admin review and
  dictionary snapshots, but they must not become user-facing verification links
  or QR targets unless a maintainer reactivates them.
- The admin dashboard may fetch inactive reference links for curation, and it
  should show active/inactive counts so retired SDS or obsolete regulatory
  links do not disappear from review history. It should also let maintainers
  reactivate or deactivate recent links without re-entering the same URL.
- QR target selection prefers link type before generic priority:
  1. SDS
  2. Regulatory
  3. Occupational
  4. Reference
- Within the same link type, lower numeric priority wins.
- Visible detail/reference lists use the same role-first order before numeric
  priority, so generic references cannot visually outrank SDS, regulatory, or
  occupational verification links.
- Backend API reference-link payloads use the same role-first order, so future
  consumers do not have to rediscover the authority hierarchy independently.
- If duplicate URLs appear with different roles, keep the strongest role before
  sorting by priority. A generic reference must not downgrade the same URL when
  it is also available as an SDS or regulatory source.
- QR target selection returns role/source/label metadata, not just the URL.
  Print-modal copy and printed QR HTML data attributes must use that same
  metadata so users and QA can tell whether the scan path is SDS, regulatory,
  occupational, or generic reference support.
- QR supplements must still preserve every available GHS pictogram.

This means a manually added generic reference with priority `1` must not outrank
a PubChem SDS fallback for QR use. A manually added SDS link may outrank the
fallback because it has the same role and better priority.

## 4. Conflict Handling

When sources disagree:

- Do not merge reports into a false certainty.
- Keep the primary classification selection deterministic:
  report count, ECHA/source signal, hazard count, then stable source order.
- Preserve alternate classifications where available so users can inspect
  differences.
- Treat "multiple available public classifications" as a primary-selection
  confirmation state unless there is explicit evidence of a true source
  conflict. Result rows and batch summaries should ask users to confirm the
  main GHS version; source-conflict correction/admin review remains reserved
  for provenance or source disagreement that needs curation.
- Same-chemical Detail comparisons should expose the main ranking/evidence
  signals in a compact way: current selection, report count, source family, and
  pictogram/H/P coverage. This is explanatory evidence, not legal approval.
- Surface source labels and provenance close to the search/detail decision.
- Keep the visible effective classification aligned across result rows,
  detail provenance, print/export preparation, and exported CSV/XLSX rows. If a
  user selects an alternate classification, source/report-count evidence must
  follow that selected report instead of silently keeping the original primary
  source.
- Keep correction/report links separate from workflow/business request links.
- Contextual correction links should prefill structured issue-template fields
  when the app already knows the CAS, chemical name, issue type, current
  output, expected output, evidence type, or local context. Prefill is a triage
  aid only; it is not accepted curation evidence by itself.
- In-app correction intake is now implemented for public correction actions.
  Public correction requests are stored in the existing backend pilot/admin
  SQLite store, and admins can review/status them from the dashboard before any
  manual entries, aliases, or reference links are created or updated. Result
  rows, Detail, and product-trust correction actions should open the in-app
  queue dialog first while keeping GitHub issue links as maintainer fallbacks
  and repository-edge intake.
- Issue-form dropdown fields must receive values that exist in the repository
  issue-template schema. Machine-readable app issue keys such as
  `missing-chinese-name`, `source-conflict`, or `unresolved-search` should stay
  in the generated body/context, while the `issue_type` query parameter uses
  the matching human dropdown option. Evidence prompts that mention several
  acceptable source types should stay in the generated body as `Evidence
  prompt`; the `evidence_type` query parameter must use a single dropdown value
  such as `Supplier SDS`, `Official regulatory source`, or `Other`.
- Do not claim the app has resolved legal compliance conflicts.

If a future feature adds stronger manual hazard overrides, it must be explicitly
admin-gated, visibly labeled, tested, and documented as a separate authority
mode before it can affect printed labels.

Public intake is also separated at the repository edge:

- Data issues use `.github/ISSUE_TEMPLATE/data-correction.yml`.
- Workflow/product requests use `.github/ISSUE_TEMPLATE/workflow-request.yml`.

Data-correction reports should include source evidence such as SDS, supplier
label, official regulatory page, current app output, and expected correction.
Workflow requests should describe the operational task and should not be used
to request hazard-data changes.

Frontend support surfaces may prefill these repository issue-form fields to
reduce repeated typing and improve review quality:

- Data correction: `cas_number`, `chemical_name`, `issue_type`,
  `current_output`, `expected_output`, `evidence_url`, `evidence_type`, and
  `local_context`. The `issue_type` value must be one of the
  `.github/ISSUE_TEMPLATE/data-correction.yml` dropdown options; the
  `evidence_type` value must also be one of that template's evidence dropdown
  options. The app's internal issue key belongs in the generated body as
  `Issue key`, and broader source guidance belongs in the generated body as
  `Evidence prompt`.
- Workflow request: `workflow_area`, `goal`, `current_problem`,
  `desired_behavior`, and `examples`. The `workflow_area` value must be one of
  the `.github/ISSUE_TEMPLATE/workflow-request.yml` dropdown options; any more
  specific original workflow wording should remain in `current_problem` or
  `examples`.
- Regression tests should compare generated support-link dropdown values and
  prefill field ids against the actual issue-template option and field-id
  lists, so future template edits do not silently break prefill. Production QA
  scripts should also read the repository issue templates directly when
  validating deployed support links; avoid maintaining a second hard-coded
  dropdown or field-id list inside QA scripts.

The backend correction-request queue is the preferred in-app/station storage
path. Public intake uses `POST /api/dictionary/correction-requests` with
bounded text/context/candidate payloads, http/https-only evidence URLs, and a
rate limit. Admin review uses
`GET /api/dictionary/correction-requests` and
`POST /api/dictionary/correction-requests/{request_id}/status`; statuses are
limited to `open`, `candidate_found`, `approved`, `rejected`, and `ignored`.
Approval is a review marker only until a maintainer or coding agent converts
the request into an approved manual entry, alias, reference link, or other
curated data record.

Generic footer links should remain low-pressure and can stay unfilled. Result,
Detail, and product-trust links may add context when it clarifies the user's
task and keeps data corrections separate from workflow help.

## 5. Admin And Telemetry Boundaries

Admin-gated surfaces:

- Manual dictionary entries.
- Aliases.
- Reference links.
- Correction requests.
- Workspace documents.
- Pilot observability/export reports.

Admin write payloads are still bounded. Manual entries, aliases, and
reference links must trim text, reject blank required fields, cap long notes and
names, constrain source/status/locale values, and keep priority/confidence in a
small numeric range. Workspace document writes must also cap serialized JSON
size. Admin-gated does not mean unbounded.

Manual-entry status is part of that boundary. Unknown statuses must be rejected,
legacy entries default to `approved`, and public lookup helpers must filter to
approved manual entries by default.

Reference-link status is part of the same boundary. Inactive reference links
remain auditable admin records, but public lookup helpers must filter to active
links by default and admin summaries must make inactive counts visible.

Telemetry:

- Dictionary miss capture is opt-in via `CAPTURE_DICTIONARY_MISSES=true`.
- Frontend miss reporting is also opt-in via
  `VITE_ENABLE_DICTIONARY_MISS_CAPTURE=true`; public builds should keep this
  disabled unless a pilot owner explicitly enables backend capture too.
- Miss-query payloads must remain length-limited, context-size-limited, and
  rate-limited.
- Miss-query context is limited to an allow-list of non-freeform metadata keys:
  `locale`, `normalizedCas`, `resultCount`, `searchMode`, and `source`.
  Unsupported keys and nested objects must be dropped before persistence, and
  long allowed scalar values must be rejected.
- Telemetry must not become a public unbounded write path into SQLite.
- Frontend miss reporting should be best-effort only. It must not block search
  UX, and it must send only the allow-listed context fields above.
- Admin review can move miss-query rows through `open`, `needs_evidence`,
  `resolved`, and `ignored`. `resolved` requires a reviewed CAS number; repeated
  duplicate capture must not reopen a row that has already been marked
  non-open.
- Admin reports expose miss-query retention status. Rows older than the
  retention window are purgeable unless they are explicitly marked
  `needs_evidence`, which represents an active correction task that still needs
  supporting evidence.
- Dictionary snapshot exports redact miss-query `context` by default. Raw
  context can be included only through an explicit maintainer-side export flag.
- Admin summary/report payloads also redact miss-query context by default; the
  dashboard only needs query text, status, hit count, endpoint, and timing for
  triage.

Retention and review rules:

- Public production should keep `CAPTURE_DICTIONARY_MISSES=false` unless there
  is an explicit pilot window, owner, and review cadence.
- When miss capture is enabled for a pilot, raw miss-query rows should be
  reviewed at least monthly and deleted or aggregated within 90 days unless a
  specific correction task still needs the evidence.
- Use the admin purge endpoint or `manage_dictionary_growth.py
  purge-miss-queries` after monthly review to delete stale raw miss-query rows.
- Admin exports are for review, triage, and audit only. Do not use them as a
  long-term analytics warehouse or copy raw miss telemetry into public docs.
- Do not add email, names, free-form lab notes, file paths, or nested user
  payloads to miss-query context. If support needs identity or follow-up
  details, route that through the separate GitHub issue templates instead.
- If spam, scraping, or unexpected storage growth appears, disable capture
  first, then tighten limits. Do not raise payload caps to preserve abusive
  data.
- Workspace documents are user/admin workflow state, not telemetry. Keep their
  payload caps and admin access separate from miss-query retention decisions.

## 6. Required Tests

Backend:

- Reference-link writes reject non-http(s) URLs.
- Reference-link writes reject unknown roles.
- Reference-link reads skip unsafe legacy/manual URLs.
- Miss-query capture is disabled unless explicitly enabled.
- Miss-query payloads reject oversized query/context values.
- Miss-query context drops unsupported/free-text/nested keys before
  persistence and rejects long allowed scalar values.
- Miss-query endpoint keeps its public write route rate-limited.
- Manual dictionary entry and alias payloads reject oversized or unsupported
  admin values before writing to SQLite.
- Manual dictionary entries with `pending`, `needs_evidence`, or `rejected`
  status remain visible to admin review/export paths but do not resolve public
  lookup, display names, labels, or exports until changed to `approved`.
- Reference-link payloads reject unsupported statuses or out-of-range
  priorities in addition to unsafe URLs and unknown roles.
- Reference-link reads order SDS/regulatory/occupational links before generic
  references even when a generic reference has a lower numeric priority.
- Workspace document writes reject oversized serialized JSON payloads.
- Search surfaces `upstream_error` for transient failures instead of pretending
  there are no hazards.

Frontend:

- `normalizeReferenceLink` drops unsafe URL schemes.
- Unknown frontend link roles downgrade to `reference`.
- `getPreferredQrTarget` never chooses unsafe URLs.
- QR target selection prefers SDS/regulatory/occupational over generic
  references.
- QR supplement preflight shows the selected scan target role/source, and the
  printed QR image carries `data-qr-target`, `data-qr-target-type`,
  `data-qr-target-source`, and `data-qr-target-label` for audit/debug checks.
- Production print handoff QA fails QR supplement cases when those target
  attributes are missing, unsafe, untyped, or when the modal no longer exposes
  the QR target role in the printed-output checklist and decision summary.
- Visible reference lists prefer SDS/regulatory/occupational over generic
  references before applying numeric priority.
- Results and detail views distinguish no-GHS, GHS-text-without-pictogram, and
  renderable-GHS states.
- Detail views surface a source-conflict note when multiple classifications are
  available, and the copy must say switching reports requires SDS,
  supplier-label, or local-rule support.
- Unresolved lookup result rows expose a structured correction link with the
  form-compatible `issue_type=Chemical identity or alias`, body
  `Issue key: unresolved-search`, CAS/query context, current output, expected
  output, and dictionary-curation local context. Upstream transient failures
  must remain retry states and must not become unresolved-search correction
  reports.
- Detail views keep alternate-classification comparison visible even when the
  current primary classification has GHS text but no pictograms.
- Detail same-chemical comparison views expose source/ranking evidence for
  each classification on desktop and narrow layouts.
- Export preview, frontend CSV fallback, and backend CSV/XLSX rows include data
  state, primary source, report count, cache state, reference-link count, and
  classification-selection context.
- Export preview, frontend CSV fallback, and backend CSV/XLSX rows preserve
  batch review context: printable state, review-required state, review reasons,
  source-conflict state, missing trusted Chinese name, and multiple-GHS
  confirmation status.
- Batch/result review reason chips include multiple-GHS confirmation separately
  from source-conflict correction, and selecting a review reason filters the
  table to the affected rows.
- Effective custom classification choices carry their own source/report-count
  evidence through result rows, Detail provenance, print preparation, and
  export preparation.
- Print planner blocks unavailable/unverified source data from hazard-label
  output.
- Display-name helpers reject fake Chinese names that are English-only
  placeholders, and small-label output omits the Chinese line instead of
  duplicating English.
- Export preview, backend export payloads, and frontend CSV fallback apply the
  same Chinese-name trust filter before a `Chinese Name` column is shown or
  written.

Production QA:

- `npm run qa:production-search-ui` must continue checking trust notes, source
  badges, no-GHS data-state behavior, export-preview trust columns, safe
  reference link metadata, SDS link shape, Detail comparison evidence panels,
  unresolved-lookup correction intake, issue-form dropdown- and
  field-id-compatible structured support links, and separated
  data-correction/workflow support links.
- `npm run qa:production-product` should remain the closure gate when a data
  governance change affects user-facing behavior.

## 7. Documentation Triggers

Update this file when changing:

- Source ranking or dedup rules.
- Manual dictionary, alias, or reference-link behavior.
- QR target precedence.
- Upstream-error/no-GHS copy or planner behavior.
- Admin, telemetry, or workspace sync boundaries.
- Any claim about SDS, supplier, legal, or local-rule authority.
