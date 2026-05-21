import { buildDataCorrectionUrl } from "@/constants/supportLinks";
import { hasGhsData } from "@/utils/ghsAvailability";
import { resolveEnglishName, resolveTrustedChineseName } from "@/utils/ghsText";

export const DATA_QUALITY_ISSUE_TYPES = Object.freeze({
  UPSTREAM_ERROR: "upstream-error",
  NO_GHS_DATA: "no-ghs-data",
  GHS_TEXT_NO_PICTOGRAMS: "ghs-text-no-pictograms",
  SOURCE_CONFLICT: "source-conflict",
  MISSING_CHINESE_NAME: "missing-chinese-name",
});

const getPictograms = (classification = {}) =>
  classification?.pictograms || classification?.ghs_pictograms || [];

const CORRECTION_CONTEXT_BY_TYPE = Object.freeze({
  [DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA]: {
    currentOutput: "The app found this chemical identity, but no GHS hazard content was available.",
    expectedOutput:
      "Provide reviewed SDS, supplier label, or regulatory evidence for the missing GHS classification.",
    evidenceType: "SDS, supplier label, or regulatory source",
  },
  [DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]: {
    currentOutput:
      "The app has GHS text for this chemical, but no renderable GHS pictograms.",
    expectedOutput:
      "Provide evidence for the expected pictograms or confirm that text-only hazard data is correct.",
    evidenceType: "SDS, supplier label, or regulatory source",
  },
  [DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]: {
    currentOutput:
      "The app found multiple public GHS classifications or source variants for this chemical.",
    expectedOutput:
      "Identify the SDS/supplier/local-rule evidence that should guide the preferred classification.",
    evidenceType: "SDS, supplier label, or local regulatory source",
  },
  [DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]: {
    currentOutput:
      "The app does not have a trusted Chinese name, or the available Chinese field repeats English.",
    expectedOutput:
      "Provide a reviewed Traditional Chinese name with source evidence before dictionary approval.",
    evidenceType: "SDS, supplier label, catalog, or regulatory source",
  },
});

const getCorrectionUrl = (result, issueType) => {
  const context = CORRECTION_CONTEXT_BY_TYPE[issueType] || {};

  return buildDataCorrectionUrl({
    casNumber: result?.cas_number,
    nameEn: resolveEnglishName(result),
    nameZh: resolveTrustedChineseName(result),
    issueType,
    ...context,
    localContext: [
      context.localContext,
      "Please keep safety-data corrections separate from workflow or product requests.",
    ]
      .filter(Boolean)
      .join(" "),
  });
};

export function getDataQualityIssues(result = {}, effectiveClassification = null) {
  if (!result?.found) return [];

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
