import {
  DATA_QUALITY_ISSUE_TYPES,
  findDataQualityIssue,
  getDataQualityIssues,
} from "@/utils/dataQuality";

const baseChemical = {
  found: true,
  cas_number: "107-18-6",
  name_en: "Allyl Alcohol",
  name_zh: "",
  ghs_pictograms: [{ code: "GHS02" }],
  hazard_statements: [{ code: "H225", text_en: "Highly flammable liquid and vapor." }],
  signal_word: "Danger",
};

describe("data quality issue helpers", () => {
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
      "missing-chinese-name",
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
  });

  it("keeps source conflicts and upstream failures as separate issues", () => {
    const issues = getDataQualityIssues({
      ...baseChemical,
      name_zh: "烯丙醇",
      upstream_error: true,
      has_multiple_classifications: true,
      other_classifications: [{ pictograms: [], hazard_statements: [] }],
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
  });
});
