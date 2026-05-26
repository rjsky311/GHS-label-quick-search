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
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
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

const compactText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const uniqueStrings = (values = []) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const failureText = (failure = {}) =>
  compactText(
    [
      failure.report,
      failure.id,
      failure.searchTerm,
      ...(failure.issueTypes || []),
      ...(failure.failures || []),
      failure.searchFailure,
      failure.statusText,
      failure.previewText,
    ]
      .filter(Boolean)
      .join(" "),
  ).toLowerCase();

const classifyFailure = (failure = {}) => {
  const text = failureText(failure);
  const failures = new Set(failure.failures || []);
  const issueTypes = new Set(failure.issueTypes || []);

  if (
    failures.has("source-upstream-unavailable") ||
    /upstream|pubchem|timeout|timed out|429|502|503|temporarily unavailable|temporary unavailable|source outage/.test(
      text,
    )
  ) {
    return {
      bucket: "external-source",
      label: "External source / upstream",
      nextAction:
        "Re-run after the upstream service stabilizes; do not treat this as a print-layout regression unless it repeats with stable source data.",
    };
  }

  if (
    failures.has("required-image-failed") ||
    issueTypes.has("required-image-failed") ||
    /required-image-failed|image.*failed|naturalwidth|imageReady|qr.*failed|pictogram.*failed/.test(
      text,
    )
  ) {
    return {
      bucket: "external-asset",
      label: "External image / QR asset",
      nextAction:
        "Check pictogram or QR asset loading first; product layout work is secondary unless the asset loads and still clips.",
    };
  }

  if (
    /deployment|zeabur|build-info|expected git sha|expected.*sha|stale|freshness|vite asset|asset url|commit/i.test(
      text,
    )
  ) {
    return {
      bucket: "deployment-freshness",
      label: "Deployment freshness",
      nextAction:
        "Verify Zeabur reached a running deployment for the expected commit before debugging product behavior.",
    };
  }

  if (
    failures.has("runner-error") ||
    /runner-error|parse-error|browser executable|app shell|navigation|locator|strict mode violation|target closed/.test(
      text,
    )
  ) {
    return {
      bucket: "qa-runner",
      label: "QA runner / harness",
      nextAction:
        "Inspect the runner trace and retry once; fix the harness only if the production page is otherwise healthy.",
    };
  }

  if (
    /overflow|clipped|clip|label-overflow|standard-grid-overflow|layout|pictogram|cas|qr|printButtonEnabled/.test(
      text,
    )
  ) {
    return {
      bucket: "product-layout",
      label: "Product print/layout regression",
      nextAction:
        "Treat as product work: inspect the screenshot/PDF/HTML artifact and fix the print renderer or fit rule.",
    };
  }

  return {
    bucket: "product-or-unknown",
    label: "Product or unknown",
    nextAction:
      "Inspect the linked report artifact; classify manually before adding another product fix.",
  };
};

const buildFailureTriage = (failures = []) => {
  const buckets = new Map();
  for (const failure of failures) {
    const classification = classifyFailure(failure);
    const current =
      buckets.get(classification.bucket) ||
      {
        bucket: classification.bucket,
        label: classification.label,
        count: 0,
        reports: new Set(),
        caseIds: new Set(),
        nextAction: classification.nextAction,
      };
    current.count += 1;
    if (failure.report) current.reports.add(failure.report);
    if (failure.id) current.caseIds.add(failure.id);
    buckets.set(classification.bucket, current);
  }

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      reports: uniqueStrings([...bucket.reports]),
      caseIds: uniqueStrings([...bucket.caseIds]),
    }))
    .sort((left, right) => right.count - left.count || left.bucket.localeCompare(right.bucket));
};

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
  const reportFailures = normalizeFailureList(report.failures);
  if (report.parseError) {
    reportFailures.push(`parse-error: ${report.parseError}`);
  }
  const derivedOk =
    typeof report.ok === "boolean"
      ? report.ok
      : !report.parseError &&
        reportFailures.length === 0 &&
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
    failures: reportFailures,
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
const reportLevelFailures = presentReports.flatMap((report) =>
  (report.failures || []).map((failure) => ({
    report: report.name,
    id: "",
    searchTerm: "",
    labelKind: "",
    stockPreset: "",
    template: "",
    issueTypes: [],
    failures: [failure],
    searchFailure: null,
    printButtonEnabled: null,
    statusText: failure,
    previewText: "",
  })),
);
const failureTriage = buildFailureTriage([
  ...actionableFailures,
  ...reportLevelFailures,
]);

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
    reportLevelFailures,
    failureTriage,
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
      failureTriage,
    },
    null,
    2,
  ),
);

if (!result.ok && requireProductBlocks) {
  process.exitCode = 1;
}
