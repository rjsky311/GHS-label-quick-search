import {
  DATA_QUALITY_DISPLAY_LABELS,
  DATA_QUALITY_ISSUE_TYPES,
} from "@/constants/dataQualityIssueLabels";

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
  [DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]:
    DATA_QUALITY_DISPLAY_LABELS[DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]
      .defaultValue,
  [DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA]:
    DATA_QUALITY_DISPLAY_LABELS[DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA].defaultValue,
  [DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]:
    DATA_QUALITY_DISPLAY_LABELS[DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]
      .defaultValue,
  [DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]:
    DATA_QUALITY_DISPLAY_LABELS[DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]
      .defaultValue,
  [DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH]:
    DATA_QUALITY_DISPLAY_LABELS[DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH]
      .defaultValue,
  [DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR]:
    DATA_QUALITY_DISPLAY_LABELS[DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR]
      .defaultValue,
};

const DATA_CORRECTION_DEFAULT_CONTEXT = {
  [DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]: {
    currentOutput:
      "The app does not have a trusted Chinese name, or the available Chinese field repeats English.",
    expectedOutput:
      "Provide a reviewed Traditional Chinese name with source evidence before dictionary approval.",
    evidenceType: "SDS, supplier label, catalog, or regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  [DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA]: {
    currentOutput:
      "The app found this chemical identity, but no GHS hazard content was available.",
    expectedOutput:
      "Provide reviewed SDS, supplier label, or regulatory evidence for the missing GHS classification.",
    evidenceType: "SDS, supplier label, or regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  [DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]: {
    currentOutput:
      "The app has GHS text for this chemical, but no renderable GHS pictograms.",
    expectedOutput:
      "Provide evidence for the expected pictograms or confirm that text-only hazard data is correct.",
    evidenceType: "SDS, supplier label, or regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  [DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]: {
    currentOutput:
      "The app found multiple public GHS classifications or source variants for this chemical.",
    expectedOutput:
      "Identify the SDS/supplier/local-rule evidence that should guide the preferred classification.",
    evidenceType: "SDS, supplier label, or local regulatory source",
    localContext:
      "Please keep safety-data corrections separate from workflow or product requests.",
  },
  [DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH]: {
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
  [DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME]: "Chemical identity or alias",
  [DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA]: "Other data issue",
  [DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS]: "GHS pictogram",
  [DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT]: "Source/provenance display",
  [DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH]: "Chemical identity or alias",
  [DATA_QUALITY_ISSUE_TYPES.UPSTREAM_ERROR]: "Other data issue",
};

const DATA_CORRECTION_REQUEST_TYPES = new Set([
  DATA_QUALITY_ISSUE_TYPES.MISSING_CHINESE_NAME,
  DATA_QUALITY_ISSUE_TYPES.UNRESOLVED_SEARCH,
  DATA_QUALITY_ISSUE_TYPES.NO_GHS_DATA,
  DATA_QUALITY_ISSUE_TYPES.GHS_TEXT_NO_PICTOGRAMS,
  DATA_QUALITY_ISSUE_TYPES.SOURCE_CONFLICT,
  "reference-link",
  "other-data-quality",
]);

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

const normalizeDataCorrectionRequestType = (issue) =>
  DATA_CORRECTION_REQUEST_TYPES.has(issue) ? issue : "other-data-quality";

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
  return buildDataCorrectionContext({
    casNumber,
    chemicalName,
    nameEn,
    nameZh,
    issueType,
    currentOutput,
    expectedOutput,
    evidenceUrl,
    evidenceType,
    localContext,
  }).fallbackUrl;
}

export function buildDataCorrectionContext({
  casNumber = "",
  chemicalName = "",
  nameEn = "",
  nameZh = "",
  issueType = "other-data-quality",
  currentOutput = "",
  expectedOutput = "",
  evidenceUrl = "",
  evidenceType = "",
  localContext = "",
  queryText = "",
} = {}) {
  const cas = normalizeField(casNumber);
  const englishName = normalizeField(nameEn || chemicalName);
  const chineseName = normalizeField(nameZh);
  const issue = normalizeField(issueType) || "other-data-quality";
  const requestIssueType = normalizeDataCorrectionRequestType(issue);
  const defaultContext = DATA_CORRECTION_DEFAULT_CONTEXT[issue] || {};
  const current = normalizeField(currentOutput || defaultContext.currentOutput);
  const expected = normalizeField(expectedOutput || defaultContext.expectedOutput);
  const evidence = normalizeField(evidenceUrl);
  const evidencePrompt = normalizeField(evidenceType || defaultContext.evidenceType);
  const evidenceKind = normalizeDataCorrectionFormEvidenceType(evidencePrompt) || "Other";
  const context = normalizeField(localContext || defaultContext.localContext);
  const query = normalizeField(queryText || cas || englishName || chineseName);
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

  const fallbackUrl = `${SUPPORT_ISSUES_URL}/new?${params.toString()}`;
  const chemicalIdentity = [englishName, chineseName].filter(Boolean).join(" / ");
  const candidate = {
    issue_key: issue,
    name_en: englishName || undefined,
    name_zh: chineseName || undefined,
    github_issue_type: formIssueType,
  };
  Object.keys(candidate).forEach((key) => {
    if (!candidate[key]) delete candidate[key];
  });

  return {
    issueType: issue,
    requestIssueType,
    title: titleParts.join(": "),
    casNumber: cas,
    chemicalName: chemicalIdentity,
    nameEn: englishName,
    nameZh: chineseName,
    currentOutput: current,
    expectedOutput: expected,
    evidenceUrl: evidence,
    evidenceType: evidencePrompt || evidenceKind,
    localContext: context,
    fallbackUrl,
    payload: {
      issue_type: requestIssueType,
      cas_number: cas || undefined,
      chemical_name: chemicalIdentity || undefined,
      query_text: query || undefined,
      current_output: current || undefined,
      expected_output: expected || undefined,
      evidence_url: evidence || undefined,
      evidence_type: evidencePrompt || evidenceKind || undefined,
      local_context: context || undefined,
      candidate,
      source: "public-in-app",
    },
  };
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
