import { BATCH_SEARCH_LIMIT } from "@/constants/ghs";

const TOKEN_SPLIT_PATTERN = /[,\n\t;\uFF0C\u3001\uFF1B]+/;
const CAS_FORMAT_PATTERN = /^\d{2,7}-\d{2}-\d$/;
const CAS_DIGITS_PATTERN = /^\d{5,10}$/;
const CAS_NEXT_TOKEN_PATTERN =
  /(\d)\s+(?=(?:cas\s*(?:no\.?|number|#|[:\uFF1A])?\s*)?\d{2,7}\s*[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D])/gi;
export const BATCH_TELEMETRY_PREVIEW_LIMIT = 20;

const toHalfWidth = (value = "") =>
  String(value).replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );

export const splitBatchSearchInput = (input = "") =>
  toHalfWidth(input)
    .replace(CAS_NEXT_TOKEN_PATTERN, "$1\n")
    .split(TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);

const normalizeCasTokenBase = (token = "") =>
  toHalfWidth(token)
    .trim()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/^cas\s*(?:no\.?|number|#|[:\uFF1A])?\s*/i, "")
    .replace(/\s+/g, "")
    .trim();

export const rehyphenateCasDigits = (value = "") => {
  const digits = String(value || "").trim();
  if (!CAS_DIGITS_PATTERN.test(digits)) return "";

  const firstGroup = digits.slice(0, -3);
  if (firstGroup.length < 2 || firstGroup.length > 7) return "";

  return `${firstGroup}-${digits.slice(-3, -1)}-${digits.slice(-1)}`;
};

export const normalizeCasTokenDetailed = (token = "") => {
  const rawNormalized = normalizeCasTokenBase(token);
  const rehyphenated = /^\d+$/.test(rawNormalized)
    ? rehyphenateCasDigits(rawNormalized)
    : "";

  return {
    normalized: rehyphenated || rawNormalized,
    rawNormalized,
    wasRehyphenated: Boolean(rehyphenated && rehyphenated !== rawNormalized),
  };
};

export const normalizeCasToken = (token = "") =>
  normalizeCasTokenDetailed(token).normalized;

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
  const rehyphenatedItems = [];

  rawTokens.forEach((raw, index) => {
    const { normalized, rawNormalized, wasRehyphenated } =
      normalizeCasTokenDetailed(raw);
    if (!CAS_FORMAT_PATTERN.test(normalized)) {
      invalidItems.push({ raw, normalized, rawNormalized, index, reason: "format" });
      return;
    }
    if (!hasValidCasChecksum(normalized)) {
      invalidItems.push({
        raw,
        normalized,
        rawNormalized,
        index,
        reason: "checksum",
      });
      return;
    }
    if (seen.has(normalized)) {
      duplicateItems.push({
        raw,
        normalized,
        rawNormalized,
        index,
        reason: "duplicate",
      });
      return;
    }

    seen.add(normalized);
    const item = {
      raw,
      normalized,
      rawNormalized,
      index,
      wasRehyphenated,
    };
    items.push(item);
    if (wasRehyphenated) {
      rehyphenatedItems.push({ ...item, reason: "numeric-cas" });
    }
  });

  const queries = items.map((item) => item.normalized);
  const acceptedCount = queries.length;
  const overLimit = acceptedCount > limit;

  return {
    inputCount: rawTokens.length,
    acceptedCount,
    duplicateCount: duplicateItems.length,
    invalidCount: invalidItems.length,
    rehyphenatedCount: rehyphenatedItems.length,
    overLimit,
    excess: overLimit ? acceptedCount - limit : 0,
    items,
    duplicateItems,
    invalidItems,
    rehyphenatedItems,
    queries,
  };
};

export const buildBatchSearchTelemetryMeta = (
  summary = {},
  { previewLimit = BATCH_TELEMETRY_PREVIEW_LIMIT } = {},
) => {
  const queries = Array.isArray(summary.queries) ? summary.queries : [];
  const safePreviewLimit =
    Number.isFinite(previewLimit) && previewLimit > 0
      ? Math.floor(previewLimit)
      : BATCH_TELEMETRY_PREVIEW_LIMIT;

  return {
    inputCount: Number(summary.inputCount) || 0,
    acceptedCount: Number(summary.acceptedCount) || 0,
    duplicateCount: Number(summary.duplicateCount) || 0,
    invalidCount: Number(summary.invalidCount) || 0,
    rehyphenatedCount: Number(summary.rehyphenatedCount) || 0,
    overLimit: Boolean(summary.overLimit),
    excess: Number(summary.excess) || 0,
    sentCasPreview: queries.slice(0, safePreviewLimit),
    sentCasOverflow: Math.max(0, queries.length - safePreviewLimit),
  };
};
