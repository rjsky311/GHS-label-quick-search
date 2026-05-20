import {
  SOURCE_CATEGORY,
  buildClassificationEvidenceSummary,
  classifySource,
  parseReportCount,
} from "../classificationEvidence";

describe("classificationEvidence", () => {
  it("parses report counts from numbers and PubChem strings", () => {
    expect(parseReportCount(42)).toBe(42);
    expect(parseReportCount("1,236 notifications")).toBe(1236);
    expect(parseReportCount("not recorded")).toBeNull();
    expect(parseReportCount(null)).toBeNull();
  });

  it("classifies common source families", () => {
    expect(classifySource("ECHA C&L Notifications Summary")).toBe(
      SOURCE_CATEGORY.ECHA,
    );
    expect(classifySource("PubChem Laboratory Chemical Safety Summary")).toBe(
      SOURCE_CATEGORY.PUBCHEM,
    );
    expect(classifySource("manual dictionary entry")).toBe(
      SOURCE_CATEGORY.MANUAL,
    );
    expect(classifySource("Vendor SDS")).toBe(SOURCE_CATEGORY.OTHER);
    expect(classifySource("")).toBe(SOURCE_CATEGORY.UNKNOWN);
  });

  it("builds compact evidence metrics from a classification", () => {
    expect(
      buildClassificationEvidenceSummary({
        source: "ECHA C&L Notifications Summary",
        report_count: "236",
        pictograms: [{ code: "GHS05" }, { code: "GHS07" }],
        hazard_statements: [{ code: "H314" }, { code: "H335" }],
        precautionary_statements: [{ code: "P280" }],
      }),
    ).toEqual({
      source: "ECHA C&L Notifications Summary",
      sourceCategory: SOURCE_CATEGORY.ECHA,
      isEchaSource: true,
      reportCount: 236,
      pictogramCount: 2,
      hazardCount: 2,
      precautionCount: 1,
      coverageCount: 5,
    });
  });
});
