# Lab Workflow Readiness Roadmap

Status: selected roadmap direction on 2026-06-27; revised after five read-only
sub-agent reviews; reconciled on 2026-06-28 after the first shipped slices.
This is a direction document, not the canonical active queue.
`PROJECT_STATUS_AND_NEXT_PLAN.md` and `NEXT_PRODUCT_WORK.md` still select active
work.

Subtitle: Human-first GHS lookup, prepared-label workflow, batch handoff, and
safe machine-readable access.

## Why This Roadmap Exists

The 95% Lab-Ready Pilot, Pilot Operations Ready, Pilot Evidence And
Maintainability Pass, and Batch-First Lab Pilot v1 targets have shipped. The
project should not keep extending print polish, admin tooling, or batch QA by
inertia.

The next product bottleneck is workflow clarity: users should understand how to
move from lookup into real lab tasks such as prepared-solution labels, batch
review, export handoff, data correction, and safe agent/API access.

Opening evidence:

- The owner identified that the current prepared-solution entry is unclear
  enough that even the owner is unsure how the feature is meant to be used.

Roadmap context and hypotheses:

- Physical print validation is intentionally deferred until real paper, label
  stock, printer scaling, QR scanning, and pictogram readability can be tested.
- Current batch, export, correction/admin, and production QA baselines are
  shipped or monitoring; new slices should come from concrete workflow evidence.
- Prepared Solution Entry Clarity is shipped and production-verified. The
  creation entry now starts from a parent chemical detail surface, while header
  prepared controls are positioned as recent/reprint access.
- The Agent-ready reference/draft access sequence is shipped through the scope
  decision, versioned summary schema, read-only endpoint, `/llms.txt`, and live
  production availability audit. Future agent work still needs new integration
  evidence or an explicit scope/safety decision.
- The owner explicitly approved both Daily-use Comfort / Dark Bench and Batch
  Review And Export Handoff Clarity on 2026-06-28 and delegated ordering.
  Daily-use Comfort / Dark Bench Activation v0 is locally implemented and
  verified because explicit theme approval was a valid roadmap trigger; its
  production follow-up still needs deployment, expected-SHA production health,
  and live Dark Bench workbench QA. Batch/export handoff remains second and
  needs its own concrete batch/export evidence before implementation.

## North Star

GHS Label Quick Search should be a free public lab workflow utility that helps
people and safe automation:

- look up chemical identity and GHS hazard context;
- understand data confidence, source boundaries, and review needs;
- create prepared-solution labels without pretending to reclassify mixtures;
- hand off batch results to lab managers or maintainers;
- expose structured reference data to coding agents only with clear safety
  boundaries.

Near-term success does not depend on validating real printed stock. It depends
on making the non-physical workflow clear, trustworthy, and repeatable.

## Product Guardrails

- Keep the public print model to exactly three outputs: Complete A4/Letter
  label, QR small label, and Identification small label.
- Do not add H/P text to small labels without a new product decision.
- Prepared-solution labels must copy a selected single parent chemical's hazard
  data and clearly say they do not reclassify the mixture.
- Concentration, solvent, dilution, prepared-by, prepared-date, and expiry
  metadata must not infer, reduce, weaken, or modify hazards.
- No user, admin, external service, or coding agent may write unapproved data
  into public lookup, labels, exports, or QR targets.
- SDS, supplier labels, and local regulations remain the final authority for
  workplace use; the app never grants compliance approval.
- Public API or agent output must remain reference/draft data, not compliance,
  handling, storage, disposal, or approval advice.
- Real physical printing remains deferred until physical evidence exists.
- Daily-use polish, including Dark Bench, must not alter printed-label meaning
  or make label previews look like dark printed labels.

## Roadmap Structure

All five themes belong in the roadmap, but they are not a checklist to work
through by inertia:

- `Shipped / monitoring`: closed themes with proof in the canonical status
  docs.
- `Next`: candidate themes, not scheduled milestones. Promote one only through
  fresh evidence recorded in `NEXT_PRODUCT_WORK.md`.
- `Later`: important directions that need a new evidence trigger and, for broad
  workflow/API/visual-system changes, `PRODUCT_SCOPE_GATE.md` before
  implementation.

Current state: Daily-use Comfort / Dark Bench Activation v0 is locally
implemented and verified, with production follow-up pending as recorded in
`NEXT_PRODUCT_WORK.md`. Do not open another comfort slice unless newer evidence
changes the order.

## Shipped / Monitoring: 1. Prepared Solution Entry Clarity

Purpose: make the prepared-solution / prepared-label workflow obvious before
adding more capabilities.

Affected user job: a lab user has found a parent chemical and wants a label for
a working solution, dilution, or prepared reagent without changing the GHS
classification.

