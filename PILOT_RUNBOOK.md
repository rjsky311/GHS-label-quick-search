# Pilot Runbook

Read `PROJECT_STATUS_AND_NEXT_PLAN.md` first, then
`PILOT_OPERATIONS_READY_PLAN.md`. This runbook is the maintainer checklist for
small real pilots after the 95% Lab-Ready Pilot milestone.

## Pilot Scope

Target users:

- Lab managers.
- Research students.
- Teaching-lab staff.
- Safety-adjacent operators who need quick GHS lookup, batch print, or export.

Target workflows:

- Batch lookup for 50-100 CAS rows.
- Batch export for review and cleanup.
- Three label outputs: complete A4/Letter label, QR small label, and
  identification small label.
- Data correction intake for missing Chinese names, unresolved searches,
  no-GHS states, source conflicts, and reference-link issues.

Out of scope for this runbook:

- Real printer and stock validation.
- More label sizes.
- Runtime external-source or LLM writes to public data.
- Brand/conversion experiments.

## Before A Pilot Session

1. Confirm production health:
   - Frontend: https://ghs-frontend.zeabur.app
   - Backend: https://ghs-backend.zeabur.app/api/health
2. Run or confirm the latest relevant gates:
   - `npm run qa:zeabur-deployment`
   - `npm run qa:production-health`
   - `npm run qa:production-search-ui`
   - `npm run qa:production-lab-ready-batch`
3. Confirm the pilot operator has the intended test list:
   - 10-20 rows for a first smoke pilot.
   - 50-100 rows for a realistic batch pilot.
   - If the source file comes from Excel, expect Chinese `CAS編號` headers,
     pure numeric or decimal-style CAS cells, trailing punctuation, formula/date
     errors, duplicate rows, checksum mistakes, unresolved names, and missing
     trusted Chinese names. Review these through the batch summary/admin queue
     rather than treating the workbook as a whole-roster import.
4. Confirm no one is treating the app as the legal authority. SDS, supplier
   labels, local law, and workplace rules remain the authority.

## Pilot User Tasks

Ask the pilot user to perform these in order:

1. Paste the CAS list into batch search.
2. Review the batch summary:
   - total rows,
   - found rows,
   - label-ready rows,
   - rows needing review,
   - duplicate/invalid inputs.
3. Use the batch review action queue as the operator's checklist. If a review
   bucket exists, resolve, confirm, retry, or intentionally defer that bucket
   before treating the batch as ready.
4. Open rows with multiple GHS classifications and confirm whether the
   system-suggested primary is acceptable.
5. Try the three label outputs where relevant:
   - complete A4/Letter label,
   - QR small label,
   - identification small label.
6. Export Excel and CSV.
7. Submit correction reports for:
   - missing trusted Chinese names,
   - unresolved searches,
   - no-GHS data gaps,
   - source conflicts,
   - bad or missing reference links,
   - confusing workflow or export behavior.

## Normal States

These are expected and should not automatically become bugs:

- A chemical has multiple public GHS classifications and asks for primary
  confirmation.
- A chemical lacks a trusted Chinese name and leaves the Chinese field blank.
- A no-GHS state tells the user to verify source data instead of pretending
  hazards do not exist.
- QR and identification small labels omit H/P text by design.
- A complete label uses continuation when full H/P text is dense.
- Physical print confidence remains deferred until real printer evidence
  exists.

## Reportable States

Create or review a correction/admin item when:

- A trusted Chinese name is missing and there is usable source evidence.
- A lookup is unresolved but the chemical identity is known.
- A source conflict needs SDS/supplier/regulatory context.
- A reference URL is unsafe, stale, low-authority, or missing.
- A repeated alias or alternate name is common enough to curate.
- Export is technically correct but not useful for pilot cleanup.

## Blockers

Treat these as P0 and stop normal pilot expansion:

- Production 502 or backend health failure.
- Search result shows upstream failure as no hazards.
- A printed hazard label omits available GHS pictograms.
- Complete-label print handoff permits clipped required content.
- Export loses review/source/multiple-GHS state.
- Admin correction/candidate path writes unapproved data into public lookup,
  labels, exports, or QR targets.

## Daily Operator Checklist

1. Open the admin dashboard.
2. Check the Pilot triage panel:
   - data-quality workflow current stage,
   - manual review / candidate evidence stage counts,
   - open work items,
   - unresolved searches,
   - missing Chinese-name reports,
   - source-conflict reports,
   - upstream retry/source outage count,
   - recommended focus.
3. Check correction requests:
   - mark false reports ignored,
   - move sourced candidates to candidate-found,
   - create pending manual entries only when the candidate has enough identity
     evidence.
4. Check manual entries:
   - approve only sourced entries,
   - mark weak entries needs-evidence,
   - reject unsafe or unsupported entries.
5. Check miss queries:
   - resolve high-frequency misses with CAS when known,
   - mark ambiguous rows needs-evidence,
   - ignore noise.
6. Check stale miss telemetry and purge when outside retention.

## Weekly Operator Checklist

1. Export or review the admin report.
2. Review the pilot triage trend:
   - are open corrections shrinking,
   - are unresolved searches recurring,
   - are missing Chinese names concentrated around a source list,
   - are source conflicts blocking print/export confidence.
3. Review batch export usefulness:
   - can the summary sheet explain the batch,
   - does `Ready` exclude rows with review reasons and unresolved searches,
   - are upstream/source outages kept in retry review instead of unresolved
     identity cleanup,
   - do review reasons guide cleanup,
   - are columns understandable to a lab manager.
4. Re-run production gates before any wider pilot:
   - `npm run qa:production-health`
   - `npm run qa:production-search-ui`
   - `npm run qa:production-lab-ready-batch`
5. Re-rank the next work slice using `AUTONOMOUS_WORKFLOW.md`.

## Finding Classification

Use this classification when turning pilot evidence into work:

| Finding | Route | Notes |
| --- | --- | --- |
| Missing trusted Chinese name | Correction request -> candidate/manual review | Do not show English as Chinese. |
| Unresolved search | Miss query or correction request | Resolve with CAS only when identity evidence is clear. |
| Multiple GHS | User confirmation / source review | Not automatically a bug. |
| Source conflict | Correction request / SDS verification | Keep authority boundary visible. |
| Export hard to use | Product backlog | Prefer summary/scope improvements over more columns. |
| Label output clipped | P0 print regression | Do not print clipped required content. |
| Physical printer mismatch | Physical print checklist | Deferred until real materials exist. |
| Production 502 or stale deploy | P0 production reliability | Use Zeabur health/deploy workflow; require `/build-info.json` git SHA proof before heavier production QA. |
| GitHub Actions checkout 403 or account-suspended message | P0 repository/CI access | This is not a product-code failure. Confirm with `gh run view <run-id> --log-failed`, resolve GitHub account/repository access, then rerun CI before trusting or dismissing checks. |
| Zeabur deployment never starts or has no build log | P0 production reliability | If a redeploy stays pre-build (`startedAt` unset) or fails before build logs exist, treat it as Zeabur/GitHub integration or platform scheduling, not a Vite/build regression. Keep production QA pinned to `/build-info.json` commit proof. |
| Production Print QA source/upstream outage | Source reliability / retry | Distinguish this from a print-layout regression before changing renderer code. |

## Closure Evidence For A Pilot Round

Record:

- Date and production commit.
- Pilot batch size.
- Export files checked.
- Label outputs attempted.
- Correction items created.
- Admin triage counts before and after cleanup.
- Gates run.
- New risks or repeated patterns.
- Recommended next slice.

If this evidence cannot be collected, do not claim the pilot round is closed.
