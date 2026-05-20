import {
  SUPPORT_REPORT_DATA_URL,
  SUPPORT_WORKFLOW_REQUEST_URL,
  buildDataCorrectionUrl,
} from "../supportLinks";

describe("supportLinks", () => {
  it("keeps the generic support links stable", () => {
    expect(SUPPORT_REPORT_DATA_URL).toBe(
      "https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=data-correction.yml&labels=data-correction",
    );
    expect(SUPPORT_WORKFLOW_REQUEST_URL).toBe(
      "https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=workflow-request.yml&labels=workflow-request",
    );
  });

  it("builds a contextual missing-Chinese-name correction URL", () => {
    const url = new URL(
      buildDataCorrectionUrl({
        casNumber: "107-18-6",
        nameEn: "Allyl Alcohol",
        issueType: "missing-chinese-name",
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://github.com/rjsky311/GHS-label-quick-search/issues/new",
    );
    expect(url.searchParams.get("template")).toBe("data-correction.yml");
    expect(url.searchParams.get("labels")).toBe("data-correction");
    expect(url.searchParams.get("title")).toBe(
      "Missing Chinese name: 107-18-6",
    );
    expect(url.searchParams.get("body")).toContain("- CAS: 107-18-6");
    expect(url.searchParams.get("body")).toContain(
      "- English name: Allyl Alcohol",
    );
    expect(url.searchParams.get("body")).toContain(
      "- Chinese name: (please fill in)",
    );
  });
});
