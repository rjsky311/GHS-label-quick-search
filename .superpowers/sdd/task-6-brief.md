## Task 6: Evidence-backed secondary production gates

**Evidence source:** 2026-07-16 repository and live-response audit.

- Production `https://ghs-frontend.zeabur.app/` and
  `https://ghs-backend.zeabur.app/api/health` responses omit HSTS.
- With an `en-US` browser and no stored preference, the app renders English
  while `<html lang>` remains `zh-TW`.
- Both workflows use movable action tags; repository Actions policy does not
  require SHA pinning.
- GitHub private vulnerability reporting is disabled and the repository has
  neither `SECURITY.md` nor `CODEOWNERS`.
- Existing evidence already covers bounded 422 admin validation, API CSP,
  `nosniff`, referrer/permissions policy, modal semantics, focus wrapping, and
  CJK fallback declarations. Do not duplicate or redesign those controls.

**Affected user job:** trustworthy public lookup/print use and safe private
reporting/maintainer review without weakening the current product contract.

**Expected proof:** backend header test, production-health HSTS unit contract,
initial/dynamic document-language tests, production CJK font/semantic smoke
source contract, immutable workflow action pins, governance-file contract,
and verified GitHub private-reporting state.

**Stop condition:** all new tests pass, live production gates are ready to
verify after merge, no Critical/Important review finding remains, and physical
printer/stock/QR validation stays explicitly deferred.
