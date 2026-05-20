export const SUPPORT_ISSUES_URL =
  "https://github.com/rjsky311/GHS-label-quick-search/issues";

export const SUPPORT_REPORT_DATA_URL = `${SUPPORT_ISSUES_URL}/new?template=data-correction.yml&labels=data-correction`;

export const SUPPORT_WORKFLOW_REQUEST_URL = `${SUPPORT_ISSUES_URL}/new?template=workflow-request.yml&labels=workflow-request`;

const normalizeField = (value) => String(value || "").trim();

export function buildDataCorrectionUrl({
  casNumber = "",
  nameEn = "",
  nameZh = "",
  issueType = "data-correction",
} = {}) {
  const cas = normalizeField(casNumber);
  const englishName = normalizeField(nameEn);
  const chineseName = normalizeField(nameZh);
  const issue = normalizeField(issueType) || "data-correction";
  const titleParts = [
    issue === "missing-chinese-name" ? "Missing Chinese name" : "Data correction",
    cas || englishName || chineseName,
  ].filter(Boolean);

  const bodyLines = [
    "## Correction request",
    "",
    `- CAS: ${cas || "(not provided)"}`,
    `- English name: ${englishName || "(not provided)"}`,
    `- Chinese name: ${chineseName || "(please fill in)"}`,
    `- Issue type: ${issue}`,
    "",
    "## Evidence / source",
    "",
    "Please include SDS, supplier label, or another authoritative source before this is accepted into the curated dictionary.",
  ];

  const params = new URLSearchParams({
    template: "data-correction.yml",
    labels: "data-correction",
    title: titleParts.join(": "),
    body: bodyLines.join("\n"),
  });

  return `${SUPPORT_ISSUES_URL}/new?${params.toString()}`;
}
