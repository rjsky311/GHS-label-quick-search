import i18n from "@/i18n";
import {
  getLocalizedPictogramName,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveTrustedChineseName,
} from "@/utils/ghsText";
import { hasGhsData } from "@/utils/ghsAvailability";
import { getReferenceLinks } from "@/utils/sdsLinks";
import {
  DATA_QUALITY_ISSUE_TYPES,
  getDataQualityIssues,
} from "@/utils/dataQuality";

export const EXPORT_SCOPE_KEYS = Object.freeze({
  ALL: "all",
  VISIBLE: "visible",
  READY: "ready",
  NEEDS_REVIEW: "needs-review",
  UNRESOLVED: "unresolved",
});

function hasDirectPictogramVisual(result) {
  return (result?.ghs_pictograms || result?.pictograms || []).length > 0;
}

function getExportReviewReasonLabel(type, t) {
  const labels = {
    [DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR]: t("export.reviewReasonUpstream"),
    [DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH]: t("export.reviewReasonUnresolved"),
    [DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA]: t("export.reviewReasonNoGhs"),
    [DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]: t(
      "export.reviewReasonTextOnlyGhs"
    ),
    [DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]: t("export.reviewReasonSourceConflict"),
    [DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS]: t(
      "export.reviewReasonMultipleClassifications"
    ),
    [DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]: t(
      "export.reviewReasonMissingChineseName"
    ),
  };
  return labels[type] || t("export.reviewReasonNeedsReview");
}

function hasMultipleClassifications(result) {
  return Boolean(
    result?.has_multiple_classifications || result?.other_classifications?.length > 0
  );
}

function hasManualClassificationSelection(result) {
  return result?.selected_classification_index != null || result?.customNote;
}

function resolveMultipleGhsStatus(result, t) {
  if (!hasMultipleClassifications(result)) return t("export.multipleGhsNone");
  if (hasManualClassificationSelection(result)) return t("export.multipleGhsManual");
  return t("export.multipleGhsSystemSuggested");
}

export function isExportReadyRow(result) {
  return result?.found !== false && hasGhsData(result);
}

export function isExportNeedsReviewRow(result) {
  return getDataQualityIssues(result, result).length > 0;
}

export function getExportScopeOptions({ allResults = [], visibleResults = [] } = {}) {
  const visible = Array.isArray(visibleResults) ? visibleResults : [];
  const all = Array.isArray(allResults) && allResults.length > 0 ? allResults : visible;

  return [
    {
      key: EXPORT_SCOPE_KEYS.ALL,
      labelKey: "exportPreview.scopeAll",
      bodyKey: "exportPreview.scopeAllBody",
      results: all,
    },
    {
      key: EXPORT_SCOPE_KEYS.VISIBLE,
      labelKey: "exportPreview.scopeVisible",
      bodyKey: "exportPreview.scopeVisibleBody",
      results: visible,
    },
    {
      key: EXPORT_SCOPE_KEYS.READY,
      labelKey: "exportPreview.scopeReady",
      bodyKey: "exportPreview.scopeReadyBody",
      results: all.filter(isExportReadyRow),
    },
    {
      key: EXPORT_SCOPE_KEYS.NEEDS_REVIEW,
      labelKey: "exportPreview.scopeNeedsReview",
      bodyKey: "exportPreview.scopeNeedsReviewBody",
      results: all.filter(isExportNeedsReviewRow),
    },
    {
      key: EXPORT_SCOPE_KEYS.UNRESOLVED,
      labelKey: "exportPreview.scopeUnresolved",
      bodyKey: "exportPreview.scopeUnresolvedBody",
      results: all.filter((result) => result?.found === false),
    },
  ];
}

export function resolveExportDataState(result, t) {
  if (result?.upstream_error) return t("export.dataStateUpstreamError");
  if (result?.found === false) return t("export.dataStateNotFound");
  if (hasGhsData(result) && !hasDirectPictogramVisual(result)) {
    return t("export.dataStateTextOnly");
  }
  if (!hasGhsData(result)) return t("export.dataStateNoGhs");
  return t("export.dataStateRenderable");
}

