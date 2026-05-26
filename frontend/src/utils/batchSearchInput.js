import { BATCH_SEARCH_LIMIT } from "@/constants/ghs";

const TOKEN_SPLIT_PATTERN = /[,\n\t;\uFF0C\u3001\uFF1B]+/;
const CELL_TOKEN_SPLIT_PATTERN = /[,\n;\uFF0C\u3001\uFF1B]+/;
const ROW_SPLIT_PATTERN = /\r?\n/;
const TAB_PATTERN = /\t/;
const CAS_FORMAT_PATTERN = /^\d{2,7}-\d{2}-\d$/;
const CAS_DIGITS_PATTERN = /^\d{5,10}$/;
const CAS_PREFIX_PATTERN = /^cas\s*(?:no\.?|number|#|[:\uFF1A])?\s*/i;
const CAS_LIKE_WITH_DASH_PATTERN =
  /\d{2,7}\s*[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]\s*\d{2}\s*[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]\s*\d/;
const CAS_NEXT_TOKEN_PATTERN =
  /(\d)\s+(?=(?:cas\s*(?:no\.?|number|#|[:\uFF1A])?\s*)?\d{2,7}\s*[-\u2010-\u2015\u2212\uFE58\uFE63\uFF0D])/gi;
export const BATCH_TELEMETRY_PREVIEW_LIMIT = 20;

const toHalfWidth = (value = "") =>
  String(value).replace(/[\uFF01-\uFF5E]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );

const splitDelimitedTokens = (input = "", { includeTabs = true } = {}) =>
  String(input)
    .replace(CAS_NEXT_TOKEN_PATTERN, "$1\n")
    .split(includeTabs ? TOKEN_SPLIT_PATTERN : CELL_TOKEN_SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);

const normalizeHeaderCell = (value = "") =>
  toHalfWidth(value)
    .trim()
    .toLowerCase()
    .replace(/[\s.:\uFF1A#_-]+/g, "");

const KNOWN_CAS_HEADER_CELLS = new Set([
  "cas",
  "casno",
  "casnumber",
  "cas編號",
  "cas编号",
  "cas號",
  "cas号",
  "cas登錄號",
  "cas登录号",
]);

const isCasHeaderCell = (value = "") => {
  const normalized = normalizeHeaderCell(value);
  if (KNOWN_CAS_HEADER_CELLS.has(normalized)) return true;
  return [
    "cas",
    "casno",
    "casnumber",
    "cas編號",
    "cas號碼",
    "cas登錄號",
    "cas登錄號碼",
  ].includes(normalized);
};

const splitTabularRows = (input = "") =>
  String(input)
    .split(ROW_SPLIT_PATTERN)
    .map((row) => row.split(TAB_PATTERN).map((cell) => cell.trim()));

const splitCasColumnFromTabularInput = (input = "") => {
  if (!TAB_PATTERN.test(input)) return null;

  const rows = splitTabularRows(input).filter((row) =>
    row.some((cell) => cell.trim()),
  );
  if (!rows.some((row) => row.length > 1)) return null;

  const headerIndex = rows.findIndex((row) => row.some(isCasHeaderCell));
  if (headerIndex < 0) return null;

  const casIndex = rows[headerIndex].findIndex(isCasHeaderCell);
  return rows
    .slice(headerIndex + 1)
    .flatMap((row) =>
      splitDelimitedTokens(row[casIndex] || "", { includeTabs: false }),
    );
};

const isExplicitCasToken = (token = "") => {
  const value = toHalfWidth(token).trim();
  return CAS_PREFIX_PATTERN.test(value) || CAS_LIKE_WITH_DASH_PATTERN.test(value);
};

const splitCasTokensFromHeaderlessTabularInput = (input = "") => {
  if (!TAB_PATTERN.test(input)) return null;

  const rows = splitTabularRows(input);
  return rows.flatMap((row) => {
    const cells = row.map((cell) => cell.trim()).filter(Boolean);
    if (cells.length <= 1) {
      return splitDelimitedTokens(cells[0] || "", { includeTabs: false });
    }

    return cells.flatMap((cell) =>
      splitDelimitedTokens(cell, { includeTabs: false }).filter(isExplicitCasToken),
    );
  });
};

export const splitBatchSearchInput = (input = "") => {
  const normalizedInput = toHalfWidth(input);
  const casColumnTokens = splitCasColumnFromTabularInput(normalizedInput);
  if (casColumnTokens) return casColumnTokens;

  const headerlessTableTokens =
    splitCasTokensFromHeaderlessTabularInput(normalizedInput);
  if (headerlessTableTokens) return headerlessTableTokens;

  return splitDelimitedTokens(normalizedInput);
};

const normalizeCasTokenBase = (token = "") =>
  toHalfWidth(token)
    .trim()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(CAS_PREFIX_PATTERN, "")
    .replace(/\s+/g, "")
    .replace(/[.,;:，。；：]+$/g, "")
    .replace(/\.0+$/g, "")
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
