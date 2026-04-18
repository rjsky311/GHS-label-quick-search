const readEnv = (key) =>
  typeof process !== "undefined" && process.env ? process.env[key] || "" : "";

export const PILOT_ADMIN_SESSION_KEY = "ghs.pilotAdminKey";
export const PILOT_ADMIN_ENABLED =
  readEnv("VITE_ENABLE_PILOT_ADMIN").trim().toLowerCase() === "true";

export function loadPilotAdminKey() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(PILOT_ADMIN_SESSION_KEY) || "";
}

export function persistPilotAdminKey(value) {
  if (typeof window === "undefined") return;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    window.sessionStorage.removeItem(PILOT_ADMIN_SESSION_KEY);
    return;
  }
  window.sessionStorage.setItem(PILOT_ADMIN_SESSION_KEY, normalized);
}

export function clearPilotAdminKey() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PILOT_ADMIN_SESSION_KEY);
}

export function buildPilotAdminHeaders(adminKey) {
  const normalized = typeof adminKey === "string" ? adminKey.trim() : "";
  return normalized ? { "x-ghs-admin-key": normalized } : {};
}
