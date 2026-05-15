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
- Miss-query payloads must remain length-limited, context-size-limited, and
  rate-limited.
- Telemetry must not become a public unbounded write path into SQLite.

## 6. Required Tests

Backend:

- Reference-link writes reject non-http(s) URLs.
- Reference-link writes reject unknown roles.
- Reference-link reads skip unsafe legacy/manual URLs.
- Miss-query capture is disabled unless explicitly enabled.
- Miss-query payloads reject oversized query/context values.
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
- Visible reference lists prefer SDS/regulatory/occupational over generic
  references before applying numeric priority.
- Results and detail views distinguish no-GHS, GHS-text-without-pictogram, and
  renderable-GHS states.
- Detail views surface a source-conflict note when multiple classifications are
  available, and the copy must say switching reports requires SDS,
  supplier-label, or local-rule support.
- Detail views keep alternate-classification comparison visible even when the
  current primary classification has GHS text but no pictograms.
- Print planner blocks unavailable/unverified source data from hazard-label
  output.

Production QA:

- `npm run qa:production-search-ui` must continue checking trust notes, source
  badges, safe reference link metadata, SDS link shape, and separated
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