function buildExportTrustCells(result, t) {
  const references = getReferenceLinks(result);
  const reviewIssues = getDataQualityIssues(result, result);
  const sourceConflict = Boolean(
    result?.source_conflict || result?.source_conflicts?.length > 0
  );
  const missingChineseName = Boolean(
    reviewIssues.find(
      (issue) => issue.type === DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME
    )
  );
  return [
    resolveExportDataState(result, t),
    result?.found !== false && hasGhsData(result) ? t("export.yes") : t("export.no"),
    reviewIssues.length ? t("export.yes") : t("export.no"),
    reviewIssues.length
      ? reviewIssues
          .map((issue) => getExportReviewReasonLabel(issue.type, t))
          .join("; ")
      : t("export.noReviewReasons"),
    result?.primary_source || t("export.notRecorded"),
    result?.primary_report_count || "-",
    result?.retrieved_at || t("export.notRecorded"),
    result?.cache_hit ? t("export.cacheHit") : t("export.cacheNotRecorded"),
    references.length
      ? t("export.referenceCount", { count: references.length })
      : t("export.noReferences"),
    sourceConflict ? t("export.yes") : t("export.no"),
    missingChineseName ? t("export.yes") : t("export.no"),
    resolveMultipleGhsStatus(result, t),
    result?.customNote
      ? t("export.customClassification", { note: result.customNote })
      : t("export.defaultClassification"),
  ];
}

export function normalizeResultsForExport(results = []) {
  return results.map((result) => ({
    ...result,
    name_zh: resolveTrustedChineseName(result) || "",
  }));
}

export function buildCsvRows(results, t) {
  const displayLocale = i18n.language;
  const rows = [
    [
      t("export.cas"),
      t("export.nameEn"),
      t("export.nameZh"),
      t("export.ghs"),
      t("export.signalWord"),
      t("export.hazardStatements"),
      t("export.precautionaryStatements"),
      t("export.dataState"),
      t("export.printable"),
      t("export.reviewRequired"),
      t("export.reviewReasons"),
      t("export.primarySource"),
      t("export.reportCount"),
      t("export.retrievedAt"),
      t("export.cacheState"),
      t("export.referenceLinks"),
      t("export.sourceConflict"),
      t("export.missingChineseName"),
      t("export.multipleGhsStatus"),
      t("export.classificationSelection"),
    ],
  ];
  for (const r of results) {
    const ghsText =
      r.ghs_pictograms && r.ghs_pictograms.length
        ? r.ghs_pictograms
            .map((p) => `${p.code} (${getLocalizedPictogramName(p, displayLocale)})`)
            .join(", ")
        : t("export.none");
    const signal = getLocalizedSignalWord(r, displayLocale) || "-";
    const hazardText =
      r.hazard_statements && r.hazard_statements.length
        ? r.hazard_statements
            .map((s) => `${s.code}: ${getLocalizedStatementText(s, displayLocale)}`)
            .join("; ")
        : t("export.noHazard");
    const precautionText =
      r.precautionary_statements && r.precautionary_statements.length
        ? r.precautionary_statements
            .map((p) => `${p.code}: ${getLocalizedStatementText(p, displayLocale)}`)
            .join("; ")
        : t("export.noPrecautionary");
    rows.push([
      r.cas_number || "",
      r.name_en || "",
      r.name_zh || "",
      ghsText,
      signal,
      hazardText,
      precautionText,
      ...buildExportTrustCells(r, t),
    ]);
  }
  return rows;
}

export function buildExportPreview(results, options = {}) {
  const t = options.t || i18n.t.bind(i18n);
  const maxRows = Math.max(0, options.maxRows ?? 5);
  const normalizedResults = normalizeResultsForExport(results);
  const [headers, ...dataRows] = buildCsvRows(normalizedResults, t);

  return {
    headers,
    rows: dataRows.slice(0, maxRows).map((cells, index) => ({
      id: `${results[index]?.cas_number || "row"}-${index}`,
      cells,
    })),
    totalRows: dataRows.length,
    previewRows: Math.min(maxRows, dataRows.length),
    hiddenRows: Math.max(0, dataRows.length - maxRows),
  };
}
