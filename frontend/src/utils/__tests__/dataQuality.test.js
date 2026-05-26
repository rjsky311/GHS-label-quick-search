import {
  DATA_QUALITY_REVIEW_ISSUE_ORDER,
  DATA_QUALITY_ISSUE_TYPES,
  findDataQualityIssue,
  getDataQualityIssueDisplayLabel,
  getDataQualityIssues,
  sortDataQualityIssuesForReview,
} from "@/utils/dataQuality";
import en from "@/i18n/locales/en.json";
import zhTW from "@/i18n/locales/zh-TW.json";

const baseChemical = {
  found: true,
  cas_number: "107-18-6",
  name_en: "Allyl Alcohol",
  name_zh: "",
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [{ code: "H225", text_en: "Highly flammable liquid and vapor." }],
  signal_word: "Danger",
};

const expectStructuredCorrectionUrl = (
  issue,
  { formIssueType, issueKey, currentOutput, expectedOutput },
) => {
  const url = new URL(issue.correctionUrl);
  expect(url.searchParams.get("issue_type")).toBe(formIssueType);
  expect(url.searchParams.get("cas_number")).toBe(baseChemical.cas_number);
  expect(url.searchParams.get("current_output")).toContain(currentOutput);
  expect(url.searchParams.get("expected_output")).toContain(expectedOutput);
  expect(url.searchParams.get("body")).toContain(`- Issue key: ${issueKey}`);
  expect(url.searchParams.get("local_context")).toContain(
    "safety-data corrections",
  );
};

