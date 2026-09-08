# Platform Migration Preparation — 2026-09-08

## Boundary

- Source: the owner-approved staged move away from Zeabur, after confirming
  that no labels have been printed and the app has not been externally
  promoted.
- User job: keep lookup, batch work, label generation, PDF export, and QR
  return paths working while hosting changes.
- Completed here: Batch 1 read-only inventory, Batch 2 local portability, and
  the owner-authorized Batch 3 isolated Railway/Cloudflare shadow deployment.
- Stop condition: stop before custom-domain/DNS changes, payment or plan
  changes, Zeabur retirement, credential rotation, or production promotion.

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
- Deployed source SHA: `76e1129a324779ba8c7084744b789f9e316dabfe`

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
- Deployed source SHA: `76e1129a324779ba8c7084744b789f9e316dabfe`
- Backend configuration:
  `https://ghs-backend-production.up.railway.app`
- Canonical public origin: `https://ghs.yuchelab.com`

Cloudflare's Wrangler OAuth request included broad unrelated account scopes.
It was cancelled. The existing authenticated dashboard and Pages Direct Upload
were used instead, so no persistent CLI token or unrelated Worker was created.

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
- Required public variables: `CORS_ORIGINS=<Cloudflare preview origin>`,
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
| Exact SHA and runtime readiness | Pass | Frontend `build-info.json` and backend `/api/health` both report `76e1129a324779ba8c7084744b789f9e316dabfe`; backend is `ready`, PDF is available, HSTS is present. |
| CORS boundary | Pass | Preflight from `https://ghs-label-quick-search-shadow.pages.dev` returns the matching allow-origin header; `https://evil.example` is rejected with HTTP 400 and no allow-origin header. |
| PDF canary | Pass | Shadow canary returned a non-empty `%PDF-` document (7,974 bytes). |
| Search and downstream product workflows | Externally blocked | The live browser QA exhausted both runs because PubChem's GHS Classification endpoint returned HTTP 503 `PUGVIEW.ServerBusy`. The same CAS failed through the unchanged Zeabur backend, and a direct PubChem probe returned the same 503 with `Retry-After: 30`; this isolates the failure from the new platforms. No search result means the dependent batch/label/export browser gates cannot truthfully pass yet. |
| Canonical QR contract | Locally verified, live proof pending | The portability tests and frontend suite pass; a live generated-result check remains coupled to the blocked search gate. |
| Admin/miss-capture isolation | Pass | Railway variables contain no admin token, capture flag, DB/Redis/volume, or pilot-store override. `/api/ops/report` reports that admin is not configured; miss capture returns `skipped: true`. |
| Rollback availability | Pass | Existing Zeabur services and settings were not changed or deleted. |

Local verification after the container fix:

- Backend: `404 passed` (one Starlette/httpx deprecation warning).
- Frontend: `94` test suites and `1,352` tests passed under the repository's
  normal Jest gate.
- Node 22 production build completed and generated the exact-SHA artifact used
  by Pages.
- Hosting-neutral production health and PDF canary passed against the shadow.
- The aggregate production-product QA correctly failed at the live search UI
  gate because of the external PubChem 503; later dependent steps were not
  misreported as executed.

Current decision: the replacement infrastructure is established and its
platform-level gates are green, but Batch 3 is not a full product acceptance
until the live search-dependent QA is rerun after PubChem recovers. Do not cut
DNS on partial evidence.

## Retention And Cleanup

- Retain: this evidence record, source changes, tests, and the ignored local
  `backend/data/pilot.db`.
- Do not retain: generated frontend `build/` output, test screenshots, QA JSON,
  or temporary Python environments created solely for local validation.
- Retain temporarily after a later cutover: Zeabur services and their rollback
  access for the agreed observation window.
- Remove only after a successful observation window and fresh authorization:
  obsolete Zeabur services, stale provider secrets, old provider-specific
  environment variables, and rollback-only artifacts.
