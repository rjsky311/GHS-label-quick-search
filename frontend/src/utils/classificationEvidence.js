const SOURCE_CATEGORY = Object.freeze({
  ECHA: "echa",
  PUBCHEM: "pubchem",
  MANUAL: "manual",
  OTHER: "other",
  UNKNOWN: "unknown",
});

export function parseReportCount(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const match = String(value).replace(/,/g, "").match(/\d+/);
  if (!match) return null;

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifySource(source) {
  const normalized = String(source || "").trim().toLowerCase();
  if (!normalized) return SOURCE_CATEGORY.UNKNOWN;
  if (normalized.includes("echa")) return SOURCE_CATEGORY.ECHA;
  if (normalized.includes("pubchem")) return SOURCE_CATEGORY.PUBCHEM;
  if (normalized.includes("manual")) return SOURCE_CATEGORY.MANUAL;
  return SOURCE_CATEGORY.OTHER;
}

export function buildClassificationEvidenceSummary(classification = {}) {
  const pictogramCount = (classification.pictograms || []).filter(
    (pictogram) => pictogram?.code,
  ).length;
  const hazardCount = (classification.hazard_statements || []).filter(
    (statement) => statement?.code,
  ).length;
  const precautionCount = (
    classification.precautionary_statements || []
  ).filter((statement) => statement?.code).length;
  const reportCount = parseReportCount(classification.report_count);
  const sourceCategory = classifySource(classification.source);

  return {
    source: classification.source || "",
    sourceCategory,
    isEchaSource: sourceCategory === SOURCE_CATEGORY.ECHA,
    reportCount,
    pictogramCount,
    hazardCount,
    precautionCount,
    coverageCount: pictogramCount + hazardCount + precautionCount,
  };
}

export { SOURCE_CATEGORY };