Original design slice source: owner/user evidence on 2026-06-27 that the
prepared-solution / prepared-label entry was unclear enough that even the owner
was unsure how to use the feature.

Current shipped state:

- The ambiguous standalone prepared/dilution entry was reframed around creating
  a prepared-solution label from a found parent chemical.
- Header prepared controls now communicate recent/reprint access rather than a
  standalone create flow.
- Detail surfaces expose the parent-chemical creation CTA.
- Empty/sidebar guidance tells users to search the parent chemical first and
  keeps reprint/preset reuse distinct.
- Runtime i18n tests cover the safety boundary that user-entered concentration,
  solvent, prepared-by, prepared-date, and expiry metadata do not infer, reduce,
  weaken, modify, or reclassify hazards.
- Production prepared QA passed for create, reprint, and preset cases across
  Complete A4, QR small label, and Identification small label outputs.

Plain user flow to make visible:

1. Search for the parent chemical.
2. Open the found chemical detail surface.
3. Create a prepared-solution label from that parent chemical.
4. Review the prepared item in the print modal and print or save a reusable
   recipe.

Mini glossary for the design:

- Create new: starts from a found parent chemical detail surface.
- Recent prepared labels: prior prepared workflow records that may support
  direct reprint or prefill.
- Saved presets / recipes: concentration and solvent only; they must not carry
  stale operator, prepared-date, or expiry values.
- Reprint: rebuilds a prepared item using the current parent hazard data.
- Header prepared control: recent/reprint access only, not the start action for
  creating a new prepared label.

Concrete work:

- Reframe the workflow as "create a prepared-solution label from a parent
  chemical" rather than a standalone prepared mode.
- Clarify the main entry point from a found chemical detail surface.
- Rename or relabel the header prepared entry so it reads as recent/reprint
  access, not a standalone prepared mode or creation entry point.
- Improve the empty state so it tells users to search a parent chemical first.
- Review naming in Traditional Chinese and English so "prepared", "solution",
  "working solution", "prepared reagent", and "reprint" do not compete. Avoid
  using "dilution" as the umbrella term. Prefer wording closer to
  "prepared-solution label" / "working solution or prepared reagent"; in zh-TW,
  prefer terms closer to "配製溶液標籤" or "配製標籤" over only "稀釋液".
- Keep recent prepared records and saved presets positioned as reuse helpers,
  with their saved fields and actions visibly distinct.
- Preserve the current trust boundary: concentration, solvent, prepared-by,
  prepared-date, and expiry are workflow metadata only.
- Say plainly that prepared-solution labels reuse parent hazard data and do not
  infer, weaken, or reclassify hazards.

Historical design proof before implementation:

- A focused design/spec confirms the entry model, glossary, bilingual copy,
  non-goals, tests, production QA, and stop conditions.
- A first-time-user screenshot review can answer: Where do I start? What does
  the header prepared control do? What is reused? What is reprinted? What is not
  being reclassified?
- The design states whether any copy changes affect `Header`,
  `PreparedSidebar`, `PrepareSolutionModal`, the detail CTA, i18n, and prepared
  production QA.

Implementation proof after accepted design:

- `npm test -- --runInBand src/__tests__/prepareSolution.integration.test.js src/components/__tests__/PrepareSolutionModal.test.js src/components/__tests__/PreparedSidebar.test.js src/__tests__/personaTeachingSetup.integration.test.js`
- `npm run test:i18n`
- `npm run build`
- After deployment, `npm run qa:production-prepared` with report/screenshots.

Current stop condition:

- The original design and implementation slices are closed. Do not reopen this
  theme unless fresh owner/user evidence, a screenshot, a production QA failure,
  or a code-review finding shows the prepared-solution entry is still unclear.

Implementation non-goals unless a later accepted design changes them:

- No multi-solute mixture classification.
- No custom hazard editing.
- No new public print output.
- No backend persistence.
- No localStorage schema change.
- No print renderer or hazard-data algorithm change.

## Next Candidate: 2. Batch Review And Export Handoff Clarity

Purpose: make batch results and exports useful as a lab-manager handoff while
physical print validation is deferred.

Affected user job: a user pastes a real batch list, reviews what is ready or
blocked, then exports a workbook another person can act on.

Promotion trigger: a real batch list, export handoff example, screenshot,
workbook audit, production QA failure, or user report shows that review states,
export scope, filenames, sheets, or handoff categories are confusing.

Concrete work:

- Improve only from real batch lists, export handoff examples, screenshots, QA
  failures, or workbook audit evidence.
- Keep ready, needs-review, unresolved, duplicate, invalid-CAS, no-GHS,
  upstream-retry, and multiple-GHS states named consistently.
- Make export scope, workbook sheets, filenames, row counts, review categories,
  and primary next actions understandable without reading code or docs.
