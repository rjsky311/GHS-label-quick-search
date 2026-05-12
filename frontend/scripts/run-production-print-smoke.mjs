import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";

const defaultSmokeCases = [
  "a4-primary",
  "letter-primary",
  "formaldehyde-a4-primary-continuation",
  "bottle-supplemental-with-case",
  "tube-vial-quick-id-with-case",
  "brother-62mm-quick-id",
  "small-rack-qr-supplement",
].join(",");

const env = {
  ...process.env,
  PRINT_QA_CASES: process.env.PRINT_QA_CASES || defaultSmokeCases,
  PRINT_QA_REPORT_PATH:
    process.env.PRINT_QA_REPORT_PATH || "build/print-qa-report.json",
  PRINT_QA_HANDOFF_REPORT_PATH:
    process.env.PRINT_QA_HANDOFF_REPORT_PATH ||
    "build/production-print-smoke-report.json",
  PRINT_QA_SCREENSHOT_DIR:
    process.env.PRINT_QA_SCREENSHOT_DIR ||
    "build/production-print-smoke-screenshots",
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const childArgs = isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
    const child = spawn(npmCommand, childArgs, {
      cwd: process.cwd(),
      env,
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

await run(["run", "qa:production-bundle"]);
await run(["run", "qa:production-search-ui"]);
await run(["run", "qa:print-report"]);
await run(["run", "qa:production-handoff"]);

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: env.PRINT_QA_CASES.split(",").filter(Boolean),
      reportPath: path.resolve(process.cwd(), env.PRINT_QA_REPORT_PATH),
      handoffPath: path.resolve(
        process.cwd(),
        env.PRINT_QA_HANDOFF_REPORT_PATH,
      ),
      screenshotDir: path.resolve(process.cwd(), env.PRINT_QA_SCREENSHOT_DIR),
    },
    null,
    2,
  ),
);
