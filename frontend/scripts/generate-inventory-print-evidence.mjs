import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const env = process.env;
const DEFAULT_HTML_DIR = "build/inventory-print-html-artifacts";
const DEFAULT_PDF_DIR = "build/inventory-print-pdf-artifacts";
const DEFAULT_PDF_REPORT_PATH = "build/inventory-print-pdf-report.json";

const htmlDir = env.INVENTORY_PRINT_EVIDENCE_DIR || DEFAULT_HTML_DIR;
const pdfDir = env.INVENTORY_PRINT_PDF_DIR || DEFAULT_PDF_DIR;
const pdfReportPath =
  env.INVENTORY_PRINT_PDF_REPORT_PATH || DEFAULT_PDF_REPORT_PATH;

const jestBin = path.resolve(
  process.cwd(),
  "node_modules/jest/bin/jest.js",
);

if (!fs.existsSync(jestBin)) {
  throw new Error(`Jest executable not found: ${jestBin}`);
}

const run = (command, args, options = {}) => {
  execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      ...options.env,
    },
  });
};

run(process.execPath, [
  jestBin,
  "--runInBand",
  "inventoryPrintEvidenceReport.test.js",
  "--silent=false",
], {
  env: {
    INVENTORY_PRINT_EVIDENCE_DIR: htmlDir,
  },
});

run(process.execPath, ["scripts/check-print-pdf-artifacts.mjs"], {
  env: {
    PRINT_QA_PRINT_HTML_DIR: htmlDir,
    PRINT_QA_PDF_DIR: pdfDir,
    PRINT_QA_PDF_REPORT_PATH: pdfReportPath,
  },
});

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      htmlDir: path.resolve(process.cwd(), htmlDir),
      pdfDir: path.resolve(process.cwd(), pdfDir),
      pdfReportPath: path.resolve(process.cwd(), pdfReportPath),
    },
    null,
    2,
  )}\n`,
);
