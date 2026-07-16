# Task 5 — admin authority lifecycle

## Outcome

1. `App` now owns one `useAdminAuthority` instance. The full admin key exists
   only in React memory; releases no longer load or persist it through browser
   storage, and the legacy `sessionStorage` entry is removed on mount,
   unlock, and lock.
2. Authority has an explicit lock action, a 15-minute idle timeout, an
   eight-hour absolute lifetime, and a monotonically increasing epoch. Reload
   starts locked, and disabled admin builds cannot be unlocked.
3. Every dashboard refresh and mutation is tied to the current opaque context
   token. Lock, expiry, identity replacement, disable, or unmount aborts active
   requests, masks protected state immediately, and prevents late success or
   late auth failure from repopulating the new context.
4. The Pilot sidebar exposes a visible Lock control. Invalid credentials and
   expiry close the protected sidebar and reopen a blank re-authentication
   dialog; the key is never prefilled after lock or reload.
5. Optional workspace sync and observability export now require the explicit
   key supplied by the central authority owner. No utility can rehydrate an
   admin identity from storage, and locked workspace sync remains local-only.
6. A queue-capacity `503` with stable code `review_queue_full` remains an
   operational mutation error and does not clear valid admin authority. Other
   `401`, `403`, and unavailable-admin `503` behavior remains fail-closed.

## Test-first evidence

The initial Task 5 contract run failed intentionally because
`useAdminAuthority` did not exist, the previous dashboard context model did
not invalidate a same-key request when the authority epoch changed, and the
application still restored the full key from `sessionStorage`. The admin
header unit contract already passed because it required an explicit key.

Implementation then exposed two integration gaps during review: workspace
documents still read the legacy stored key, and Task 4's queue-capacity `503`
would have been mistaken for an authentication failure. Both paths were moved
under the same authority boundary and covered by regression tests.

## Verification

```text
cd frontend && npm test -- --runInBand \
  src/hooks/__tests__/useAdminAuthority.test.js \
  src/hooks/__tests__/usePilotDashboard.test.js \
  src/utils/__tests__/workspaceDocuments.test.js \
  src/__tests__/App.sidebars.test.js
41 passed

cd frontend && npm test -- --runInBand
93 suites passed; 1344 tests passed

cd frontend && npm run lint
passed with zero warnings

cd frontend && npm run test:i18n
i18n parity OK: 1146 referenced keys; 1414 zh-TW and 1414 en keys

cd frontend && npm run build
passed; 239 modules transformed

git diff --check
passed
```

## Review

Spec compliance and task quality pass with no unresolved Critical or Important
finding. Protected dashboard state is synchronously masked on authority
change, active Axios work is aborted, and generation/context checks remain the
authoritative defense against transports that resolve after abort. The sole
browser-storage reference is a migration cleanup constant and removal call;
tests prove a remount starts locked and no unlock writes the key.
