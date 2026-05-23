import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";
const defaultReportPath = "build/print-qa-report.json";
const defaultPrintHtmlDir = "build/print-html-artifacts";
const defaultPdfDir = "build/print-pdf-artifacts";
const defaultPdfReportPath = "build/print-pdf-report.json";
const defaultBundleReportPath = "build/production-print-bundle-report.json";
const defaultSearchUiReportPath = "build/production-search-ui-report.json";
const defaultSearchUiScreenshotDir = "build/production-search-ui-screenshots";
const defaultHandoffReportPath = "build/production-print-handoff-report.json";
const defaultScreenshotDir = "build/production-print-screenshots";
const defaultSummaryReportPath = "build/production-print-qa-summary.json";
const defaultBatchReportPath = "build/production-batch-print-report.json";

const env = {
  ...process.env,
  PRINT_QA_REPORT_PATH:
    process.env.PRINT_QA_REPORT_PATH || defaultReportPath,
  PRINT_QA_PRINT_HTML_DIR:
    process.env.PRINT_QA_PRINT_HTML_DIR || defaultPrintHtmlDir,
  PRINT_QA_PDF_DIR:
    process.env.PRINT_QA_PDF_DIR || defaultPdfDir,
  PRINT_QA_PDF_REPORT_PATH:
    process.env.PRINT_QA_PDF_REPORT_PATH || defaultPdfReportPath,
  PRINT_QA_BUNDLE_REPORT_PATH:
    process.env.PRINT_QA_BUNDLE_REPORT_PATH || defaultBundleReportPath,
  PRODUCTION_SEARCH_UI_REPORT_PATH:
    process.env.PRODUCTION_SEARCH_UI_REPORT_PATH || defaultSearchUiReportPath,
  PRODUCTION_SEARCH_UI_SCREENSHOT_DIR:
    process.env.PRODUCTION_SEARCH_UI_SCREENSHOT_DIR ||
    defaultSearchUiScreenshotDir,
  PRINT_QA_HANDOFF_REPORT_PATH:
    process.env.PRINT_QA_HANDOFF_REPORT_PATH || defaultHandoffReportPath,
  PRINT_QA_SCREENSHOT_DIR:
    process.env.PRINT_QA_SCREENSHOT_DIR || defaultScreenshotDir,
  PRINT_QA_SUMMARY_REPORT_PATH:
    process.env.PRINT_QA_SUMMARY_REPORT_PATH || defaultSummaryReportPath,
  BATCH_PRINT_QA_REPORT_PATH:
    process.env.BATCH_PRINT_QA_REPORT_PATH || defaultBatchReportPath,
};

const run = (args, extraEnv = {}) =>
  new Promise((resolve, reject) => {
    const childArgs = isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
    const child = spawn(npmCommand, childArgs, {
      cwd: process.cwd(),
      env: { ...env, ...extraEnv },
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm ${args.join(" ")} exited with ${code}`));
      }
    });
  });

await run(["run", "qa:production-health"]);
await run(["run", "qa:production-bundle"]);
await run(["run", "qa:production-search-ui"]);
await run(["run", "qa:print-report"]);
await run(["run", "qa:print-pdf"]);
await run(["run", "qa:production-handoff"]);
await run(["run", "qa:production-batch-print"]);
await run(["run", "qa:production-summary"]);

const reportPath = path.resolve(process.cwd(), env.PRINT_QA_REPORT_PATH);
const printHtmlDir = path.resolve(process.cwd(), env.PRINT_QA_PRINT_HTML_DIR);
const pdfDir = path.resolve(process.cwd(), env.PRINT_QA_PDF_DIR);
const bundleReportPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_BUNDLE_REPORT_PATH,
);
const searchUiReportPath = path.resolve(
  process.cwd(),
  env.PRODUCTION_SEARCH_UI_REPORT_PATH,
);
const pdfReportPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_PDF_REPORT_PATH,
);
const handoffPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_HANDOFF_REPORT_PATH,
);
const screenshotDir = path.resolve(process.cwd(), env.PRINT_QA_SCREENSHOT_DIR);
const searchUiScreenshotDir = path.resolve(
  process.cwd(),
  env.PRODUCTION_SEARCH_UI_SCREENSHOT_DIR,
);
const summaryReportPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_SUMMARY_REPORT_PATH,
);
const batchReportPath = path.resolve(
  process.cwd(),
  env.BATCH_PRINT_QA_REPORT_PATH,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      bundleReportPath,
      searchUiReportPath,
      reportPath,
      printHtmlDir,
      pdfDir,
      pdfReportPath,
      handoffPath,
      screenshotDir,
      searchUiScreenshotDir,
      summaryReportPath,
      batchReportPath,
    },
    null,
    2,
  ),
);
