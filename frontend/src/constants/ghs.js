export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Mirrors the backend's Pydantic `CASQuery.cas_numbers` max_length.
// Keep these in sync — oversized batch requests are already rejected
// by the backend with HTTP 422 via Pydantic validation; this constant
// lets the frontend provide a friendlier preemptive experience.
export const BATCH_SEARCH_LIMIT = 100;

// GHS Pictogram Images
export const GHS_IMAGES = {
  GHS01: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS01.svg",
  GHS02: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg",
  GHS03: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS03.svg",
  GHS04: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS04.svg",
  GHS05: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS05.svg",
  GHS06: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS06.svg",
  GHS07: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg",
  GHS08: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS08.svg",
  GHS09: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS09.svg",
};
