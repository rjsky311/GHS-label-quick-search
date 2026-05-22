import fs from "node:fs";
import path from "node:path";

import {
  buildDataCorrectionUrl,
  buildWorkflowRequestUrl,
} from "../supportLinks";

const readIssueTemplate = (name) =>
  fs.readFileSync(
    path.resolve(process.cwd(), "..", ".github", "ISSUE_TEMPLATE", name),
    "utf8",
  );

const extractDropdownOptions = (templateText, fieldId) => {
  const idIndex = templateText.indexOf(`id: ${fieldId}`);
  if (idIndex < 0) {
    throw new Error(`Could not find issue-template field: ${fieldId}`);
  }
  const fieldBlock = templateText.slice(idIndex);
  const optionsIndex = fieldBlock.indexOf("options:");
  if (optionsIndex < 0) {
    throw new Error(`Could not find dropdown options for: ${fieldId}`);
  }
  const optionsBlock = fieldBlock.slice(optionsIndex);
  const nextFieldIndex = optionsBlock.search(/\n\s{2}- type:|\n\s+validations:/);
  const boundedOptionsBlock =
    nextFieldIndex >= 0 ? optionsBlock.slice(0, nextFieldIndex) : optionsBlock;
  return new Set(
    [...boundedOptionsBlock.matchAll(/^\s+-\s+(.+?)\s*$/gm)].map((match) =>
      match[1].replace(/^["']|["']$/g, "").trim(),
    ),
  );
};

const extractFieldIds = (templateText) =>
  new Set(
    [...templateText.matchAll(/^\s+id:\s+([A-Za-z0-9_-]+)\s*$/gm)].map(
      (match) => match[1].trim(),
    ),
  );

const genericIssueQueryFields = new Set([
  "template",
  "labels",
  "title",
  "body",
]);

const expectOnlyTemplateFields = (url, templateFieldIds) => {
  [...url.searchParams.keys()].forEach((key) => {
    expect(
      genericIssueQueryFields.has(key) || templateFieldIds.has(key),
    ).toBe(true);
  });
};

const dataCorrectionCases = [
  "missing-chinese-name",
  "no-ghs-data",
  "ghs-text-no-pictograms",
  "source-conflict",
  "unresolved-search",
  "upstream-error",
  "unknown-data-correction",
];

const workflowAreaCases = [
  "Search results",
  "Batch labels",
  "SDS reference review",
  "Detail comparison",
  "CSV export",
  "Prepared solution recipe",
  "Admin dictionary curation",
  "Mobile layout",
  "A completely new workflow area",
];

describe("support link issue-template schema compatibility", () => {
  const dataCorrectionTemplate = readIssueTemplate("data-correction.yml");
  const workflowTemplate = readIssueTemplate("workflow-request.yml");
  const dataCorrectionIssueTypes = extractDropdownOptions(
    dataCorrectionTemplate,
    "issue_type",
  );
  const dataCorrectionEvidenceTypes = extractDropdownOptions(
    dataCorrectionTemplate,
    "evidence_type",
  );
  const workflowAreas = extractDropdownOptions(
    workflowTemplate,
    "workflow_area",
  );
  const dataCorrectionFieldIds = extractFieldIds(dataCorrectionTemplate);
  const workflowFieldIds = extractFieldIds(workflowTemplate);

  it("keeps data-correction dropdown prefill values inside the GitHub template schema", () => {
    dataCorrectionCases.forEach((issueType) => {
      const url = new URL(
        buildDataCorrectionUrl({
          casNumber: "7647-01-0",
          nameEn: "Hydrochloric Acid",
          issueType,
        }),
      );

      expect(dataCorrectionIssueTypes.has(url.searchParams.get("issue_type"))).toBe(
        true,
      );
      expect(
        dataCorrectionEvidenceTypes.has(url.searchParams.get("evidence_type")),
      ).toBe(true);
    });
  });

  it("keeps data-correction prefill field ids inside the GitHub template schema", () => {
    dataCorrectionCases.forEach((issueType) => {
      const url = new URL(
        buildDataCorrectionUrl({
          casNumber: "7647-01-0",
          nameEn: "Hydrochloric Acid",
          issueType,
          evidenceUrl: "https://example.com/sds.pdf",
        }),
      );

      expectOnlyTemplateFields(url, dataCorrectionFieldIds);
    });
  });

  it("keeps workflow-request dropdown prefill values inside the GitHub template schema", () => {
    workflowAreaCases.forEach((workflowArea) => {
      const url = new URL(
        buildWorkflowRequestUrl({
          workflowArea,
          goal: "Reduce repeated triage steps.",
          currentProblem: "The user has to explain scope manually.",
          desiredBehavior: "Route the request with structured context.",
        }),
      );

      expect(workflowAreas.has(url.searchParams.get("workflow_area"))).toBe(
        true,
      );
    });
  });

  it("keeps workflow-request prefill field ids inside the GitHub template schema", () => {
    workflowAreaCases.forEach((workflowArea) => {
      const url = new URL(
        buildWorkflowRequestUrl({
          workflowArea,
          goal: "Reduce repeated triage steps.",
          currentProblem: "The user has to explain scope manually.",
          desiredBehavior: "Route the request with structured context.",
          examples: "One batch print workflow.",
        }),
      );

      expectOnlyTemplateFields(url, workflowFieldIds);
    });
  });
});
