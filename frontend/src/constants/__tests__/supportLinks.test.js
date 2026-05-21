import {
  SUPPORT_REPORT_DATA_URL,
  SUPPORT_WORKFLOW_REQUEST_URL,
  buildDataCorrectionUrl,
  buildWorkflowRequestUrl,
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
    expect(url.searchParams.get("cas_number")).toBe("107-18-6");
    expect(url.searchParams.get("chemical_name")).toBe("Allyl Alcohol");
    expect(url.searchParams.get("issue_type")).toBe("missing-chinese-name");
    expect(url.searchParams.get("body")).toContain("- CAS: 107-18-6");
    expect(url.searchParams.get("body")).toContain(
      "- English name: Allyl Alcohol",
    );
    expect(url.searchParams.get("body")).toContain(
      "- Chinese name: (please fill in)",
    );
  });

  it("builds a structured workflow request URL without changing the generic link", () => {
    const url = new URL(
      buildWorkflowRequestUrl({
        workflowArea: "Batch labels",
        goal: "Print one fixed-stock batch without layout guessing.",
        currentProblem: "The current flow is hard to explain.",
        desiredBehavior: "Guide the user to one output and one stock.",
        examples: "50 CAS numbers pasted from inventory.",
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://github.com/rjsky311/GHS-label-quick-search/issues/new",
    );
    expect(url.searchParams.get("template")).toBe("workflow-request.yml");
    expect(url.searchParams.get("labels")).toBe("workflow-request");
    expect(url.searchParams.get("title")).toBe("Workflow request: Batch labels");
    expect(url.searchParams.get("workflow_area")).toBe("Batch labels");
    expect(url.searchParams.get("goal")).toBe(
      "Print one fixed-stock batch without layout guessing.",
    );
    expect(url.searchParams.get("current_problem")).toBe(
      "The current flow is hard to explain.",
    );
    expect(url.searchParams.get("desired_behavior")).toBe(
      "Guide the user to one output and one stock.",
    );
    expect(url.searchParams.get("examples")).toBe(
      "50 CAS numbers pasted from inventory.",
    );
  });
});
