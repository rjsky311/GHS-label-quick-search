# Task 6 — evidence-backed secondary production gates

## Outcome

1. Frontend and backend responses now emit a one-year HSTS policy with
   `includeSubDomains`. The production health gate records the header on both
   origins and fails unless `max-age` is at least 31,536,000 seconds.
2. The i18n owner now synchronizes `<html lang>` before first render and after
   every language change. An `en-US` local production build was browser-checked
   as `lang="en"`; Traditional Chinese remains `zh-TW`.
3. Production search UI QA now checks the active document language, the single
   `main-content` landmark, visible button accessible names, and a real
   `Noto Sans TC` CJK font load. Existing modal/focus/ARIA smoke checks remain
   in place. No new axe dependency was added because the repository does not
   currently carry axe; the new checks use the existing Playwright runtime.
4. All first-party GitHub Actions are pinned to the immutable commits resolved
   from their official `v6`/`v7` tags on 2026-07-16. A QA contract rejects a
   return to movable tags.
5. `SECURITY.md` directs sensitive reports to GitHub private vulnerability
   reporting and warns against public issues, credentials, private inventory,
   and unnecessary source documents. `.github/CODEOWNERS` makes the repository
   owner explicit. GitHub private vulnerability reporting was enabled and read
   back as `true`.
6. The evidence audit found no missing invalid-admin-status fix: Pydantic and
   route tests already reject unsupported correction/admin status values with
   `422`. Existing API CSP, MIME, referrer, permissions, and no-store controls
   also remain covered, so Task 6 did not duplicate them.

## Test-first evidence

Before implementation, the new contracts failed as intended:

- backend HSTS: `1 failed` because the header was absent;
- i18n document language: `2 failed` because the DOM language was empty in
  Jest (and live English production was observed as `zh-TW`); and
- secondary QA contracts: `4 failed` for the missing HSTS helper/gates,
  movable Action tags, absent governance files, and absent CJK/semantic smoke.

The live production health gate was then run once against exact current SHA
`39bf350d48b6a19086123a06a9d7b109690adf42`. Both HTTP responses and SHA
checks were healthy/current, while the new frontend and backend HSTS checks
failed specifically with an empty header. That is the expected pre-deployment
state and proves the new gate detects the real production gap.

## Verification

```text
cd backend && python -m pytest -q
401 passed; 1 pre-existing Starlette/httpx deprecation warning

cd frontend && npm test -- --runInBand
93 suites passed; 1344 tests passed

cd frontend && npm run test:qa-scripts
37 passed

cd frontend && npm run test:i18n
i18n parity OK: 1146 referenced keys; 1414 zh-TW and 1414 en keys

cd frontend && npm run test:docs
docs drift OK: version 1.10.0; 27 docs; 25 section statuses checked

cd frontend && npm run lint
passed with zero warnings

cd frontend && npm run build
passed; 239 modules transformed

python -m py_compile server.py api_models.py api_validation.py \
  resource_limits.py pdf_render.py pilot_store.py pilot_admin_routes.py
passed

Ruby YAML parse of both GitHub workflows
passed

local Playwright production build smoke (en-US)
lang=en; one #main-content landmark; four loaded Noto Sans TC faces;
zero unlabeled visible buttons

GitHub private vulnerability reporting read-back
enabled=true

git diff --check
passed
```

## Review

Spec compliance and task quality pass with no unresolved Critical or Important
finding. Review corrected a dangling 15-second browser timer in the CJK font
probe by clearing it after load/rejection. HSTS deliberately omits `preload`
because these are hosted subdomains, and production verification remains
mandatory after merge. Physical printer, stock, scaling, QR scan, thermal
quality, and pictogram readability evidence remains deferred and unclaimed.
