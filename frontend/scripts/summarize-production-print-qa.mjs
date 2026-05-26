import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = process.env;
const requireProductBlocks = env.PRINT_QA_REQUIRE_PRODUCT_BLOCKS === "1";
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
    searchFailure: result.searchFailure || evidence.searchFailure || null,
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
const healthPath = path.resolve(
  process.cwd(),
  env.PRODUCTION_HEALTH_REPORT_PATH ||
    "build/production-health-report.json",
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
const batchPath = path.resolve(
  process.cwd(),
  env.BATCH_PRINT_QA_REPORT_PATH ||
    "build/production-batch-print-report.json",
);
const handoffReportPaths = findReports(/^production-print-.*report\.json$/)
  .filter((filePath) => path.resolve(filePath) !== bundlePath)
  .filter((filePath) => !/production-print-qa-summary\.json$/.test(filePath));

const reports = {
  health: summarizeGenericReport(
    "production-health",
    healthPath,
    readJsonIfExists(healthPath),
  ),
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
  batch: summarizeGenericReport(
    "fixed-stock-batch-print",
    batchPath,
    readJsonIfExists(batchPath),
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
  reports.health,
  reports.bundle,
  reports.searchUi,
  reports.printQa,
  reports.pdf,
  reports.prepared,
  reports.batch,
  ...reports.handoff,
].filter((report) => report.present);

const failedReports = presentReports.filter((report) => report.ok === false);
const actionableFailures = presentReports.flatMap((report) =>
  (report.failedCases || []).map((failure) => ({
    report: report.name,
    ...failure,
  })),
);

const isPassingReport = (report) => Boolean(report?.present && report.ok === true);

const handoffReportsPassing =
  reports.handoff.length > 0 && reports.handoff.every(isPassingReport);

const buildProductBlocks = () => [
  {
    id: "production-availability",
    name: "Production frontend/backend availability",
    reports: [reports.health.name],
    ok: isPassingReport(reports.health),
    evidence:
      "Production health QA checks the frontend HTML, deployed Vite asset, and backend /api/health with bounded retries and Zeabur request-id capture.",
  },
  {
    id: "print-renderer-stock-fit",
    name: "Print renderer and stock fit robustness",
    reports: [
      reports.bundle.name,
      reports.printQa.name,
      ...reports.handoff.map((report) => report.name),
    ],
    ok:
      isPassingReport(reports.bundle) &&
      isPassingReport(reports.printQa) &&
      handoffReportsPassing,
    evidence:
      "Production bundle freshness, print QA matrix, and deployed print handoff checks cover complete-primary and compact stock paths.",
  },
  {
    id: "result-table-pictograms",
    name: "Result table and GHS pictogram visual unity",
    reports: [reports.searchUi.name],
    ok: isPassingReport(reports.searchUi),
    evidence:
      "Production search UI QA checks result-row, expanded classification, and detail comparison pictogram geometry.",
  },
  {
    id: "trust-source-sds",
    name: "Trust, source, SDS, and safety boundaries",
    reports: [reports.searchUi.name],
    ok: isPassingReport(reports.searchUi),
    evidence:
      "Production search UI QA checks authoritative notes, source chips, safe SDS/reference links, and support-link separation.",
  },
  {
    id: "prepared-solution-reprint",
    name: "Prepared solution and reprint workflow maturity",
    reports: [reports.prepared.name],
    ok: isPassingReport(reports.prepared),
    evidence:
      "Production prepared QA covers prepared print, recent reprint, and saved preset reuse across primary, bottle, and tube outputs.",
  },
  {
    id: "fixed-stock-batch-printing",
    name: "Fixed-stock batch label printing",
    reports: [reports.batch.name],
    ok: isPassingReport(reports.batch),
    evidence:
      "Production batch print QA searches a mixed batch, opens the fixed-stock modal, verifies the batch fit report, switches representative preview, and checks ready-batch handoff.",
  },
  {
    id: "whole-product-ux-brand-utility",
    name: "Whole-product UX and brand-utility convergence",
    reports: [
      reports.searchUi.name,
      reports.health.name,
      reports.bundle.name,
      ...reports.handoff.map((report) => report.name),
      reports.prepared.name,
      reports.batch.name,
    ],
    ok:
      isPassingReport(reports.health) &&
      isPassingReport(reports.searchUi) &&
      isPassingReport(reports.bundle) &&
      handoffReportsPassing &&
      isPassingReport(reports.prepared) &&
      isPassingReport(reports.batch),
    evidence:
      "Core deployed walkthroughs keep search, detail, modal keyboard containment, trust/support, print, prepared, and batch workflows in one production gate.",
  },
];

const productBlocks = buildProductBlocks();
const incompleteProductBlocks = productBlocks.filter((block) => !block.ok);
const failedProductBlocks = requireProductBlocks ? incompleteProductBlocks : [];

const result = {
  ok:
    failedReports.length === 0 &&
    (!requireProductBlocks || failedProductBlocks.length === 0),
  generatedAt: new Date().toISOString(),
  reportPath: outputPath,
  requireProductBlocks,
  reports,
  productBlocks,
  summary: {
    presentReports: presentReports.length,
    failedReports: failedReports.length,
    failedReportNames: failedReports.map((report) => report.name),
    failedProductBlocks: failedProductBlocks.map((block) => block.id),
    incompleteProductBlocks: incompleteProductBlocks.map((block) => block.id),
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

if (!result.ok && requireProductBlocks) {
  process.exitCode = 1;
}
