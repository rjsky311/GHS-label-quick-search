# Platform Migration Preparation — 2026-09-08

## Boundary

- Source: the owner-approved staged move away from Zeabur, after confirming
  that no labels have been printed and the app has not been externally
  promoted.
- User job: keep lookup, batch work, label generation, PDF export, and QR
  return paths working while hosting changes.
- Completed here: Batch 1 read-only inventory and Batch 2 local portability.
- Stop condition: stop before creating or changing Cloudflare Pages, Railway,
  DNS, GitHub integrations/secrets, production deployments, or Zeabur state.

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

## Batch 3 — Immediate Recommended Shadow Deployment Contract

Do not cut DNS during this batch. Create isolated services only after explicit
authorization.

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
