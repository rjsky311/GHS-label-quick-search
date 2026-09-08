export const CANONICAL_PUBLIC_APP_URL = "https://ghs.yuchelab.com";

export const resolvePublicAppUrl = (value) => {
  try {
    const candidate = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(candidate.protocol)) {
      return CANONICAL_PUBLIC_APP_URL;
    }
    if (candidate.username || candidate.password) {
      return CANONICAL_PUBLIC_APP_URL;
    }
    return candidate.origin;
  } catch {
    return CANONICAL_PUBLIC_APP_URL;
  }
};

const rawPublicAppUrl =
  typeof globalThis.__APP_PUBLIC_APP_URL__ === "string"
    ? globalThis.__APP_PUBLIC_APP_URL__
    : "";

export const PUBLIC_APP_URL =
  resolvePublicAppUrl(rawPublicAppUrl || CANONICAL_PUBLIC_APP_URL);
