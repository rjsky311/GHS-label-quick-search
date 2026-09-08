# Platform Migration Preparation — 2026-09-08

## Boundary

- Source: the owner-approved staged move away from Zeabur, after confirming
  that no labels have been printed and the app has not been externally
  promoted.
- User job: keep lookup, batch work, label generation, PDF export, and QR
  return paths working while hosting changes.
- Completed here: Batch 1 read-only inventory, Batch 2 local portability,
  Batch 3 isolated Railway/Cloudflare shadow deployment, Batch 4 first-party
  custom-domain/DNS cutover, and Batch 5 immediate post-cutover acceptance.
- Stop condition: stop before payment or plan changes, Zeabur retirement,
  credential rotation, or removal of rollback provider URLs.

## Batch 1 — Verified Inventory

Verified from the current checkout and live services on 2026-09-08:

- Local `main` and production frontend build metadata matched commit
  `d41e984ef66c4ce89ef492a9f9dcc0c8ab54a283`; the public frontend and backend
  health endpoints responded successfully.
- Zeabur services `ghs-frontend` and `ghs-backend` were both `RUNNING` and had
  no attached volumes.
- Production variable-name inventory showed no `ADMIN_API_TOKEN`,
  `CAPTURE_DICTIONARY_MISSES`, or `PILOT_STORE_PATH`. Under current defaults,
  public admin writes and miss-query capture are disabled and production is
  suitable for a stateless first move.
- The ignored local file `backend/data/pilot.db` is not production state. It
  contains one approved manual dictionary entry, 23 aliases, one active
  reference link, no correction requests, no miss queries, and two pilot
  documents. Preserve it locally; do not upload it to the stateless shadow.
- The latest main CI for the deployed commit passed. The latest Production
  Print QA failure was the Zeabur provider-identity step returning HTTP 401
  for the repository `ZEABUR_TOKEN`, not a product-health failure.
- No `ghs.yuchelab.com` or `ghs-api.yuchelab.com` DNS records existed at the
  inventory boundary.

## Time-Critical Platform Risk

A current billing readback from the shared Zeabur account shows the Dev plan
is scheduled to downgrade to Free on 2026-09-10. Zeabur's current subscription
documentation states that deployed containerized services are automatically
suspended after a downgrade to Free:
https://zeabur.com/docs/en-US/subscription.

The GHS backend is a containerized FastAPI/Chromium service. Therefore the
platform risk is **not yet at an acceptable continuity threshold** even though
the current production health check is green. Batch 1 and Batch 2 reduce
migration uncertainty but do not create a replacement runtime. Before the
deadline, choose one of these explicitly authorized paths:

1. Recommended: create and validate the Railway backend shadow immediately,
   then add the Cloudflare Pages frontend shadow; keep DNS unchanged until all
   shadow gates pass.
2. Fallback if the shadow cannot be accepted in time: temporarily keep or
   restore the Zeabur Dev subscription, which is a paid billing decision and
   must not be performed without owner confirmation.

Do not assume that Free-plan auto-sleep preserves this backend: the general
Free-plan page discusses sleeping services, while the downgrade procedure is
more specific about suspending already deployed containerized services.

## Batch 2 — Local Portability Changes

- New QR and agent-summary links use the first-party canonical origin
  `https://ghs.yuchelab.com`; former Zeabur origins are no longer accepted as
  QR targets and fall back to the canonical origin.
- Frontend configuration now separates `VITE_BACKEND_URL` from
  `VITE_PUBLIC_APP_URL`. Backend configuration now exposes `PUBLIC_APP_URL`
  and defaults CORS to the first-party frontend.
- Public API discovery, CSP, coverage-audit defaults, production QA defaults,
  and the GitHub Issues safety link target the reserved first-party domains.
- Cloudflare Pages receives an SPA fallback through `frontend/public/_redirects`.
- Backend containers accept the host-provided `PORT`, preserve Chromium and
  Noto CJK dependencies, and recognize Railway git SHA metadata. Frontend
  build metadata recognizes Cloudflare Pages and Railway git commit/branch
  variables.
- Production Print QA no longer requires a Zeabur token or inline-Zeabur
  Dockerfile checks. Exact-SHA frontend build metadata, backend health, PDF
  canary, search UI, and product workflows remain the hosting-neutral gates.
  The Zeabur-specific scripts remain available for manual rollback-period
  diagnostics.
