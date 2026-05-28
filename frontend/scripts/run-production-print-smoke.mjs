import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";
const stepTimeoutMs = Number.parseInt(
  process.env.PRODUCTION_PRINT_SMOKE_STEP_TIMEOUT_MS || "1800000",
  10,
);

const defaultSmokeCases = [
  "a4-primary",
  "a4-primary-profile-blocked",
  "letter-primary",
  "ethylene-oxide-a4-primary-continuation",
  "tube-vial-quick-id",
  "brother-62mm-qr-supplement",
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

const killProcessTree = (child) => {
  if (!child?.pid) return;
  if (isWindows) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 5000).unref?.();
};

const run = (id, args) =>
  new Promise((resolve, reject) => {
    const childArgs = isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
    const startedAt = Date.now();
    console.log(
      JSON.stringify(
        {
          event: "production-print-smoke-step-start",
          id,
          command: `npm ${args.join(" ")}`,
          timeoutMs: stepTimeoutMs,
        },
        null,
        2,
      ),
    );
    const child = spawn(npmCommand, childArgs, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: false,
    });
    let settled = false;
    let timeout = null;

    const finish = (status, code = null, error = null) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      console.log(
        JSON.stringify(
          {
            event: "production-print-smoke-step-finish",
            id,
            status,
            exitCode: code,
            durationMs: Date.now() - startedAt,
            timedOut: status === "timed_out",
          },
          null,
          2,
        ),
      );
      if (error) reject(error);
      else resolve();
    };

    timeout = setTimeout(() => {
      killProcessTree(child);
      finish(
        "timed_out",
        null,
        new Error(`npm ${args.join(" ")} timed out after ${stepTimeoutMs}ms`),
      );
    }, stepTimeoutMs);

    child.on("error", (error) => finish("error", null, error));
    child.on("exit", (code) => {
      if (code === 0) {
        finish("passed", code, null);
      } else {
        finish("failed", code, new Error(`npm ${args.join(" ")} exited with ${code}`));
      }
    });
  });

await run("production-health", ["run", "qa:production-health"]);
await run("production-bundle", ["run", "qa:production-bundle"]);
await run("production-search-ui", ["run", "qa:production-search-ui"]);
await run("print-report", ["run", "qa:print-report"]);
await run("production-handoff", ["run", "qa:production-handoff"]);
await run("production-summary", ["run", "qa:production-summary"]);

console.log(
  JSON.stringify(
    {
      ok: true,
      stepTimeoutMs,
      cases: env.PRINT_QA_CASES.split(",").filter(Boolean),
      reportPath: path.resolve(process.cwd(), env.PRINT_QA_REPORT_PATH),
      handoffPath: path.resolve(
        process.cwd(),
        env.PRINT_QA_HANDOFF_REPORT_PATH,
      ),
      screenshotDir: path.resolve(process.cwd(), env.PRINT_QA_SCREENSHOT_DIR),
      summaryPath: path.resolve(
        process.cwd(),
        process.env.PRINT_QA_SUMMARY_REPORT_PATH ||
          "build/production-print-qa-summary.json",
      ),
    },
    null,
    2,
  ),
);
