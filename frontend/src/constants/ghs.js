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
// Keep these in sync — oversized batch requests are already rejected
// by the backend with HTTP 422 via Pydantic validation; this constant
// lets the frontend provide a friendlier preemptive experience.
export const BATCH_SEARCH_LIMIT = 100;

const encodeSvg = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const ghsSvg = (inner) =>
  encodeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img">
  <rect x="20" y="20" width="60" height="60" fill="#fff" stroke="#ef2b2d" stroke-width="7" transform="rotate(45 50 50)"/>
  <g fill="#111" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`);

// GHS pictograms are embedded so print preflight never depends on
// third-party image availability.
export const GHS_IMAGES = {
  GHS01: ghsSvg(`
    <path d="M50 25 L55 42 L72 34 L61 49 L78 55 L59 57 L66 74 L51 62 L39 77 L42 58 L22 61 L39 51 L27 35 L45 43 Z" fill="#111" stroke="none"/>
    <path d="M23 28 L33 38 M74 24 L64 37 M79 75 L67 63 M25 74 L37 63" fill="none"/>
  `),
  GHS02: ghsSvg(`
    <path d="M53 76 C36 72 29 60 34 48 C37 40 44 36 45 26 C54 34 55 42 53 49 C60 45 63 38 62 30 C74 44 74 60 65 69 C61 73 57 75 53 76 Z" fill="#111" stroke="none"/>
    <path d="M49 73 C43 69 42 62 46 56 C49 52 52 50 52 44 C59 52 61 61 56 68 C54 71 52 72 49 73 Z" fill="#fff" stroke="none"/>
  `),
  GHS03: ghsSvg(`
    <circle cx="50" cy="62" r="13" fill="none" stroke-width="5"/>
    <path d="M52 48 C43 44 40 37 45 27 C53 34 56 41 54 48 C60 45 63 39 62 31 C72 43 70 55 60 62 C58 56 56 51 52 48 Z" fill="#111" stroke="none"/>
  `),
  GHS04: ghsSvg(`
    <g transform="rotate(-10 50 50)">
      <rect x="24" y="45" width="48" height="12" rx="6" fill="#111" stroke="none"/>
      <rect x="68" y="47" width="8" height="8" rx="2" fill="#111" stroke="none"/>
      <path d="M29 51 H67" stroke="#fff" stroke-width="2"/>
    </g>
  `),
  GHS05: ghsSvg(`
    <path d="M25 65 H46 M28 70 H43" fill="none"/>
    <path d="M59 65 C63 61 71 61 75 65 M57 70 H77" fill="none"/>
    <g transform="rotate(18 34 31)">
      <rect x="24" y="25" width="25" height="7" rx="2" fill="none"/>
      <path d="M46 30 L58 45" fill="none"/>
    </g>
    <g transform="rotate(-18 66 31)">
      <rect x="52" y="25" width="25" height="7" rx="2" fill="none"/>
      <path d="M55 30 L43 45" fill="none"/>
    </g>
    <path d="M54 46 C51 51 49 54 49 58 C49 61 51 63 54 63 C57 63 59 61 59 58 C59 54 57 51 54 46 Z" fill="#111" stroke="none"/>
    <path d="M39 45 C36 50 34 53 34 56 C34 59 36 61 39 61 C42 61 44 59 44 56 C44 53 42 50 39 45 Z" fill="#111" stroke="none"/>
  `),
  GHS06: ghsSvg(`
    <circle cx="50" cy="40" r="17" fill="#111" stroke="none"/>
    <circle cx="44" cy="38" r="4" fill="#fff" stroke="none"/>
    <circle cx="56" cy="38" r="4" fill="#fff" stroke="none"/>
    <path d="M50 43 L46 51 H54 Z" fill="#fff" stroke="none"/>
    <path d="M39 58 L61 76 M61 58 L39 76" fill="none" stroke-width="6"/>
    <path d="M42 55 H58 V63 H42 Z" fill="#111" stroke="none"/>
  `),
  GHS07: ghsSvg(`
    <rect x="46" y="28" width="8" height="34" rx="4" fill="#111" stroke="none"/>
    <circle cx="50" cy="72" r="6" fill="#111" stroke="none"/>
  `),
  GHS08: ghsSvg(`
    <circle cx="50" cy="31" r="10" fill="#111" stroke="none"/>
    <path d="M32 75 C35 55 41 45 50 45 C59 45 65 55 68 75 Z" fill="#111" stroke="none"/>
    <path d="M50 52 L53 61 L62 59 L55 65 L60 74 L50 69 L40 74 L45 65 L38 59 L47 61 Z" fill="#fff" stroke="none"/>
  `),
  GHS09: ghsSvg(`
    <path d="M27 67 C36 56 48 55 57 64 C48 73 36 74 27 67 Z" fill="none" stroke-width="4"/>
    <path d="M57 64 L70 56 L68 72 Z M35 64 L31 61 M35 68 L31 71" fill="none" stroke-width="4"/>
    <path d="M66 30 C57 35 55 45 62 54 C72 50 76 38 66 30 Z" fill="#111" stroke="none"/>
    <path d="M56 54 L45 70 M49 63 H68" fill="none" stroke-width="4"/>
  `),
};
