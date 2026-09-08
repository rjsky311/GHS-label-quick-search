import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { createProductionQaExpectedShaEnv } from "./production-expected-sha.mjs";
import {
  EXTERNAL_UPSTREAM_STATUS,
  isExternalUpstreamUnavailableReport,
} from "./production-upstream-gate.mjs";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";
const expectedShaEnv = (() => {
  try {
    return createProductionQaExpectedShaEnv({
      scriptName: "Production print smoke QA",
    });
  } catch (error) {
    console.error(error?.message || String(error));
    process.exit(1);
  }
})();
const stepTimeoutMs = Number.parseInt(
  process.env.PRODUCTION_PRINT_SMOKE_STEP_TIMEOUT_MS || "1800000",
  10,
);
const retryableStepAttempts = Number.parseInt(
  process.env.PRODUCTION_PRINT_SMOKE_RETRYABLE_STEP_ATTEMPTS || "2",
  10,
);
const retryableStepDelayMs = Number.parseInt(
  process.env.PRODUCTION_PRINT_SMOKE_RETRYABLE_STEP_DELAY_MS || "5000",
  10,
);

const retryableStepIds = new Set([
  "production-search-ui",
  "production-handoff",
]);

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
  ...expectedShaEnv,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runAttempt = (id, args, attempt, attempts) =>
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
          attempt,
          attempts,
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
            attempt,
            attempts,
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

const run = async (id, args) => {
  const attempts = retryableStepIds.has(id)
    ? Math.max(1, retryableStepAttempts)
    : 1;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await runAttempt(id, args, attempt, attempts);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      console.warn(
        JSON.stringify(
          {
            event: "production-print-smoke-step-retry",
            id,
            attempt,
            attempts,
            delayMs: retryableStepDelayMs,
            error: error?.message || String(error),
          },
          null,
          2,
        ),
      );
      await sleep(retryableStepDelayMs);
    }
  }
  throw lastError || new Error(`npm ${args.join(" ")} failed.`);
};

await run("production-health", ["run", "qa:production-health"]);
await run("production-bundle", ["run", "qa:production-bundle"]);
await run("production-search-ui", ["run", "qa:production-search-ui"]);
const searchReportPath = path.resolve(
  process.cwd(),
  process.env.PRODUCTION_SEARCH_UI_REPORT_PATH ||
    "build/production-search-ui-report.json",
);
const searchReport = fs.existsSync(searchReportPath)
  ? JSON.parse(fs.readFileSync(searchReportPath, "utf8").replace(/^\uFEFF/, ""))
  : null;
const externalUpstreamBlocked =
  isExternalUpstreamUnavailableReport(searchReport);

if (externalUpstreamBlocked) {
  env.PRINT_QA_ALLOW_EXTERNAL_UPSTREAM_BLOCKED = "1";
  await run("production-summary", ["run", "qa:production-summary"]);
} else {
  await run("print-report", ["run", "qa:print-report"]);
  await run("production-handoff", ["run", "qa:production-handoff"]);
  await run("production-summary", ["run", "qa:production-summary"]);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      statusCategory: externalUpstreamBlocked
        ? EXTERNAL_UPSTREAM_STATUS
        : "complete",
      stoppedEarly: externalUpstreamBlocked,
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