- No deprecated `railway.json` or `railway.toml` was added. Railway service
  configuration belongs to the shadow deployment after a real project and
  service exist and can be validated with a configuration plan.

## Batch 3 — Shadow Deployment Result

Owner authorization covered the existing Railway and Cloudflare accounts,
isolated shadow resources, shadow acceptance, and one verified branch push. It
did not cover DNS/custom-domain cutover, payment or plan changes, Zeabur
retirement, or key rotation.

Railway backend:

- Project: `ghs-label-quick-search-shadow`
- Project ID: `a7df1d13-d3f4-4562-a9c3-880150e92201`
- Service: `ghs-backend`
- Service ID: `38153323-7009-42ed-b6b6-76fd8f945e29`
- Region: one replica in Singapore (`asia-southeast1-eqsg3a`)
- URL: `https://ghs-backend-production.up.railway.app`
- Dockerfile: `Dockerfile.ghs-backend`
- Healthcheck: `/api/health`
- Successful deployment: `a60fcfc4-98f5-41d3-80d5-60ed0231b85f`
- Version-alignment deployment:
  `773ab46c-37bd-4ac9-b3fa-f096aa9e2933`
- Deployed source SHA: `9dd936f47f902bc53ce200a532e75500abe62d47`

The first Railway deployment (`08a1655c-ff87-4a2e-9b38-9c49d183bd82`)
failed because the non-root container user could not create the default
SQLite file under `/app/data`. The container recipes now create and chown only
`/app/data` before switching to `appuser`; application code remains owned by
root. A manifest regression test covers both backend Docker recipes. The
corrected deployment reached `SUCCESS` and its health/PDF checks are green.

Cloudflare Pages frontend:

- Project: `ghs-label-quick-search-shadow`
- URL: `https://ghs-label-quick-search-shadow.pages.dev`
- Direct Upload artifact: 43 files, built with Node `v22.23.1`
- Deployed source SHA: `9dd936f47f902bc53ce200a532e75500abe62d47`
- Backend configuration:
  `https://ghs-backend-production.up.railway.app`
- Canonical public origin: `https://ghs.yuchelab.com`

Cloudflare's Wrangler OAuth request included broad unrelated account scopes.
It was cancelled. The existing authenticated dashboard and Pages Direct Upload
were used instead, so no persistent CLI token or unrelated Worker was created.

The first deployed frontend artifact also revealed an independent shadow-only
failure: its HTML CSP allowed the reserved first-party API origin but not the
temporary Railway backend origin configured by `VITE_BACKEND_URL`. The earlier
browser timeout therefore had two causes: PubChem really was returning 503
through both backends, while the shadow browser was additionally blocking its
own backend request before it left the page. Commit `9dd936f` now derives the
credential-free HTTP(S) backend origin at build time, injects it into
`connect-src`, and falls back safely to the canonical API origin. The same
change removes an ineffective meta `frame-ancestors` directive and unused GHS
preloads; the response-header frame policy remains unchanged.

## Batch 3 Configuration Contract

DNS remained unchanged during this batch.

Cloudflare Pages frontend:

- Root directory: `frontend`
- Build runtime: Node 22 and npm 11.6.2
- Build command: `npm ci --no-audit && npm run build`
- Output directory: `build`
- `VITE_BACKEND_URL`: Railway shadow backend URL first; later
  `https://ghs-api.yuchelab.com`
- `VITE_PUBLIC_APP_URL`: `https://ghs.yuchelab.com`
- Pilot admin, workspace sync, and miss capture flags: `false`

Railway backend:

- Repository build context: repository root
- Dockerfile: `Dockerfile.ghs-backend`
- Healthcheck: `/api/health`
- Required public variables:
  `CORS_ORIGINS=https://ghs.yuchelab.com,https://ghs-label-quick-search-shadow.pages.dev`,
  `PUBLIC_APP_URL=https://ghs.yuchelab.com`
- Keep `ADMIN_API_TOKEN`, `CAPTURE_DICTIONARY_MISSES`, `PILOT_STORE_PATH`,
  Redis, database, and volume configuration unset for the stateless shadow.

## Shadow Acceptance Gates

Before any custom-domain or DNS change:

1. Frontend build metadata and backend `/api/health` expose the expected
   commit SHA; PDF capability is ready.
