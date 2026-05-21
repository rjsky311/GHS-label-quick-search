import { buildDataCorrectionUrl } from "@/constants/supportLinks";
import { hasGhsData } from "@/utils/ghsAvailability";
import { resolveEnglishName, resolveTrustedChineseName } from "@/utils/ghsText";

export const DATA_QUALITY_ISSUE_TYPES = Object.freeze({
  UPSTREAM_ERROR: "upstream-error",
  NO_GHS_DATA: "no-ghs-data",
  GHS_TEXT_NO_PICTOGRAMS: "ghs-text-no-pictograms",
  SOURCE_CONFLICT: "source-conflict",
  MISSING_CHINESE_NAME: "missing-chinese-name",
  UNRESOLVED_SEARCH: "unresolved-search",
});

const getPictograms = (classification = {}) =>
  classification?.pictograms || classification?.ghs_pictograms || [];

const getCorrectionUrl = (result, issueType) =>
  buildDataCorrectionUrl({
    casNumber: result?.cas_number,
    nameEn: resolveEnglishName(result),
    nameZh: resolveTrustedChineseName(result),
    issueType,
  });

export function getDataQualityIssues(result = {}, effectiveClassification = null) {
  if (!result?.found) {
    if (result?.upstream_error) {
      return [
        {
          type: DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
          severity: "blocking",
        },
      ];
    }

    return [
      {
        type: DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH,
        severity: "curation",
        correctionUrl: getCorrectionUrl(
          result,
          DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH,
        ),
      },
    ];
  }

  const effective = effectiveClassification || {
    pictograms: result.ghs_pictograms || [],
    hazard_statements: result.hazard_statements || [],
    precautionary_statements: result.precautionary_statements || [],
    signal_word: result.signal_word,
  };
  const issues = [];

  if (result.upstream_error) {
    issues.push({
      type: DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
      severity: "blocking",
    });
  }

  if (!hasGhsData(effective)) {
    issues.push({
      type: DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA,
      severity: "review",
      correctionUrl: getCorrectionUrl(result, DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA),
    });
  } else if (getPictograms(effective).length === 0) {
    issues.push({
      type: DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS,
      severity: "review",
      correctionUrl: getCorrectionUrl(
        result,
        DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS,
      ),
    });
  }

  if (result.has_multiple_classifications || result.other_classifications?.length > 0) {
    issues.push({
      type: DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
      severity: "review",
      correctionUrl: getCorrectionUrl(result, DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT),
    });
  }

  if (resolveEnglishName(result) && !resolveTrustedChineseName(result)) {
    issues.push({
      type: DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
      severity: "curation",
      correctionUrl: getCorrectionUrl(
        result,
        DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
      ),
    });
  }

  return issues;
}

export function findDataQualityIssue(result, effectiveClassification, type) {
  return getDataQualityIssues(result, effectiveClassification).find(
    (issue) => issue.type === type,
  );
}
