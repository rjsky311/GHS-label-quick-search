const rawBackendUrl =
  (typeof globalThis.__APP_BACKEND_URL__ === "string"
    ? globalThis.__APP_BACKEND_URL__
    : "");

export const BACKEND_URL = rawBackendUrl.trim().replace(/\/+$/, "");
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

// Mirrors the backend's Pydantic `CASQuery.cas_numbers` max_length.
// Keep these in sync: oversized batch requests are already rejected
// by the backend with HTTP 422 via Pydantic validation; this constant
// lets the frontend provide a friendlier preemptive experience.
export const BATCH_SEARCH_LIMIT = 100;

// GHS pictograms are checked-in public SVG assets so print preflight never
// depends on third-party image availability or Vite's hashed asset splitting.
export const GHS_IMAGES = {
  GHS01: "/ghs/GHS01.svg",
  GHS02: "/ghs/GHS02.svg",
  GHS03: "/ghs/GHS03.svg",
  GHS04: "/ghs/GHS04.svg",
  GHS05: "/ghs/GHS05.svg",
  GHS06: "/ghs/GHS06.svg",
  GHS07: "/ghs/GHS07.svg",
  GHS08: "/ghs/GHS08.svg",
  GHS09: "/ghs/GHS09.svg",
};