2. Browser CORS works only from the intended Cloudflare preview origin.
3. Search, batch search, complete label, QR small label, identification small
   label, export, PDF canary, and agent summary all pass against the shadow.
4. Generated QR targets use `https://ghs.yuchelab.com/?cas=...`, never a
   provider hostname.
5. No admin write or miss-capture endpoint becomes operational accidentally.
6. A rollback path to the unchanged Zeabur services remains available.

Only after all six gates pass should the owner be asked to authorize the
custom-domain/DNS cutover batch.

### Acceptance Readback — 2026-09-08

| Gate | Result | Evidence |
| --- | --- | --- |
| Exact SHA and runtime readiness | Pass | Frontend `build-info.json` and backend `/api/health` both report `9dd936f47f902bc53ce200a532e75500abe62d47`; backend is `ready`, PDF is available, HSTS is present. |
| CORS boundary | Pass | Preflight from `https://ghs-label-quick-search-shadow.pages.dev` returns the matching allow-origin header; `https://evil.example` is rejected with HTTP 400 and no allow-origin header. |
| PDF rendering | Pass | A real synthetic complete-label request to `/api/print/pdf` returned HTTP 200, `application/pdf`, `%PDF-`, one page, and 10,145 bytes. |
| Live PubChem integration | Externally blocked, monitoring stopped | PubChem's GHS Classification endpoint returned HTTP 503 `PUGVIEW.ServerBusy` through the Railway and unchanged Zeabur backends and by direct probe. At the owner's request, repeated waiting and the scheduled recovery tracker were stopped; this remains a live-provider evidence gap rather than a shadow-platform defect. |
| Downstream product workflows | Pass with deployed synthetic fixtures | Against the deployed Pages artifact, a fixed six-row API fixture exercised ready/review/blocked buckets, ready-scope XLSX export, complete/QR-small/identification-small labels, pictograms, desktop and 390 px mobile layout, and console health. All checks passed; this proves deterministic frontend behavior but is not a substitute for the unavailable live PubChem response. |
| Canonical QR contract | Pass with deployed synthetic fixtures | Complete and QR-small output both generated `https://ghs.yuchelab.com/?cas=67-64-1`; the identification-small output correctly generated no QR. |
| Admin/miss-capture isolation | Pass | Railway variables contain no admin token, capture flag, DB/Redis/volume, or pilot-store override. `/api/ops/report` reports that admin is not configured; miss capture returns `skipped: true`. |
| Rollback availability | Pass | Existing Zeabur services and settings were not changed or deleted. |

Local verification after the container fix:

- Backend: `404 passed` (one Starlette/httpx deprecation warning).
- Frontend: `94` test suites and `1,352` tests passed under the repository's
  normal Jest gate.
- Frontend QA-script tests: `46` passed, including five build-time CSP tests.
- Deployed synthetic browser QA passed with six rows, a 10,734-byte XLSX,
  all three label purposes, two pictograms per accepted output, canonical QR
  targets, no mobile horizontal overflow, and no console errors or warnings.
- Agent label-summary focused backend tests: `8` passed.
- Node 22 production build completed and generated the exact-SHA artifact used
  by Pages.
- Hosting-neutral production health and real PDF rendering passed against the
  shadow after both tiers were aligned to the same source SHA.
- Browser automation used regular Playwright because no supported browser
  plugin was available in this session; evidence stayed outside the repo.

## Batch 4 — First-Party Domain Cutover

The owner authorized the custom-domain/DNS cutover after accepting the shadow
evidence boundary. The cutover changed only the following scoped items:

- Railway custom domain ID
  `f4dfeaee-c5fa-4691-a2b1-b2ed7f8838a3` was created for
  `ghs-api.yuchelab.com`.
- Namecheap CNAME `ghs` now targets
  `ghs-label-quick-search-shadow.pages.dev`.
- Namecheap CNAME `ghs-api` now targets `sfjhrvyl.up.railway.app`.
- Namecheap TXT `_railway-verify.ghs-api` contains Railway's ownership token.
- Cloudflare Pages activated `ghs.yuchelab.com` with SSL enabled.
- Railway verified ownership, reported the custom domain `ACTIVE`, and issued
  a valid certificate for `ghs-api.yuchelab.com`.