- Preserve review flags, source context, formula neutralization, and safe active
  QR/reference URLs in exported CSV/XLSX data.
- Add parser or export fixtures only when real examples expose new separators,
  prefixes, duplicate patterns, invalid CAS cells, or confusing review rows.

Expected proof:

- Focused frontend/backend export tests.
- `qa:production-search-ui`, `qa:production-batch-print`, or
  `qa:production-product` when behavior reaches production.
- A generated XLSX/CSV artifact path tied to the input evidence, so a lab
  manager can inspect the handoff.

Stop condition:

- Stop when the handoff question raised by the evidence is resolved.
- Do not reopen broad batch-print polish or physical print validation.

## Next Candidate: 3. Data Correction And Source Trust Loop

Purpose: make data gaps, source conflicts, missing trusted Chinese names, and
unresolved searches safe to report, triage, and curate.

Affected user job: users and maintainers need a clear path when lookup data is
missing, ambiguous, stale, or source-conflicted.

Promotion trigger: real admin queue evidence, correction requests, unresolved
searches, missing-name reports, source-conflict examples, or inventory handoff
packets show maintainers cannot identify the next action quickly.

Concrete work:

- Keep public correction intake focused on data-quality issues, not general
  support.
- Keep admin candidate evidence review-only until a maintainer approves a
  role-limited curated identity, alias, or reference record. That approval must
  not imply hazard-classification authority.
- Make clear that correction-request status changes alone do not update public
  lookup, labels, exports, or QR targets.
- Improve admin reporting only when real queue evidence shows maintainers cannot
  identify the next action quickly.
- Trial external discovery only after a scope/cost/source decision; generated or
  external suggestions must remain allow-listed, bounded, safe-url-only, and
  review-only.
- Keep SDS, supplier labels, and local regulation boundaries visible in lookup,
  labels, exports, QR targets, and agent output.

Expected proof:

- Backend storage/API tests and focused frontend admin tests.
- `python -m pytest test_name_search.py -v` when backend API/storage/trust
  boundaries are touched.
- Candidate discovery dry-run evidence when external lookup is explicitly
  opened.
- Production search UI checks for public correction entry points when affected.

Stop condition:

- Stop when the specific admin or data-governance bottleneck is resolved.
- Do not let candidate evidence silently change public lookup, labels, exports,
  or QR targets.

## Shipped / Monitoring: 4. Agent-Ready API Contract

Purpose: make the product safer and more useful for coding agents, scripts,
LIMS, ELN, or inventory workflows without requiring DOM scraping.

Affected user job: a person or automation needs structured GHS lookup and label
summary data, with explicit warnings and review status.

Original promotion trigger: an explicit product/safety decision or integration
example shows that an agent, script, LIMS, ELN, or inventory workflow needs
stable machine-readable GHS reference output.

Current shipped state:

- The Agent-Ready API Scope Decision chose OpenAPI plus versioned JSON schema as
  the machine-readable authority, with `llms.txt`, robots, and sitemap limited
  to navigation guidance.
- `agent_label_summary.v0` defines a read-only reference/draft response with
  identity, GHS pictograms, H/P statements, source/report metadata,
  reference-link and QR target metadata, upstream status, review flags, and
  SDS/supplier-label/local-regulation authority boundaries.
- `GET /api/agent/label-summary?q=<CAS-or-name>` exposes the schema through
  OpenAPI with bounded input and rate limiting.
- `/llms.txt` points agents to OpenAPI and the label-summary endpoint while
  stating read-only, no-write, no-approval, SDS/supplier/local-rule, and
  unapproved-candidate boundaries.
- A live production availability audit verified that production OpenAPI,
  `/llms.txt`, and the label-summary endpoint are reachable.

Completed first-version work:

- Document the existing public API and OpenAPI shape for safe lookup use.
- Define a versioned `label_summary` schema with `schema_version`, identity,
  CAS/CID, GHS pictograms, signal word, H/P codes and text, selected/alternate
  classification source metadata, reference-link/QR target metadata, review
  flags, stale/cache/upstream status, and non-compliance-approval disclaimers.
- Treat OpenAPI and versioned JSON schemas as the authoritative machine
  contract.
- Add an agent-facing guide such as `llms.txt` as a concise pointer to OpenAPI,
  examples, rate limits, safety boundaries, and support/correction paths.
- Use robots/sitemap only to guide crawlers to docs and public pages. Agents and
  integrations should use documented API endpoints, not DOM scraping, rendered
  print HTML, or UI copy, for chemical facts.
- Add rate, size, source, and stale-data boundaries before promoting agent use:
  `429` handling, max batch size, `retrieved_at`, `cache_hit`, `upstream_error`,
  source/report metadata, and verification disclaimers.
- Exclude all unapproved candidate evidence from agent-facing public output.
- Do not add write endpoints, automatic candidate promotion, or agent-generated
  approval workflows.

