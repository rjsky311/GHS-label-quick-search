import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";

const env = {
  ...process.env,
  PRINT_QA_REPORT_PATH:
    process.env.PRINT_QA_REPORT_PATH || "build/print-qa-report.json",
  PRINT_QA_HANDOFF_REPORT_PATH:
    process.env.PRINT_QA_HANDOFF_REPORT_PATH ||
    "build/production-print-smoke-report.json",
  PRINT_QA_PREPARED_REPORT_PATH:
    process.env.PRINT_QA_PREPARED_REPORT_PATH ||
    "build/production-prepared-print-report.json",
  PRINT_QA_SUMMARY_REPORT_PATH:
    process.env.PRINT_QA_SUMMARY_REPORT_PATH ||
    "build/production-print-qa-summary.json",
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

await run(["run", "qa:production-smoke"]);
await run(["run", "qa:production-prepared"]);
await run(["run", "qa:production-summary"], {
  PRINT_QA_REQUIRE_PRODUCT_BLOCKS: "1",
});

const summaryPath = path.resolve(process.cwd(), env.PRINT_QA_SUMMARY_REPORT_PATH);
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const productReportPath = path.resolve(
  process.cwd(),
  process.env.PRODUCTION_PRODUCT_QA_REPORT_PATH ||
    "build/production-product-qa-report.json",
);

const productReport = {
  ok: Boolean(summary.ok),
  generatedAt: new Date().toISOString(),
  reportPath: productReportPath,
  summaryReportPath: summaryPath,
  productBlocks: summary.productBlocks || [],
  summary: summary.summary || {},
};

fs.mkdirSync(path.dirname(productReportPath), { recursive: true });
fs.writeFileSync(productReportPath, `${JSON.stringify(productReport, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      ok: productReport.ok,
      reportPath: productReportPath,
      summaryReportPath: summaryPath,
      productBlocks: productReport.productBlocks.map((block) => ({
        id: block.id,
        ok: block.ok,
      })),
      summary: productReport.summary,
    },
    null,
    2,
  ),
);

if (!productReport.ok) {
  process.exitCode = 1;
}
