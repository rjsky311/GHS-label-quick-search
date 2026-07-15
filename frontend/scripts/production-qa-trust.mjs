export const FULL_GIT_SHA_LENGTH = 40;

const normalizeGitSha = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isTrustedGitSha = (value) =>
  value.length === FULL_GIT_SHA_LENGTH && /^[0-9a-f]+$/.test(value);

export const gitShasMatch = (actual, expected) => {
  const actualSha = normalizeGitSha(actual);
  const expectedSha = normalizeGitSha(expected);
  if (!isTrustedGitSha(actualSha) || !isTrustedGitSha(expectedSha)) {
    return false;
  }

  return actualSha === expectedSha;
};

const parseHttpOrigin = (value) => {
  const input = String(value || "").trim();
  if (!input || input.includes("?") || input.includes("#")) return "";

  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.username || url.password) return "";

    const authorityAndPath = input.slice(input.indexOf("://") + 3);
    const pathStart = authorityAndPath.indexOf("/");
    const authority =
      pathStart === -1
        ? authorityAndPath
        : authorityAndPath.slice(0, pathStart);
    const rawPath = pathStart === -1 ? "" : authorityAndPath.slice(pathStart);
    if (
      authority.includes("@") ||
      (rawPath && rawPath !== "/") ||
      url.pathname !== "/"
    ) {
      return "";
    }

    return url.origin;
  } catch {
    return "";
  }
};

export const httpOriginsMatch = (actual, expected) => {
  const actualOrigin = parseHttpOrigin(actual);
  const expectedOrigin = parseHttpOrigin(expected);
  return Boolean(actualOrigin && expectedOrigin && actualOrigin === expectedOrigin);
};

export const backendHealthIsReady = (body) =>
  Boolean(
    body?.status === "healthy" &&
      body?.readiness === "ready" &&
      body?.capabilities?.pdf?.available === true,
  );

export const serviceIdentityMatches = (actual, { id, name } = {}) => {
  const actualId = String(actual?.id || "").trim();
  const actualName = String(actual?.name || "").trim();
  const expectedId = String(id || "").trim();
  const expectedName = String(name || "").trim();

  return Boolean(
    actualId &&
      actualName &&
      expectedId &&
      expectedName &&
      actualId === expectedId &&
      actualName === expectedName,
  );
};
