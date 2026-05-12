import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = process.env;
const buildDir = path.resolve(process.cwd(), "build");
const outputPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_SUMMARY_REPORT_PATH ||
    "build/production-print-qa-summary.json",
);

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      parseError: error?.message || String(error),
      reportPath: filePath,
    };
  }
};

const listJsonReports = () => {
  if (!fs.existsSync(buildDir)) return [];
  return fs
    .readdirSync(buildDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(buildDir, name))
    .filter((filePath) => path.resolve(filePath) !== outputPath);
};

const findReports = (pattern) =>
  listJsonReports()
    .filter((filePath) => pattern.test(path.basename(filePath)))
    .sort();

const normalizeFailureList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "")).filter(Boolean)
    : [];

const splitIssueTypes = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const failureFromResult = (result = {}) => {
  const status = result.status || {};
  const evidence = result.evidence || {};
  const preview = result.preview || evidence.previewInspection || {};
  return {
    id: result.id || "",
    searchTerm: result.searchTerm || "",
    labelKind:
      status["data-label-kind"] ||
      preview.labelKind ||
      evidence.previewInspection?.labelKind ||
      "",
    stockPreset: status["data-stock-preset"] || result.stockPreset || "",
    template: status["data-template"] || "",
    issueTypes: splitIssueTypes(status["data-issue-types"]),
    failures: normalizeFailureList(result.failures),
    printButtonEnabled: result.printButtonEnabled ?? status.printButtonEnabled,
    statusText: result.statusText || status.text || "",
    previewText:
      result.previewText ||
      preview.frameTextSample ||
      preview.bodyTextSample ||
      "",
  };
};

const summarizeGenericReport = (name, reportPath, report) => {
  if (!report) {
    return {
      name,
      present: false,
      ok: null,
      reportPath,
    };
  }
  const failedCases =
    report.failedCaseSummary ||
    report.failedCases ||
    (Array.isArray(report.results)
      ? report.results.filter((item) => item && item.passed === false)
      : []);
  const derivedOk =
    typeof report.ok === "boolean"
      ? report.ok
      : !report.parseError &&
        normalizeFailureList(report.failures).length === 0 &&
        failedCases.length === 0 &&
        Number(report.summary?.failed || 0) === 0;
  return {
    name,
    present: true,
    ok: derivedOk,
    reportPath,
    productionUrl: report.productionUrl || "",
    assetUrl: report.assetUrl || "",
    summary: report.summary || null,
    selectedCases: report.selectedCases || null,
    missingMarkers: report.missingMarkers || [],
    failures: normalizeFailureList(report.failures),
    failedCases: failedCases.map(failureFromResult),
  };
};

const summarizePdfReport = (reportPath, report) => {
  const summary = summarizeGenericReport("print-pdf", reportPath, report);
  if (!report) return summary;
  summary.failedCases = (report.failedCases || []).map((failure) => ({
    id: failure.id || "",
    failures: normalizeFailureList(failure.failures),
    visualIssues: failure.visualIssues || [],
    clippedElements: failure.clippedElements || [],
    imageFailures: failure.imageFailures || [],
    pdf: failure.pdf || null,
  }));
  return summary;
};

const bundlePath = path.resolve(
  process.cwd(),
  env.PRINT_QA_BUNDLE_REPORT_PATH ||
    "build/production-print-bundle-report.json",
);
const searchUiPath = path.resolve(
  process.cwd(),
  env.PRODUCTION_SEARCH_UI_REPORT_PATH ||
    "build/production-search-ui-report.json",
);
const printQaPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_REPORT_PATH || "build/print-qa-report.json",
);
const pdfPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_PDF_REPORT_PATH || "build/print-pdf-report.json",
);
const preparedPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_PREPARED_REPORT_PATH ||
    "build/production-prepared-print-report.json",
);
const handoffReportPaths = findReports(/^production-print-.*report\.json$/)
  .filter((filePath) => path.resolve(filePath) !== bundlePath)
  .filter((filePath) => !/production-print-qa-summary\.json$/.test(filePath));

const reports = {
  bundle: summarizeGenericReport(
    "bundle-freshness",
    bundlePath,
    readJsonIfExists(bundlePath),
  ),
  searchUi: summarizeGenericReport(
    "search-ui",
    searchUiPath,
    readJsonIfExists(searchUiPath),
  ),
  printQa: summarizeGenericReport(
    "print-qa-matrix",
    printQaPath,
    readJsonIfExists(printQaPath),
  ),
  pdf: summarizePdfReport(pdfPath, readJsonIfExists(pdfPath)),
  prepared: summarizeGenericReport(
    "prepared-production",
    preparedPath,
    readJsonIfExists(preparedPath),
  ),
  handoff: handoffReportPaths.map((reportPath) =>
    summarizeGenericReport(
      path.basename(reportPath, ".json"),
      reportPath,
      readJsonIfExists(reportPath),
    ),
  ),
};

const presentReports = [
  reports.bundle,
  reports.searchUi,
  reports.printQa,
  reports.pdf,
  reports.prepared,
  ...reports.handoff,
].filter((report) => report.present);

const failedReports = presentReports.filter((report) => report.ok === false);
const actionableFailures = presentReports.flatMap((report) =>
  (report.failedCases || []).map((failure) => ({
    report: report.name,
    ...failure,
  })),
);

const result = {
  ok: failedReports.length === 0,
  generatedAt: new Date().toISOString(),
  reportPath: outputPath,
  reports,
  summary: {
    presentReports: presentReports.length,
    failedReports: failedReports.length,
    failedReportNames: failedReports.map((report) => report.name),
    actionableFailures,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}${os.EOL}`);

console.log(
  JSON.stringify(
    {
      ok: result.ok,
      reportPath: outputPath,
      summary: result.summary,
    },
    null,
    2,
  ),
);