Current proof:

- Schema or snapshot tests for the agent-facing response shape.
- API tests showing bounded input, safe URLs, clear source metadata, and no
  unapproved candidate leakage.
- Structured examples for success, no-GHS, text-only-GHS, upstream-error,
  multiple-classification, stale/cache-hit, and unapproved-candidate-excluded
  cases.
- Documentation examples that show SDS/supplier/local-rule verification and do
  not imply compliance approval.
- Production availability checks for OpenAPI, `/llms.txt`, and the
  label-summary endpoint.

Current stop condition:

- The first reference/draft automation output is closed. Future agent work
  requires new integration evidence or an explicit scope/safety decision.
- Stop before any autonomous compliance decision, hazard reclassification,
  write-back to public data, automatic public dictionary writer, or
  agent-generated approval workflow.

## Locally Implemented / Production Follow-Up Pending: 5. Daily-Use Comfort / Dark Bench

Purpose: improve repeated daily use without distracting from workflow trust.

Affected user job: users should be able to work comfortably on desktop, mobile,
and long sessions without losing print or safety clarity.

Promotion trigger: accepted on 2026-06-28 through explicit owner approval of
Daily-use Comfort / Dark Bench as one of the next two roadmap directions.
Future comfort work beyond Dark Bench v0 still needs a production screenshot,
user report, accessibility issue, mobile/narrow QA failure, or explicit theme
decision showing a concrete workflow issue.

Current local state:

- Dark Bench v0 adds only a persisted app-chrome theme toggle and workbench QA
  theme forcing.
- Local verification covers focused theme/Header/App/CSS token tests,
  generated print-preview white contract coverage, i18n parity, QA script
  gates, frontend build, docs whitespace, and local desktop/mobile Dark Bench
  workbench QA screenshots.
- Production verification is still pending deployment, expected-SHA production
  health, and live Dark Bench workbench QA.

Concrete work:

- Add Dark Bench only as an app chrome theme; printed label previews stay white
  and print-faithful.
- Use the existing `theme-dark-bench` tokens and keep Comfort Dim as the
  default.
- Add a compact header toggle with local browser persistence.
- Extend workbench QA so screenshots can be captured in Dark Bench on desktop
  and mobile.
- Improve narrow/mobile reading when screenshots or QA show regressions.
- Extend accessibility tests when new complex dialogs or flows are added.
- Keep low-noise UX improvements tied to real confusion, not decorative polish.

Expected proof:

- Desktop/mobile screenshots for touched surfaces.
- Focus/keyboard tests for new or changed dialogs.
- An assertion or screenshot review that printed previews remain white and label
  meaning did not change.
- Production search UI or product QA when user-facing flows change.

Stop condition:

- Stop Dark Bench v0 when app chrome can toggle and persist, desktop/mobile
  workbench QA passes in Dark Bench, and tests prove printable preview surfaces
  remain white.
- Do not redesign the whole app, restyle every modal, change print/export/API
  behavior, or alter label meaning as part of visual polish.

## Slice Selection Rules

Open only one design or implementation slice at a time. Every slice must state:

1. Source: user report, screenshot, PDF, Excel/workbook evidence, production QA
   failure, CI/deployment failure, admin queue evidence, or code-review finding.
2. Affected user job.
3. Expected proof.
4. Stop condition and explicit non-goals.
5. Verification commands and artifact path.

If there is no fresh evidence, keep the roadmap in monitoring mode instead of
working through it like a checklist.

Broad workflow, API/agent, data-trust, print-model, or visual-system changes
must use `PRODUCT_SCOPE_GATE.md` before implementation when the acceptance
standard is not already clear.

## Recommended First Slice

Historical recommendation: open a design slice for `Prepared Solution Entry
Clarity`. That design and implementation sequence is now shipped and
production-verified.

Source: owner/user evidence on 2026-06-27 that the prepared-solution /
prepared-label entry is unclear.

Affected user job: create or reuse a prepared-solution label from a parent
chemical while keeping the parent-hazard trust boundary clear.

Expected design proof: an accepted spec covering entry naming, header/sidebar
role, empty-state copy, modal trust wording, bilingual terminology, test files,
production QA, and implementation stop conditions.

Stop condition: accepted design/spec only.

The first design should decide:

- the user-facing names for prepared-solution creation versus recent reprint;
- where the start action belongs;
- what the prepared sidebar empty state says;
- how the modal explains parent hazard-data reuse without adding noise;
- how to avoid making "dilution" the umbrella term in English or Traditional
  Chinese;
- which tests and production QA prove the workflow is clearer.

Do not reopen this slice from the historical recommendation. Use the slice
selection rules above and the active queue in `NEXT_PRODUCT_WORK.md`.
