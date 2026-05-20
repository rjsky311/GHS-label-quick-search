# Data Governance And Safety Boundaries

This document defines how the app treats chemical identity, GHS classifications,
SDS/reference links, manual curation, telemetry, and source conflicts. It is a
product and engineering guardrail, not legal advice. Users must still verify
against the official SDS, supplier label, and local regulations.

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

### Chinese Name Coverage

Chinese chemical names are identity aids, not hazard authority. The local seed
dictionary and admin manual entries can provide Traditional Chinese display
names, but the app must not invent or fake a Chinese name when coverage is
missing.

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
  different across workflows.
- When a known CAS/name pair is missing a Chinese display name, add it through
  the local dictionary or an admin-reviewed manual dictionary entry with source
  evidence.
- Future unknown-name support should treat Chinese-name discovery as a curation
  workflow: collect the missed CAS/name, suggest candidate names from trusted
  SDS/supplier/regulatory references when available, then require admin review
  before using the name in labels.
- Automated translation may be used only as a candidate suggestion. It must not
  silently become the printed Chinese identity because chemical common names,
  salts, hydrates, isomers, and mixtures can translate ambiguously.

### External Scientific Lookup Skills

Future maintainer work may use external scientific-agent skills only as
evidence discovery tools. The current review lives in
`SCIENTIFIC_AGENT_SKILLS_EVALUATION.md`.

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
- Frontend read paths downgrade legacy/unknown roles to `reference` rather than
  rendering them as privileged SDS/regulatory links.
- Unsafe backend/manual links are dropped before rendering, QR reuse, or export.
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
- Surface source labels and provenance close to the search/detail decision.
- Keep the visible effective classification aligned across result rows,
  detail provenance, print/export preparation, and exported CSV/XLSX rows. If a
  user selects an alternate classification, source/report-count evidence must
  follow that selected report instead of silently keeping the original primary
  source.
- Keep correction/report links separate from workflow/business request links.
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

## 5. Admin And Telemetry Boundaries

Admin-gated surfaces:

- Manual dictionary entries.
- Aliases.
- Reference links.
- Workspace documents.
- Pilot observability/export reports.

Admin write payloads are still bounded. Manual entries, aliases, and
reference links must trim text, reject blank required fields, cap long notes and
names, constrain source/status/locale values, and keep priority/confidence in a
small numeric range. Workspace document writes must also cap serialized JSON
size. Admin-gated does not mean unbounded.

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

Retention and review rules:

- Public production should keep `CAPTURE_DICTIONARY_MISSES=false` unless there
  is an explicit pilot window, owner, and review cadence.
- When miss capture is enabled for a pilot, raw miss-query rows should be
  reviewed at least monthly and deleted or aggregated within 90 days unless a
  specific correction task still needs the evidence.
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
- Detail views keep alternate-classification comparison visible even when the
  current primary classification has GHS text but no pictograms.
- Export preview, frontend CSV fallback, and backend CSV/XLSX rows include data
  state, primary source, report count, cache state, reference-link count, and
  classification-selection context.
- Effective custom classification choices carry their own source/report-count
  evidence through result rows, Detail provenance, print preparation, and
  export preparation.
- Print planner blocks unavailable/unverified source data from hazard-label
  output.
- Display-name helpers reject fake Chinese names that are English-only
  placeholders, and small-label output omits the Chinese line instead of
  duplicating English.

Production QA:

- `npm run qa:production-search-ui` must continue checking trust notes, source
  badges, no-GHS data-state behavior, export-preview trust columns, safe
  reference link metadata, SDS link shape, and separated
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
