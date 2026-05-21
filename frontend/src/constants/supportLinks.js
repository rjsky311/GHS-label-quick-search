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
  "unresolved-search": "Unresolved lookup",
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
  "unresolved-search": {
    currentOutput:
      "The app could not resolve this lookup to a reviewed chemical identity.",
    expectedOutput:
      "Provide a reviewed CAS/name mapping with source evidence before dictionary approval.",
    evidenceType: "SDS, supplier label, catalog, or regulatory source",
    localContext:
      "Do not treat unresolved lookup as no hazards; route it to admin dictionary curation and keep safety-data corrections separate from workflow requests.",
  },
};

const DATA_CORRECTION_FORM_ISSUE_TYPES = {
  "missing-chinese-name": "Chemical identity or alias",
  "no-ghs-data": "Other data issue",
  "ghs-text-no-pictograms": "GHS pictogram",
  "source-conflict": "Source/provenance display",
  "unresolved-search": "Chemical identity or alias",
  "upstream-error": "Other data issue",
};

const DATA_CORRECTION_FORM_EVIDENCE_TYPES = new Set([
  "Supplier SDS",
  "Supplier label",
  "Official regulatory source",
  "PubChem page",
  "ECHA page",
  "Internal lab evidence",
  "Other",
]);

const DATA_CORRECTION_EVIDENCE_TYPE_HINTS = [
  {
    pattern: /\bsupplier\s+sds\b|\bsds\b/i,
    value: "Supplier SDS",
  },
  {
    pattern: /\bsupplier\s+label\b|\blabel\b/i,
    value: "Supplier label",
  },
  {
    pattern: /\bofficial\b|\bregulatory\b|\blocal\s+regulation\b|\blocal\s+rule\b/i,
    value: "Official regulatory source",
  },
  {
    pattern: /\bpubchem\b/i,
    value: "PubChem page",
  },
  {
    pattern: /\becha\b/i,
    value: "ECHA page",
  },
  {
    pattern: /\binternal\b|\blab\b|\blaboratory\b/i,
    value: "Internal lab evidence",
  },
];

const WORKFLOW_FORM_AREAS = new Set([
  "Search and results",
  "Chemical detail and comparison",
  "SDS/reference verification",
  "Label preview",
  "Label printing",
  "Prepared-solution workflow",
  "Export",
  "Admin/pilot workflow",
  "Mobile or narrow-screen usage",
  "Other",
]);

const WORKFLOW_AREA_HINTS = [
  {
    pattern: /search|result|first-time/i,
    value: "Search and results",
  },
  {
    pattern: /label|print|qr|stock/i,
    value: "Label printing",
  },
  {
    pattern: /sds|reference|regulatory/i,
    value: "SDS/reference verification",
  },
  {
    pattern: /detail|comparison/i,
    value: "Chemical detail and comparison",
  },
  {
    pattern: /export|spreadsheet|csv|excel/i,
    value: "Export",
  },
  {
    pattern: /prepared|solution|dilution/i,
    value: "Prepared-solution workflow",
  },
  {
    pattern: /admin|pilot|curation|dictionary/i,
    value: "Admin/pilot workflow",
  },
  {
    pattern: /mobile|narrow/i,
    value: "Mobile or narrow-screen usage",
  },
];

const normalizeDataCorrectionFormIssueType = (issue) =>
  DATA_CORRECTION_FORM_ISSUE_TYPES[issue] || "Other data issue";

const isBroadEvidencePrompt = (value) =>
  /,|\/|\b(or|and)\b/i.test(value);

const normalizeDataCorrectionFormEvidenceType = (evidenceType) => {
  const value = normalizeField(evidenceType);
  if (!value) return "";
  if (DATA_CORRECTION_FORM_EVIDENCE_TYPES.has(value)) return value;
  if (isBroadEvidencePrompt(value)) return "Other";
  const matched = DATA_CORRECTION_EVIDENCE_TYPE_HINTS.find(({ pattern }) =>
    pattern.test(value),
  );
  return matched?.value || "Other";
};

const normalizeWorkflowFormArea = (area) => {
  if (!area) return "";
  if (WORKFLOW_FORM_AREAS.has(area)) return area;
  const matched = WORKFLOW_AREA_HINTS.find(({ pattern }) => pattern.test(area));
  return matched?.value || "Other";
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
  const evidencePrompt = normalizeField(evidenceType || defaultContext.evidenceType);
  const evidenceKind = normalizeDataCorrectionFormEvidenceType(evidencePrompt);
  const context = normalizeField(localContext || defaultContext.localContext);
  const formIssueType = normalizeDataCorrectionFormIssueType(issue);
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
    `- Issue type: ${formIssueType}`,
    `- Issue key: ${issue}`,
    current ? `- Current output: ${current}` : "",
    expected ? `- Expected output: ${expected}` : "",
    evidence ? `- Evidence URL: ${evidence}` : "",
    evidenceKind ? `- Evidence type: ${evidenceKind}` : "",
    evidencePrompt && evidencePrompt !== evidenceKind
      ? `- Evidence prompt: ${evidencePrompt}`
      : "",
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
  appendIfPresent(params, "issue_type", formIssueType);
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
  const formArea = normalizeWorkflowFormArea(area);
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
  appendIfPresent(params, "workflow_area", formArea);
  appendIfPresent(params, "goal", goal);
  appendIfPresent(
    params,
    "current_problem",
    [area && formArea !== area ? `Original workflow area: ${area}` : "", currentProblem]
      .filter(Boolean)
      .join("\n\n"),
  );
  appendIfPresent(params, "desired_behavior", desiredBehavior);
  appendIfPresent(params, "examples", examples);

  return `${SUPPORT_ISSUES_URL}/new?${params.toString()}`;
}
