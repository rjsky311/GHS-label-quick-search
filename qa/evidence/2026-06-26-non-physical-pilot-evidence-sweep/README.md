# Non-Physical Pilot Evidence Sweep - 2026-06-26

This checkpoint records a non-physical pilot readiness pass while real printer,
label stock, and QR scan validation remain deferred.

The package date uses the owner's local checkpoint date in Asia/Taipei. Machine
report timestamps are UTC.

## Source

- User request: complete the first two recommended next steps while physical
  printing stays deferred.
- Step 1: run a non-physical pilot evidence sweep.
- Step 2: if data/admin evidence exists, complete the smallest
  data-governance or admin-triage follow-up; otherwise record why no new slice
  should open.
- Current `main` / production SHA:
  `6bca02e874af00adc63632f49f13ffc1e94c2bcd`.
- Production frontend: https://ghs-frontend.zeabur.app
- Production backend: https://ghs-backend.zeabur.app

## Production And CI Evidence

`git status --short --branch` showed a clean tracked worktree on
`main...origin/main` before the sweep.

Latest visible GitHub state:

- No open pull requests.
- Latest visible `CI` run on `main` for
  `6bca02e874af00adc63632f49f13ffc1e94c2bcd`: success.
- Latest visible `Production Print QA` runs on `main` for
  `6bca02e874af00adc63632f49f13ffc1e94c2bcd`: success.

Production verification run locally:

```bash
cd frontend
PRODUCTION_HEALTH_EXPECTED_GIT_SHA=$(git rev-parse HEAD) npm run qa:production-product
```

Result:

- `production-smoke`: passed.
- `production-prepared`: passed, 9/9 prepared workflow cases.
- `production-batch-print`: passed on the default 51-CAS fixture.
- `production-summary`: passed.
- Product blocks: 8/8 green.
- Summary: 8 reports present, 0 failed reports, 0 incomplete product blocks,
  0 actionable failures, 0 report warnings, and no failure triage buckets.

The production health sub-check matched both frontend `build-info.json` and
backend `/api/health` to expected SHA
`6bca02e874af00adc63632f49f13ffc1e94c2bcd`.

## Admin Evidence Sweep

The local ignored pilot store `backend/data/pilot.db` was inspected through the
existing maintainer/admin tools. The database is not tracked in git; no tracked
seed dictionary or runtime code changed.

Before admin triage, `python backend/scripts/manage_dictionary_growth.py report`
showed:

- Correction requests: 0 open.
- Missing Chinese-name reports: 0.
- Unresolved miss queries: 0.
- Manual entries in review: 0.
- Reference links needing review: 0.
- Alias review queue: 22 pending aliases.
- Recommended focus: `alias_review`.

`python backend/scripts/discover_candidates.py --from-correction-requests
--sources manual,local --limit 100` returned a dry-run report with
`checked: 0`, `candidateCount: 0`, and `publicDataChanged: false`.

Interpretation:

- There was no correction-request or missing-name evidence that justified
  opening external candidate discovery.
- The concrete admin signal was a bounded alias-review queue.

## Admin Triage Completed

The 22 pending aliases were all English PubChem synonym candidates for
`7732-18-5` (water). They were reviewed as local admin curation work through
the existing `PilotStore.upsert_alias()` path.

Approved as water aliases:

- `DHMO`
- `Deionized water`
- `Dihydrogen Monoxide`
- `Dihydrogen oxide`
- `Distilled water`
- `Purified water`
- `Sterile purified water`
- `Sterile water`
- `Sterile water for irrigation`
- `Water for hemodialysis`
- `Water for injection`
- `Water vapor`
- `Water, deionized`
- `Water, distilled`
- `Water, purified`
- `Water, purified sterile`
- `Water, sterile`
- `aqua`
- `oxidane`
- `steam`

Rejected:

- `Pur-wash`: ambiguous trade/product-like synonym; do not resolve to water
  without stronger local evidence.
- `Water, mineral`: mixture/grade-like term; do not resolve to pure water CAS
  without stronger local evidence.

After triage:

- Alias status counts: `approved: 21`, `pending: 0`,
  `needs_evidence: 0`, `rejected: 2`.
- Pending aliases: 0.
- Needs-evidence aliases: 0.
- Pilot triage open work items: 0.
- Recommended focus: healthy / no queued pilot curation work.

Note: this was a local ignored pilot-store data update. It did not create a
tracked code change, did not approve any unreviewed Chinese name, did not
write public dictionary seed data, and did not add external discovery sources.

## Decision

The first recommended priority is complete: the non-physical production and
pilot evidence sweep is green.

The second recommended priority is also complete for the evidence that existed:
the only real admin signal was the alias-review queue, and it has been triaged
to zero open alias-review items.

Do not open an external candidate-discovery, admin UI, print polish, or runtime
data-governance implementation slice from this checkpoint. Reopen only from new
evidence:

- user-provided batch Excel/PDF/screenshot,
- production QA or CI failure,
- non-empty correction/admin queue evidence,
- export handoff confusion,
- code-review finding,
- or a deliberate source/cost decision for external discovery.

Physical print validation remains deferred until real paper, label stock,
printer scaling, and QR scan evidence are available.
