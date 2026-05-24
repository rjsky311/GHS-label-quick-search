# Pilot Operations Ready Plan

Read `PROJECT_STATUS_AND_NEXT_PLAN.md` first. This file owns the next major
post-95 product target selected by `POST_95_REPRIORITIZATION.md`.

## Goal

Turn the shipped 95% Lab-Ready Pilot baseline into a product that can survive a
small real pilot without the maintainer manually inspecting every screenshot,
PDF, and chat message.

The product should let a lab, teaching unit, or lab manager run a realistic
batch, print or export the intended output, report data issues, and leave the
maintainer with a clear operator view of what to fix next.

## Why This Is The Next Large Target

The 95% milestone proved that controlled search, batch, print, export, data
correction, and production QA paths are mostly stable. The next risk is
operational rather than purely functional: real pilot use creates messy
unresolved searches, missing Chinese names, source conflicts, unclear export
needs, and occasional production or upstream issues. Those signals must become
triageable work instead of another unbounded backlog.

This target is intentionally larger than a single feature. It touches:

- Pilot runbook and operator checklist.
- Admin/report triage.
- Data-quality intake and review-only candidate loop.
- Batch export utility.
- QA cadence and docs drift.
- Completion audit for the next re-rank.

It is still bounded: it does not reopen physical printer validation, add more
public label sizes, install external scientific skills, or redesign the whole
app.

## Product Definition

Pilot Operations Ready means:

- A pilot user can run the main workflow without understanding internal print
  planning or data-governance mechanics.
- A maintainer can open the admin/report surfaces and know whether the next
  work is data correction, unresolved search cleanup, manual-entry review,
  source-conflict review, batch export polish, or production reliability.
- Exported batch files are useful for lab management, review, and cleanup, not
  just raw API dumps.
- Data corrections remain review-only until explicitly approved into curated
  manual data.
- QA cadence tells the maintainer what to run for a pilot release or a focused
  change.

## Non-Goals

- Real paper, real printer, and real QR scan validation. Keep this deferred to
  `PHYSICAL_PRINT_VALIDATION_CHECKLIST.md`.
- More public label outputs or more small-label stock sizes.
- Runtime LLM or external data source writes into public lookup, labels,
  exports, or QR targets.
- Full admin back-office productization.
- Brand, conversion, or monetization experiments.
- Legal compliance claims beyond the current SDS/supplier/local-rule boundary.

## Workstreams

### 1. Pilot Runbook And Operator Checklist

Create and maintain `PILOT_RUNBOOK.md` as the operator-facing checklist.

It must answer:

- Which pilot users and workflows are in scope.
- How many CAS rows to test in one pilot batch.
- Which states are normal, review-needed, or blockers.
- How to classify data, UX, print, export, and production findings.
- Which admin/report views the maintainer should inspect daily and weekly.
- Which QA gates are required before a pilot release.

Done when a new session can run the pilot process from the runbook without
reading chat history.

### 2. Operator / Admin Triage

Admin/reporting must answer the pilot maintenance questions without requiring
manual raw-row counting:

- Open correction requests.
- Candidate-found corrections not yet converted to manual review.
- Pending or needs-evidence manual entries.
- Pending or needs-evidence aliases.
- Open or needs-evidence unresolved search misses.
- Missing trusted Chinese-name reports.
- No-GHS reports.
- Source-conflict reports.
- Stale miss-query telemetry rows.
- Inactive reference links.
- Upstream/cache operational signals from the ops report.

Implementation baseline:

- `pilot_store.get_dictionary_summary()` exposes `pilotTriage`.
- `/api/ops/report` and `/api/dictionary/report` include that triage summary
  through the dictionary report payload.
- `PilotDashboardSidebar` shows the compact triage panel.

Done when the dashboard/report can name the next operator focus without the
maintainer doing spreadsheet arithmetic.

### 3. Data Quality Pilot Loop

The pilot data loop remains conservative:

- Missing Chinese names become correction/admin review work.
- English-only Chinese placeholders are not trusted public Chinese names.
- Unresolved searches become miss-query or correction tasks.
- Multiple GHS classifications remain visible; users can confirm a primary
  classification, and exports preserve the confirmation status.
- Source conflicts stay reviewable and do not imply the app resolved legal
  authority.
- Candidate evidence remains review-only.
- Public lookup, labels, exports, and QR targets change only after approved
  manual data.

Done when pilot feedback can move from report to candidate/manual review
without polluting public data.

### 4. Batch Export Utility

Exports should support lab-manager use:

- The file should preserve data state, printable state, review reasons, source
  context, multiple-GHS state, and missing Chinese-name state.
- XLSX should include a compact pilot summary sheet so a maintainer can see the
  batch condition before reading every row.
- CSV should remain simple row data with formula-injection protection.
- Future export changes should be guided by actual pilot evidence: clearer
  filenames, filtered scopes, or split sheets only if the current export is
  insufficient.

Done when a 50-100 item export is usable for cleanup and next-step decisions,
not only archival.

### 5. Pilot QA Cadence

The pilot cadence is:

- Docs-only or planning change: `git diff --check`, `npm run test:docs`.
- Backend admin/report/export change: targeted backend tests plus
  `python -m py_compile server.py`.
- Frontend dashboard/export UX change: targeted Jest test and `npm run build`
  when runtime code changes.
- Pilot release check: production health, production search UI, and lab-ready
  batch gates after deploy.
- Broad product closure: production product gate.

Done when the target can be closed with specific local, CI, and production
evidence.

## Completion Criteria

This target is complete only when all are true:

- `PILOT_OPERATIONS_READY_PLAN.md` and `PILOT_RUNBOOK.md` exist and link back
  to the canonical project plan.
- `PROJECT_STATUS_AND_NEXT_PLAN.md`, `NEXT_PRODUCT_WORK.md`, `AGENTS.md`,
  `CLAUDE.md`, and `README.md` point to the pilot operations target where
  relevant.
- Admin/reporting exposes pilot triage counts and recommended focus.
- The dashboard renders a compact pilot triage panel.
- XLSX export includes a pilot summary sheet while preserving the existing row
  export contract.
- Relevant backend/frontend tests cover the new report/export/dashboard
  behavior.
- `git diff --check`, docs drift, targeted tests, and build pass.
- CI passes after push.
- If runtime behavior changed, production health/search/lab-ready-batch gates
  pass after Zeabur deploy.

## Completion Audit

Record final closure here before marking the target shipped.

Status: `In progress`

Evidence to fill at closure:

- Local checks:
- GitHub CI:
- Zeabur deploy:
- Production QA:
- Remaining risks:
- Next re-rank recommendation:
