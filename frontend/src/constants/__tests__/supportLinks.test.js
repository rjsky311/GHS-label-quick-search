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
    expect(url.searchParams.get("issue_type")).toBe("Chemical identity or alias");
    expect(url.searchParams.get("body")).toContain("- CAS: 107-18-6");
    expect(url.searchParams.get("body")).toContain(
      "- English name: Allyl Alcohol",
    );
    expect(url.searchParams.get("body")).toContain(
      "- Chinese name: (please fill in)",
    );
    expect(url.searchParams.get("body")).toContain(
      "- Issue key: missing-chinese-name",
    );
  });

  it("adds default structured context for each data-quality correction type", () => {
    const cases = [
      {
        issueType: "missing-chinese-name",
        formIssueType: "Chemical identity or alias",
        current: "does not have a trusted Chinese name",
        expected: "Traditional Chinese name",
        evidence: "SDS, supplier label, catalog, or regulatory source",
      },
      {
        issueType: "no-ghs-data",
        formIssueType: "Other data issue",
        current: "no GHS hazard content",
        expected: "missing GHS classification",
        evidence: "SDS, supplier label, or regulatory source",
      },
      {
        issueType: "ghs-text-no-pictograms",
        formIssueType: "GHS pictogram",
        current: "no renderable GHS pictograms",
        expected: "expected pictograms",
        evidence: "SDS, supplier label, or regulatory source",
      },
      {
        issueType: "source-conflict",
        formIssueType: "Source/provenance display",
        current: "multiple public GHS classifications",
        expected: "preferred classification",
        evidence: "SDS, supplier label, or local regulatory source",
      },
      {
        issueType: "unresolved-search",
        formIssueType: "Chemical identity or alias",
        current: "could not resolve this lookup",
        expected: "reviewed CAS/name mapping",
        evidence: "SDS, supplier label, catalog, or regulatory source",
      },
    ];

    cases.forEach(({ issueType, formIssueType, current, expected, evidence }) => {
      const url = new URL(
        buildDataCorrectionUrl({
          casNumber: "7647-01-0",
          nameEn: "Hydrochloric Acid",
          issueType,
        }),
      );

      expect(url.searchParams.get("issue_type")).toBe(formIssueType);
      expect(url.searchParams.get("current_output")).toContain(current);
      expect(url.searchParams.get("expected_output")).toContain(expected);
      expect(url.searchParams.get("evidence_type")).toBe("Other");
      expect(url.searchParams.get("local_context")).toContain(
        "safety-data corrections",
      );
      expect(url.searchParams.get("body")).toContain(
        "- CAS: 7647-01-0",
      );
      expect(url.searchParams.get("body")).toContain(
        `- Issue key: ${issueType}`,
      );
      expect(url.searchParams.get("body")).toContain(current);
      expect(url.searchParams.get("body")).toContain(expected);
      expect(url.searchParams.get("body")).toContain(
        "- Evidence type: Other",
      );
      expect(url.searchParams.get("body")).toContain(
        `- Evidence prompt: ${evidence}`,
      );
    });
  });

  it("normalizes correction evidence type hints to issue-form dropdown values", () => {
    const exactUrl = new URL(
      buildDataCorrectionUrl({
        casNumber: "7647-01-0",
        nameEn: "Hydrochloric Acid",
        issueType: "source-conflict",
        evidenceType: "Supplier SDS",
      }),
    );
    const hintedUrl = new URL(
      buildDataCorrectionUrl({
        casNumber: "7647-01-0",
        nameEn: "Hydrochloric Acid",
        issueType: "source-conflict",
        evidenceType: "ECHA classification page",
      }),
    );

    expect(exactUrl.searchParams.get("evidence_type")).toBe("Supplier SDS");
    expect(exactUrl.searchParams.get("body")).not.toContain(
      "- Evidence prompt:",
    );
    expect(hintedUrl.searchParams.get("evidence_type")).toBe("ECHA page");
    expect(hintedUrl.searchParams.get("body")).toContain(
      "- Evidence prompt: ECHA classification page",
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
    expect(url.searchParams.get("workflow_area")).toBe("Label printing");
    expect(url.searchParams.get("goal")).toBe(
      "Print one fixed-stock batch without layout guessing.",
    );
    expect(url.searchParams.get("current_problem")).toContain(
      "Original workflow area: Batch labels",
    );
    expect(url.searchParams.get("current_problem")).toContain(
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
