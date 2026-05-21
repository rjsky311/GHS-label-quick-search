export const SUPPORT_ISSUES_URL =
  "https://github.com/rjsky311/GHS-label-quick-search/issues";

export const SUPPORT_REPORT_DATA_URL = `${SUPPORT_ISSUES_URL}/new?template=data-correction.yml&labels=data-correction`;

export const SUPPORT_WORKFLOW_REQUEST_URL = `${SUPPORT_ISSUES_URL}/new?template=workflow-request.yml&labels=workflow-request`;

const normalizeField = (value) => String(value || "").trim();

const appendIfPresent = (params, key, value) => {
  const normalized = normalizeField(value);
  if (normalized) params.set(key, normalized);
};

const DATA_CORRECTION_TITLES = {
  "missing-chinese-name": "Missing Chinese name",
  "no-ghs-data": "GHS data gap",
  "ghs-text-no-pictograms": "GHS pictogram gap",
  "source-conflict": "Source classification review",
  "upstream-error": "Upstream data issue",
};

const DATA_CORRECTION_DEFAULT_CONTEXT = {
  "missing-chinese-name": {
    currentOutput:
      "The app does not have a trusted Chinese name, or the available Chinese field repeats English.",
    expectedOutput:
      "Provide a reviewed Traditional Chinese name with source evidence before dictionary approval.",
    evidenceType: "SDS, supplier label, catalog, or regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  "no-ghs-data": {
    currentOutput:
      "The app found this chemical identity, but no GHS hazard content was available.",
    expectedOutput:
      "Provide reviewed SDS, supplier label, or regulatory evidence for the missing GHS classification.",
    evidenceType: "SDS, supplier label, or regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  "ghs-text-no-pictograms": {
    currentOutput:
      "The app has GHS text for this chemical, but no renderable GHS pictograms.",
    expectedOutput:
      "Provide evidence for the expected pictograms or confirm that text-only hazard data is correct.",
    evidenceType: "SDS, supplier label, or regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  "source-conflict": {
    currentOutput:
      "The app found multiple public GHS classifications or source variants for this chemical.",
    expectedOutput:
      "Identify the SDS/supplier/local-rule evidence that should guide the preferred classification.",
    evidenceType: "SDS, supplier label, or local regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
};

export function buildDataCorrectionUrl({
  casNumber = "",
  chemicalName = "",
  nameEn = "",
  nameZh = "",
  issueType = "data-correction",
  currentOutput = "",
  expectedOutput = "",
  evidenceUrl = "",
  evidenceType = "",
  localContext = "",
} = {}) {
  const cas = normalizeField(casNumber);
  const englishName = normalizeField(nameEn || chemicalName);
  const chineseName = normalizeField(nameZh);
  const issue = normalizeField(issueType) || "data-correction";
  const defaultContext = DATA_CORRECTION_DEFAULT_CONTEXT[issue] || {};
  const current = normalizeField(currentOutput || defaultContext.currentOutput);
  const expected = normalizeField(expectedOutput || defaultContext.expectedOutput);
  const evidence = normalizeField(evidenceUrl);
  const evidenceKind = normalizeField(evidenceType || defaultContext.evidenceType);
  const context = normalizeField(localContext || defaultContext.localContext);
  const titleParts = [
    DATA_CORRECTION_TITLES[issue] || "Data correction",
    cas || englishName || chineseName,
  ].filter(Boolean);

  const bodyLines = [
    "## Correction request",
    "",
    `- CAS: ${cas || "(not provided)"}`,
    `- English name: ${englishName || "(not provided)"}`,
    `- Chinese name: ${chineseName || "(please fill in)"}`,
    `- Issue type: ${issue}`,
    current ? `- Current output: ${current}` : "",
    expected ? `- Expected output: ${expected}` : "",
    evidence ? `- Evidence URL: ${evidence}` : "",
    evidenceKind ? `- Evidence type: ${evidenceKind}` : "",
    context ? `- Local context: ${context}` : "",
    "",
    "## Evidence / source",
    "",
    "Please include SDS, supplier label, or another authoritative source before this is accepted into the curated dictionary.",
  ].filter((line) => line !== "");

  const params = new URLSearchParams({
    template: "data-correction.yml",
    labels: "data-correction",
    title: titleParts.join(": "),
    body: bodyLines.join("\n"),
  });
  appendIfPresent(params, "cas_number", cas);
  appendIfPresent(
    params,
    "chemical_name",
    [englishName, chineseName].filter(Boolean).join(" / "),
  );
  appendIfPresent(params, "issue_type", issue);
  appendIfPresent(params, "current_output", current);
  appendIfPresent(params, "expected_output", expected);
  appendIfPresent(params, "evidence_url", evidence);
  appendIfPresent(params, "evidence_type", evidenceKind);
  appendIfPresent(params, "local_context", context);

  return `${SUPPORT_ISSUES_URL}/new?${params.toString()}`;
}

export function buildWorkflowRequestUrl({
  workflowArea = "",
  goal = "",
  currentProblem = "",
  desiredBehavior = "",
  examples = "",
  title = "",
} = {}) {
  const area = normalizeField(workflowArea);
  const normalizedTitle = normalizeField(title);
  const titleParts = [
    normalizedTitle || "Workflow request",
    area,
  ].filter(Boolean);
  const params = new URLSearchParams({
    template: "workflow-request.yml",
    labels: "workflow-request",
  });

  appendIfPresent(params, "title", titleParts.join(": "));
  appendIfPresent(params, "workflow_area", area);
  appendIfPresent(params, "goal", goal);
  appendIfPresent(params, "current_problem", currentProblem);
  appendIfPresent(params, "desired_behavior", desiredBehavior);
  appendIfPresent(params, "examples", examples);

  return `${SUPPORT_ISSUES_URL}/new?${params.toString()}`;
}