describe("data quality issue helpers", () => {
  it("maps shared issue keys to operator-friendly display labels", () => {
    const t = jest.fn((key, { defaultValue } = {}) => `${defaultValue} (${key})`);

    expect(
      getDataQualityIssueDisplayLabel(
        DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
        t,
      ),
    ).toBe("Missing trusted Chinese name (dataQuality.issue.missingChineseName)");
    expect(getDataQualityIssueDisplayLabel("reference-link", t)).toBe(
      "Reference link review (dataQuality.issue.referenceLink)",
    );
    expect(getDataQualityIssueDisplayLabel("unknown-kind", t)).toBe(
      "Other data-quality issue (dataQuality.issue.otherDataQuality)",
    );
  });

  it("keeps pilot triage data-quality labels aligned with shared labels", () => {
    const sharedPilotLabelKeys = [
      ["pilot.triageMissingChineseNames", "dataQuality.issue.missingChineseName"],
      ["pilot.triageSourceConflicts", "dataQuality.issue.sourceConflict"],
      ["pilot.triageUpstreamRetries", "dataQuality.issue.upstreamError"],
      ["pilot.triageNoGhsReports", "dataQuality.issue.noGhsData"],
    ];

    for (const [pilotKey, dataQualityKey] of sharedPilotLabelKeys) {
      expect(en[pilotKey]).toBe(en[dataQualityKey]);
      expect(zhTW[pilotKey]).toBe(zhTW[dataQualityKey]);
    }
  });

  it("keeps batch review issue ordering shared across results and exports", () => {
    expect(DATA_QUALITY_REVIEW_ISSUE_ORDER).toEqual([
      DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
      DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH,
      DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA,
      DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS,
      DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
      DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS,
      DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
    ]);

    const unorderedIssues = [
      { type: DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME },
      { type: "future-review-issue" },
      { type: DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT },
      { type: DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR },
    ];

    expect(
      sortDataQualityIssuesForReview(unorderedIssues).map((issue) => issue.type),
    ).toEqual([
      DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
      DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
      DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
      "future-review-issue",
    ]);
    expect(unorderedIssues.map((issue) => issue.type)).toEqual([
      DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
      "future-review-issue",
      DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
      DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
    ]);
  });

  it("turns unresolved lookups into a dictionary-curation correction path", () => {
    const issues = getDataQualityIssues({
      found: false,
      cas_number: "999-99-9",
      error: "CAS number not found in PubChem",
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      type: DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH,
      severity: "curation",
    });

    const correctionUrl = new URL(issues[0].correctionUrl);
    expect(correctionUrl.searchParams.get("cas_number")).toBe("999-99-9");
    expect(correctionUrl.searchParams.get("issue_type")).toBe(
      "Chemical identity or alias",
    );
    expect(correctionUrl.searchParams.get("body")).toContain(
      "- Issue key: unresolved-search",
    );
    expect(correctionUrl.searchParams.get("current_output")).toContain(
      "could not resolve this lookup",
    );
    expect(correctionUrl.searchParams.get("expected_output")).toContain(
      "reviewed CAS/name mapping",
    );
    expect(correctionUrl.searchParams.get("local_context")).toContain(
      "admin dictionary curation",
    );
  });

  it("keeps unresolved upstream failures out of correction intake", () => {
    const issues = getDataQualityIssues({
      found: false,
      cas_number: "999-99-9",
      upstream_error: true,
      error: "PubChem temporarily unavailable",
    });

    expect(issues).toEqual([
      {
        type: DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
        severity: "blocking",
      },
    ]);
  });

  it("flags missing trusted Chinese names without faking the English name", () => {
    const issues = getDataQualityIssues({
      ...baseChemical,
      name_zh: "Allyl Alcohol",
    });

    const missingChineseName = findDataQualityIssue(
      { ...baseChemical, name_zh: "Allyl Alcohol" },
      null,
      DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
    );

    expect(issues.map((issue) => issue.type)).toContain(
      DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
    );
    expect(missingChineseName.correctionUrl).toContain("missing-chinese-name");
    expect(missingChineseName.correctionUrl).toContain("107-18-6");
    const correctionUrl = new URL(missingChineseName.correctionUrl);
    expect(correctionUrl.searchParams.get("cas_number")).toBe("107-18-6");
    expect(correctionUrl.searchParams.get("issue_type")).toBe(
      "Chemical identity or alias",
    );
    expect(correctionUrl.searchParams.get("body")).toContain(
      "- Issue key: missing-chinese-name",
    );
    expect(correctionUrl.searchParams.get("current_output")).toContain(
      "does not have a trusted Chinese name",
    );
    expect(correctionUrl.searchParams.get("expected_output")).toContain(
      "Traditional Chinese name",
    );
  });

  it("distinguishes no GHS data from text-only GHS data", () => {
    const noGhs = getDataQualityIssues({
      ...baseChemical,
      ghs_pictograms: [],
      hazard_statements: [],
      signal_word: null,
      name_zh: "烯丙醇",
    });
    const textOnly = getDataQualityIssues({
      ...baseChemical,
      ghs_pictograms: [],
      hazard_statements: [{ code: "H302", text_en: "Harmful if swallowed." }],
      signal_word: "Warning",
      name_zh: "烯丙醇",
    });

    expect(noGhs.map((issue) => issue.type)).toContain(
      DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA,
    );
    expect(textOnly.map((issue) => issue.type)).toContain(
      DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS,
    );
    expect(textOnly.map((issue) => issue.type)).not.toContain(
      DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA,
    );
    expectStructuredCorrectionUrl(
      noGhs.find(
        (issue) => issue.type === DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA,
      ),
      {
        formIssueType: "Other data issue",
        issueKey: "no-ghs-data",
        currentOutput: "no GHS hazard content",
        expectedOutput: "missing GHS classification",
      },
    );
    expectStructuredCorrectionUrl(
      textOnly.find(
        (issue) =>
          issue.type === DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS,
      ),
      {
        formIssueType: "GHS pictogram",
        issueKey: "ghs-text-no-pictograms",
        currentOutput: "no renderable GHS pictograms",
        expectedOutput: "expected pictograms",
      },
    );
  });

  it("keeps source conflicts and upstream failures as separate issues", () => {
    const issues = getDataQualityIssues({
      ...baseChemical,
      name_zh: "烯丙醇",
      upstream_error: true,
      source_conflict: true,
    });

    expect(issues.map((issue) => issue.type)).toEqual(
      expect.arrayContaining([
        DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR,
        DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
      ]),
    );
    expect(
      issues.find((issue) => issue.type === DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR)
        .correctionUrl,
    ).toBeUndefined();
    expectStructuredCorrectionUrl(
      issues.find(
        (issue) => issue.type === DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
      ),
      {
        formIssueType: "Source/provenance display",
        issueKey: "source-conflict",
        currentOutput: "multiple public GHS classifications",
        expectedOutput: "preferred classification",
      },
    );
  });

  it("flags unconfirmed multiple GHS classifications separately from source conflicts", () => {
    const issues = getDataQualityIssues({
      ...baseChemical,
      name_zh: "烯丙醇",
      has_multiple_classifications: true,
      other_classifications: [{ pictograms: [], hazard_statements: [] }],
    });

    expect(issues.map((issue) => issue.type)).toContain(
      DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS,
    );
    expect(issues.map((issue) => issue.type)).not.toContain(
      DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
    );
    expect(
      issues.find(
        (issue) =>
          issue.type === DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS,
      ).correctionUrl,
    ).toBeUndefined();
  });

  it("treats a null selected classification as unconfirmed", () => {
    const issues = getDataQualityIssues({
      ...baseChemical,
      has_multiple_classifications: true,
      selected_classification_index: null,
      other_classifications: [{ pictograms: [], hazard_statements: [] }],
    });

    expect(issues.map((issue) => issue.type)).toContain(
      DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS,
    );
  });

  it("does not keep multiple classifications in review after a manual primary selection", () => {
    const result = {
      ...baseChemical,
      name_zh: "烯丙醇",
      has_multiple_classifications: true,
      other_classifications: [{ pictograms: [], hazard_statements: [] }],
    };

    const issues = getDataQualityIssues(result, { isCustom: true });

    expect(issues.map((issue) => issue.type)).not.toContain(
      DATA_QUALITY_ISSUE_TYPES.MULTIPLE_CLASSIFICATIONS,
    );
  });
});
