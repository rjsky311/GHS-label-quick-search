import { BATCH_SEARCH_LIMIT } from "@/constants/ghs";

const TOKEN_SPLIT_PATTERN = /[,\n\t;\uFF0C\u3001\uFF1B]+/;
const CAS_FORMAT_PATTERN = /^\d{2,7}-\d{2}-\d$/;

const toHalfWidth = (value = "") =>
  String(value).replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );

export const splitBatchSearchInput = (input = "") =>
  String(input)
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);

export const normalizeCasToken = (token = "") =>
  toHalfWidth(token)
    .trim()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/^cas\s*(?:no\.?|number|#|[:\uFF1A])?\s*/i, "")
    .replace(/\s+/g, "")
    .trim();

export const hasValidCasChecksum = (cas = "") => {
  if (!CAS_FORMAT_PATTERN.test(cas)) return false;

  const digits = cas.replace(/-/g, "");
  const checkDigit = Number(digits.slice(-1));
  const bodyDigits = digits
    .slice(0, -1)
    .split("")
    .reverse()
    .map((digit) => Number(digit));
  const checksum = bodyDigits.reduce(
    (sum, digit, index) => sum + digit * (index + 1),
    0,
  );

  return checksum % 10 === checkDigit;
};

export const parseBatchSearchInput = (
  input = "",
  { limit = BATCH_SEARCH_LIMIT } = {},
) => {
  const rawTokens = splitBatchSearchInput(input);
  const seen = new Set();
  const items = [];
  const duplicateItems = [];
  const invalidItems = [];

  rawTokens.forEach((raw, index) => {
    const normalized = normalizeCasToken(raw);
    if (!CAS_FORMAT_PATTERN.test(normalized)) {
      invalidItems.push({ raw, normalized, index, reason: "format" });
      return;
    }
    if (!hasValidCasChecksum(normalized)) {
      invalidItems.push({ raw, normalized, index, reason: "checksum" });
      return;
    }
    if (seen.has(normalized)) {
      duplicateItems.push({ raw, normalized, index, reason: "duplicate" });
      return;
    }

    seen.add(normalized);
    items.push({ raw, normalized, index });
  });

  const queries = items.map((item) => item.normalized);
  const acceptedCount = queries.length;
  const overLimit = acceptedCount > limit;

  return {
    inputCount: rawTokens.length,
    acceptedCount,
    duplicateCount: duplicateItems.length,
    invalidCount: invalidItems.length,
    overLimit,
    excess: overLimit ? acceptedCount - limit : 0,
    items,
    duplicateItems,
    invalidItems,
    queries,
  };
};
