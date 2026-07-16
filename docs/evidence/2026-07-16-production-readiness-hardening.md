# Production-readiness hardening evidence — 2026-07-16

Status: complete and production-verified.

## Scope and publication boundary

- Base: `39bf350d48b6a19086123a06a9d7b109690adf42`.
- Implementation branch: `codex/production-ready-hardening`.
- Pull request: [#46](https://github.com/rjsky311/GHS-label-quick-search/pull/46).
- Reviewed head: `8d310c35ebc9e841b49d0b22368dd3fb9c9251c7`.
- Merge commit and production SHA:
  `655b155c9f06ad095ddaaa23f141c1f3ead277bf`.
- Runtime version remains `1.10.0`; this slice did not version-bump.

The slice hardened safety-critical print semantics, raw request-body limits,
server-rendered PDF validation, durable review-queue admission, admin-key
authority, production security headers, CI trust boundaries, and deployment
proof. It did not change the three-output label model or promote any
review-only data into public dictionary authority.

## Local and review evidence

- Backend compile plus full pytest: **403 passed**, with only the pre-existing
  Starlette/httpx deprecation warning.
- Frontend Jest: **93 suites / 1,344 tests passed**.
- Print contract: **9 suites / 337 tests passed**.
- Rendered PDF QA: **42/42 cases passed**.
- H-code coverage: **48 unique codes, zero gaps**.
- P-code coverage: **67 unique codes, zero gaps**.
- Frontend i18n, docs drift, lint, production build, bundle budget, GitHub
  resource budget, and QA-script tests passed.
- `npm audit --omit=dev --audit-level=high`: **0 vulnerabilities**.
- Isolated CI-equivalent `pip-audit -r requirements.txt`: **no known
  vulnerabilities**.
- GitHub Dependabot open alerts: **0**. Secret-scanning open alerts: **0**.
  Code scanning was not configured and returned 404 rather than a clean scan.

The machine-wide artifact-first `second-opinion` harness reviewed the public
whole-branch diff twice through the company LiteLLM `gemini-3.5-flash` route.
The first pass produced four Important candidates; primary verification
rejected three and reproduced one transaction-consistency defect. The defect
was fixed test-first so alias commits roll back cleanly and in-memory version
state advances only after commit. The focused second pass reported no
unresolved Critical or Important issue. Reports remain outside the repository:

- `/Users/yuchelin/Documents/Mac mini設置/reports/second-opinions/20260716-140731-litellm-company-code-review.md`
- `/Users/yuchelin/Documents/Mac mini設置/reports/second-opinions/20260716-141624-litellm-company-code-review.md`

No Claude second-opinion route was used.

GitHub PR CI run `29478064221` passed Backend and Frontend on reviewed head
`8d310c35ebc9e841b49d0b22368dd3fb9c9251c7`. The official Codex PR review
identified one actionable P1: Zeabur static hosting also needed a root
`_headers` file before HSTS could be a hard production gate. Commit `8d310c3`
added `frontend/public/_headers`, regression coverage, and build-output copy
proof. The review thread was answered with evidence and resolved after owner
authorization.

## Builder-platform detachment and repository governance

- Legacy `emergent-agent-e1` history remains historical; the current tree has
  no Lovable/Emergent/v0 markers, `.lovable` directory, or builder production
  hosting/backend reference.
- The repository-specific GitHub Apps page contains no Lovable or Emergent.
- The `genspark ai developer` installation was changed from all repositories
  to 27 explicitly selected other repositories, excluding
  `GHS-label-quick-search`. The repository-specific Installed GitHub Apps page
  then showed only ChatGPT Codex Connector, Claude, Manus Connector, and
  Zeabur; Genspark was absent.
- The repository has only the owner as collaborator, no webhook, no deploy
  key, only the expected `ZEABUR_TOKEN` Actions secret and `production`
  environment, and recent deployments created by `zeabur[bot]`.
- GitHub private vulnerability reporting is enabled.
- The one-review branch-protection count was temporarily changed from 1 to 0
  solely for the owner-authorized merge, then immediately restored to 1.
  Strict Backend/Frontend checks, stale-review dismissal, admin enforcement,
  conversation resolution, and force-push/deletion prohibitions remained
  enabled.

Four local worktrees and their local-only artifacts were preserved. The
primary checkout's 18 untracked design/QA files and the small untracked
`backend/build/` directories were not deleted, moved, staged, or overwritten.

## Exact-SHA deployment and production proof

PR #46 merged at `2026-07-16T07:00:21Z`. Zeabur auto-deployed both services
from the exact merge commit:

- Frontend deployment `6a588187e7982a17f4f40701`: **RUNNING**, SHA
  `655b155c9f06ad095ddaaa23f141c1f3ead277bf`.
- Backend deployment `6a588189e7982a17f4f40704`: **RUNNING**, SHA
  `655b155c9f06ad095ddaaa23f141c1f3ead277bf`.

`qa:zeabur-deployment` passed with the expected frontend service ID/name,
build variables, monorepo app directory, build command, output directory,
backend origin, and exact commit. Live frontend `build-info.json` and backend
`/api/health` both reported the full expected SHA. HTTPS responses from the
frontend HTML/assets and backend health endpoint carried a one-year HSTS
policy; frontend responses also carried CSP frame protection, MIME sniffing,
framing, referrer, and permissions policies.

Production QA at the exact SHA passed:

- Production health: frontend HTML/asset/build-info plus backend health,
  readiness, PDF capability, exact SHA, and HSTS — **PASS**.
- Active PDF canary: HTTP 200, `application/json`, 7,974 generated PDF bytes,
  valid PDF header — **PASS**.
- Search UI: desktop/mobile lookup, source trust, modal focus, document
  language, CJK font readiness, no-GHS state, batch normalization, and export
  review columns — **PASS**.
- Print handoff matrix: **6/6** cases passed, including A4, Letter,
  profile-blocked, continuation, identification, and 62 mm QR supplemental.
- Prepared solution matrix: **9/9** prepared/reprint/preset cases passed.
- Batch print: **51** unique CAS values found, **47** printable, no unresolved
  lookup rows, review signals retained in the UI/export handoff — **PASS**.
- Product summary: **9** reports present, **0** failed reports, **0** warnings,
  and all **8** product blocks complete and green.

GitHub main CI run `29478467505` and Production Print QA run `29478558444`
both passed the exact merge SHA. Dependency Graph run `29478470082` also
completed successfully.

## Stop condition and external owner handoff

All actionable software, repository-governance, publication, deployment, and
production-verification gates for this slice are closed. Do not continue
hardening, print polish, admin tooling, or refactoring from this work by
inertia.

The only remaining validation is intentionally external and physical:

- real printer scaling and margins on A4/Letter paper;
- actual label-stock alignment and adhesive/media behavior;
- thermal-printer density and durability;
- physical pictogram/text readability;
- real-device QR scanning from printed labels.

These checks require the owner's printers, paper/stock, and phones. They are
not evidence of an unfinished software slice and must not be simulated as a
production-completion substitute.
