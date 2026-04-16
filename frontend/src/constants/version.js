/**
 * Single source of truth for the frontend-visible app version string.
 *
 * Displayed in the Footer. Must be kept in sync with:
 *   - frontend/package.json  "version"
 *   - backend/server.py      APP_VERSION
 *
 * Deliberately a hardcoded constant (not build-time-injected). A
 * follow-up can wire this to the package.json version at build time
 * once we actually need that indirection.
 */
export const APP_VERSION = "1.9.0";
