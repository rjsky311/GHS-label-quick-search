export const DATA_QUALITY_ISSUE_TYPES = Object.freeze({
  UPSTREAM_ERROR: "upstream-error",
  NO_GHS_DATA: "no-ghs-data",
  GHS_TEXT_NO_PICTOGRAMS: "ghs-text-no-pictograms",
  SOURCE_CONFLICT: "source-conflict",
  MULTIPLE_CLASSIFICATIONS: "multiple-classifications",
  MISSING_CHINESE_NAME: "missing-chinese-name",
  UNRESOLVED_SEARCH: "unresolved-search",
});

export const DATA_QUALITY_DISPLAY_LABELS = Object.freeze({
  [DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR]: {
    key: "dataQuality.issue.upstreamError",
    defaultValue: "Upstream retry needed",
  },
  [DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA]: {
    key: "dataQuality.issue.noGhsData",
    defaultValue: "No GHS data",
  },
  [DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]: {
    key: "dataQuality.issue.ghsTextNoPictograms",
    defaultValue: "GHS pictogram gap",
  },
  [DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]: {
    key: "dataQuality.issue.sourceConflict",
    defaultValue: "Source conflict",
  },
  [DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS]: {
    key: "dataQuality.issue.multipleClassifications",
    defaultValue: "Multiple GHS classifications",
  },
  [DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]: {
    key: "dataQuality.issue.missingChineseName",
    defaultValue: "Missing trusted Chinese name",
  },
  [DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH]: {
    key: "dataQuality.issue.unresolvedSearch",
    defaultValue: "Unresolved lookup",
  },
  "reference-link": {
    key: "dataQuality.issue.referenceLink",
    defaultValue: "Reference link review",
  },
  "other-data-quality": {
    key: "dataQuality.issue.otherDataQuality",
    defaultValue: "Other data-quality issue",
  },
  other: {
    key: "dataQuality.issue.other",
    defaultValue: "Other data-quality issue",
  },
});

