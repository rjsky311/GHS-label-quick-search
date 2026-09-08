export const DEFAULT_BACKEND_CONNECT_SRC = "https://ghs-api.yuchelab.com";
export const BACKEND_CONNECT_SRC_TOKEN = "__GHS_BACKEND_CONNECT_SRC__";

export const resolveBackendConnectSrc = (value) => {
  const candidate = String(value || "").trim();
  if (!candidate) return DEFAULT_BACKEND_CONNECT_SRC;

  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
      return DEFAULT_BACKEND_CONNECT_SRC;
    }
    return url.origin;
  } catch {
    return DEFAULT_BACKEND_CONNECT_SRC;
  }
};

export const injectBackendConnectSrc = (html, backendUrl) => {
  if (!html.includes(BACKEND_CONNECT_SRC_TOKEN)) {
    throw new Error("The frontend index is missing its backend CSP token.");
  }
  return html.replaceAll(
    BACKEND_CONNECT_SRC_TOKEN,
    resolveBackendConnectSrc(backendUrl),
  );
};
