import GHS01 from "@/assets/ghs/GHS01.svg";
import GHS02 from "@/assets/ghs/GHS02.svg";
import GHS03 from "@/assets/ghs/GHS03.svg";
import GHS04 from "@/assets/ghs/GHS04.svg";
import GHS05 from "@/assets/ghs/GHS05.svg";
import GHS06 from "@/assets/ghs/GHS06.svg";
import GHS07 from "@/assets/ghs/GHS07.svg";
import GHS08 from "@/assets/ghs/GHS08.svg";
import GHS09 from "@/assets/ghs/GHS09.svg";

const rawBackendUrl =
  (typeof globalThis.__APP_BACKEND_URL__ === "string"
    ? globalThis.__APP_BACKEND_URL__
    : "") ||
  (typeof process !== "undefined" && process.env
    ? process.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || ""
    : "");

export const BACKEND_URL = rawBackendUrl.trim().replace(/\/+$/, "");
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

// Mirrors the backend's Pydantic `CASQuery.cas_numbers` max_length.
// Keep these in sync: oversized batch requests are already rejected
// by the backend with HTTP 422 via Pydantic validation; this constant
// lets the frontend provide a friendlier preemptive experience.
export const BATCH_SEARCH_LIMIT = 100;

// GHS pictograms are checked-in SVG assets so print preflight never
// depends on third-party image availability.
export const GHS_IMAGES = {
  GHS01,
  GHS02,
  GHS03,
  GHS04,
  GHS05,
  GHS06,
  GHS07,
  GHS08,
  GHS09,
};