- Railway `CORS_ORIGINS` now allows the canonical frontend and the Pages
  provider URL during the rollback window. `BUILD_GIT_SHA` was aligned to the
  current source SHA in the same change, followed by one backend deployment.
- Successful Railway cutover deployment:
  `006229b1-cb45-4f28-9978-d849fead78af`.
- Cloudflare Pages production deployment:
  `https://9c7ac7b9.ghs-label-quick-search-shadow.pages.dev`.
- The production Pages artifact was rebuilt with
  `VITE_BACKEND_URL=https://ghs-api.yuchelab.com` and
  `VITE_PUBLIC_APP_URL=https://ghs.yuchelab.com`.

No other Namecheap records were edited. No Zeabur service, provider URL,
credential, billing setting, or subscription setting was removed or changed.
The cutover used local builds plus provider-native deployments and consumed no
GitHub Actions minutes.

## Batch 5 — Immediate Post-Cutover Acceptance

Acceptance was read back against the canonical domains on 2026-09-08:

| Gate | Result | Evidence |
| --- | --- | --- |
| DNS and TLS | Pass | Both Namecheap authoritative nameservers and public resolvers returned the planned CNAMEs. Cloudflare reports the frontend domain `Active` with SSL enabled; Railway reports the backend domain `ACTIVE`, ownership verified, and certificate valid. |
| Exact version | Pass | Canonical frontend `build-info.json` and backend `/api/health` both report `1b96d752afebf7d81f06992ecc4735af515cf41a`; backend readiness is `ready` and PDF capability is available. |
| Frontend security headers | Pass | Canonical frontend returns HSTS, Cloudflare's frame-ancestor response policy, and an HTML CSP whose `connect-src` includes only the configured canonical API plus local development sockets. |
| CORS and rollback | Pass | Canonical frontend origin and Pages provider origin each receive their matching allow-origin header; `https://evil.example` receives HTTP 400 with no allow-origin header. |
| Real PDF renderer | Pass | A real synthetic complete-label POST returned HTTP 200, `application/pdf`, `%PDF-`, 10,145 bytes, one A4 page, and an attachment filename. |
| Deployed browser workflow | Pass with synthetic fixtures | Eight fixed inventory-shaped rows exercised the live canonical artifact's batch request to `https://ghs-api.yuchelab.com/api/search`, produced the expected 6/8 found, 1 unresolved, 1 label-ready, 7 needs-review, and 8 export summary, exposed export trust/source columns, and opened all three public label outputs. |
| QR and provider-host isolation | Pass with synthetic fixtures | Complete and QR-small previews use `https://ghs.yuchelab.com/?cas=67-64-1`; identification-small has no QR; no Pages, Railway, or Zeabur provider hostname leaked into label previews. |
| Mobile and console | Pass with synthetic fixtures | At 390 px, document and body scroll widths remained exactly 390 px; browser console and page errors were empty. |
| Live PubChem integration | External gap retained | This batch did not restart polling. The last verified PubChem state remained HTTP 503 across the replacement and legacy backends, so synthetic acceptance is not described as live-provider proof. |

Current decision: first-party cutover and immediate deterministic acceptance
are complete. The canonical Cloudflare Pages/Railway path is the active
production path. Keep provider URLs and unchanged Zeabur services only for a
short 24-72 hour observation window. Because no labels were printed and the
site was not externally promoted, a long compatibility period is unnecessary;
however, retirement and credential cleanup remain a separate destructive
batch that requires a fresh exact-target authorization.

Source promotion remains open: `codex/ghs-platform-portability` contains
multiple commits not yet in `origin/main`, and no pull request exists yet.
During the observation window, open one controlled PR, spend one CI run after
local gates are green,
merge the migration source into `main`, and realign both canonical deployments
to the merged SHA. Do not retire rollback infrastructure while the durable
source of truth still lives only on the migration branch.

## Retention And Cleanup

- Retain: this evidence record, source changes, tests, and the ignored local
  `backend/data/pilot.db`.
- Do not retain: generated frontend `build/` output, test screenshots, QA JSON,
  or temporary Python environments created solely for local validation.
- Retain temporarily after this cutover: Zeabur services, provider URLs, and
  their rollback access for the 24-72 hour observation window.
- Remove only after a successful observation window and fresh authorization:
  obsolete Zeabur services, stale provider secrets, old provider-specific
  environment variables, and rollback-only artifacts.
