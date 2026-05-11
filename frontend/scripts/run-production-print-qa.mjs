import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";
const defaultReportPath = "build/print-qa-report.json";
const defaultPrintHtmlDir = "build/print-html-artifacts";
const defaultPdfDir = "build/print-pdf-artifacts";
const defaultPdfReportPath = "build/print-pdf-report.json";
const defaultHandoffReportPath = "build/production-print-handoff-report.json";
const defaultScreenshotDir = "build/production-print-screenshots";

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
  PRINT_QA_HANDOFF_REPORT_PATH:
    process.env.PRINT_QA_HANDOFF_REPORT_PATH || defaultHandoffReportPath,
  PRINT_QA_SCREENSHOT_DIR:
    process.env.PRINT_QA_SCREENSHOT_DIR || defaultScreenshotDir,
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

await run(["run", "qa:print-report"]);
await run(["run", "qa:print-pdf"]);
await run(["run", "qa:production-handoff"]);

const reportPath = path.resolve(process.cwd(), env.PRINT_QA_REPORT_PATH);
const printHtmlDir = path.resolve(process.cwd(), env.PRINT_QA_PRINT_HTML_DIR);
const pdfDir = path.resolve(process.cwd(), env.PRINT_QA_PDF_DIR);
const pdfReportPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_PDF_REPORT_PATH,
);
const handoffPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_HANDOFF_REPORT_PATH,
);
const screenshotDir = path.resolve(process.cwd(), env.PRINT_QA_SCREENSHOT_DIR);

console.log(
  JSON.stringify(
    {
      ok: true,
      reportPath,
      printHtmlDir,
      pdfDir,
      pdfReportPath,
      handoffPath,
      screenshotDir,
    },
    null,
    2,
  ),
);
