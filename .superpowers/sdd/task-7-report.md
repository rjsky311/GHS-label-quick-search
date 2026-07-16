# Task 7 report — integration, deployment, and second review

Status: complete; local integration, independent review, protected publication,
builder detachment, exact-SHA deployment, and production proof are closed.

## Local integration evidence

Verified on `codex/production-ready-hardening` through `8d310c3`:

- Backend compile plus full pytest: **403 passed**, with only the pre-existing
  Starlette/httpx deprecation warning.
- Frontend Jest: **93 suites / 1,344 tests passed**.
- Print contract: **9 suites / 337 tests passed**.
- Rendered PDF QA: **42/42 cases passed** after generating the print report and
  HTML artifact index.
- H-code coverage: **48 unique codes, zero gaps**.
- P-code coverage: **67 unique codes, zero gaps**.
- Frontend i18n, docs drift, lint, production build, bundle budget, GitHub
  resource budget, and QA-script tests passed.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities**.
- Isolated CI-equivalent `pip-audit -r requirements.txt`: **no known
  vulnerabilities**.
- `git diff --check` passed.

The GitHub resource gate remained green. It reported a non-blocking inventory
warning for 200.26 MiB of expired artifacts still listed by GitHub; the gate is
report-only by policy and no artifacts or caches were deleted.

## Independent review and adjudication

The public whole-branch diff, excluding local `.superpowers` records, build
artifacts, credentials, environment files, browser state, and private data, was
reviewed once through the machine-wide artifact-first `second-opinion` harness
using the company LiteLLM `gemini-3.5-flash` route. The report is outside the
repository at:

`/Users/yuchelin/Documents/Mac mini設置/reports/second-opinions/20260716-140731-litellm-company-code-review.md`

The review proposed four Important findings. Primary verification concluded:

1. Admin expiry render loop — unsupported. The effect has stable dependencies;
   `closeSidebar()` synchronously clears the active-sidebar ref, so later
   dependency changes hit the ref guard.
2. ASGI partial-body disconnect hang — unsupported. A real Starlette `Request`
   regression test observes `ClientDisconnect` and completes without waiting
   for another body chunk.
3. Locked workspace refresh clears remote data — unsupported. Blank keys make
   both fetch and save local-only without Axios traffic; hooks retain their
   localStorage initialization and refetch only after an explicit key appears.
4. Alias commit/version divergence — supported and fixed test-first. Commit is
   now inside the rollback-protected transaction block, and the in-memory
   dictionary version advances only through an after-commit callback while the
   store lock is still held. A forced commit-failure test proves rollback,
   unchanged version, and no persisted alias.

A focused follow-up review through the same company LiteLLM route confirmed the
transaction correction, accepted the evidence for the three unsupported
findings, and reported **no unresolved Critical or Important issue**:

`/Users/yuchelin/Documents/Mac mini設置/reports/second-opinions/20260716-141624-litellm-company-code-review.md`

No Claude second-opinion route was used.

## Builder-platform and workspace reconciliation

- Repository history contains legacy `emergent-agent-e1` commits through
  2026-01-14; commit `394a1f4` removed Emergent branding on 2026-02-08.
- The current tree has no Lovable/Emergent/v0 markers, `.lovable` directory,
  or builder-hosting/backend reference.
- GitHub account Installed Apps shows no Lovable. The repository-specific
  GitHub Apps page shows no Emergent access.
- Repository API evidence shows only the owner as collaborator, no webhook,
  no deploy key, only the expected `ZEABUR_TOKEN` Actions secret and
  `production` environment, and recent deployments created only by
  `zeabur[bot]`.
- `genspark ai developer` was changed from all repositories to 27 explicitly
  selected other repositories, excluding this repository. The
  repository-specific Installed GitHub Apps page then showed no Genspark
  entry.
- Four local worktrees were inventoried and preserved. The primary checkout has
  18 untracked design/QA files (about 25.5 MiB); the hardening and current
  production-ready worktrees each have a 4 KiB untracked `backend/build/`;
  the remediation worktree is clean. None were deleted, moved, staged, or
  overwritten.

## Protected publication and review closure

- PR #46 reviewed head:
  `8d310c35ebc9e841b49d0b22368dd3fb9c9251c7`.
- PR CI run `29478064221`: Backend and Frontend passed.
- The official Codex review identified one actionable HSTS/static-hosting
  finding. Commit `8d310c3` added `frontend/public/_headers`, a regression test,
  and Vite build-output copy proof. The thread was answered with evidence and
  resolved after explicit owner authorization.
- PR #46 merged as
  `655b155c9f06ad095ddaaa23f141c1f3ead277bf` at
  `2026-07-16T07:00:21Z`.
- The owner-authorized approval-count exception changed only the required
  count from 1 to 0 for the merge and immediately restored it to 1. Strict
  Backend/Frontend checks, stale-review dismissal, admin enforcement,
  conversation resolution, and force-push/deletion prohibitions remained
  enabled.

## Exact-SHA deployment and production evidence

- Frontend deployment `6a588187e7982a17f4f40701`: RUNNING at the full merge
  SHA.
- Backend deployment `6a588189e7982a17f4f40704`: RUNNING at the full merge
  SHA.
- `qa:zeabur-deployment`: PASS with service identity, build variables,
  monorepo build configuration, backend origin, and exact SHA verified.
- Live frontend HTML/assets/build-info and backend health responses carried
  one-year HSTS. Both services reported the exact merge SHA; backend health
  reported ready with PDF capability available.
- Active PDF canary: PASS, 7,974 generated bytes with a valid PDF header.
- Production search UI: PASS.
- Production print handoff: 6/6 cases passed.
- Prepared solution print/reprint/preset: 9/9 cases passed.
- Batch print: 51 found, 47 printable, 0 unresolved; review signals retained.
- Product summary: 9 reports, 0 failed, 0 warnings, all 8 product blocks green.
- GitHub main CI run `29478467505`: PASS.
- Production Print QA run `29478558444`: PASS.

The canonical evidence record is
`docs/evidence/2026-07-16-production-readiness-hardening.md`.

## Residual external validation

Task 7 has no remaining actionable software or repository-governance gate.
Real printer scaling, paper/label-stock alignment, thermal quality, physical
pictogram/text readability, and real-device scanning of printed QR labels
remain an explicit owner handoff because they require physical equipment.
