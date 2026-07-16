const readEnv = (key) =>
  typeof process !== "undefined" && process.env ? process.env[key] || "" : "";

const readDefinedPilotAdminFlag = () =>
  typeof globalThis.__APP_PILOT_ADMIN_ENABLED__ === "boolean"
    ? globalThis.__APP_PILOT_ADMIN_ENABLED__
    : null;

export const PILOT_ADMIN_SESSION_KEY = "ghs.pilotAdminKey";
export const PILOT_ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const PILOT_ADMIN_ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000;
export const PILOT_ADMIN_ENABLED =
  readDefinedPilotAdminFlag() ??
  (readEnv("VITE_ENABLE_PILOT_ADMIN").trim().toLowerCase() === "true");

export function clearPilotAdminKey() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PILOT_ADMIN_SESSION_KEY);
  } catch {
    // Storage may be unavailable under strict browser privacy settings. The
    // active key still lives only in React memory and is cleared by its owner.
  }
}

export function buildPilotAdminHeaders(adminKey) {
  const normalized = typeof adminKey === "string" ? adminKey.trim() : "";
  return normalized ? { "x-ghs-admin-key": normalized } : {};
}
