import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";
const productReportPath = path.resolve(
  process.cwd(),
  process.env.PRODUCTION_PRODUCT_QA_REPORT_PATH ||
    "build/production-product-qa-report.json",
);
const defaultStepTimeoutMs = Number.parseInt(
  process.env.PRODUCTION_PRODUCT_QA_STEP_TIMEOUT_MS || "1800000",
  10,
);
const stepTimeouts = {
  "production-smoke": Number.parseInt(
    process.env.PRODUCTION_PRODUCT_QA_SMOKE_TIMEOUT_MS || "3600000",
    10,
  ),
  "production-prepared": Number.parseInt(
    process.env.PRODUCTION_PRODUCT_QA_PREPARED_TIMEOUT_MS || "1200000",
    10,
  ),
  "production-batch-print": Number.parseInt(
    process.env.PRODUCTION_PRODUCT_QA_BATCH_TIMEOUT_MS || "1200000",
    10,
  ),
  "production-summary": Number.parseInt(
    process.env.PRODUCTION_PRODUCT_QA_SUMMARY_TIMEOUT_MS || "120000",
    10,
  ),
};
const steps = [];

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
  BATCH_PRINT_QA_REPORT_PATH:
    process.env.BATCH_PRINT_QA_REPORT_PATH ||
    "build/production-batch-print-report.json",
  PRINT_QA_SUMMARY_REPORT_PATH:
    process.env.PRINT_QA_SUMMARY_REPORT_PATH ||
    "build/production-print-qa-summary.json",
};

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

const timeoutForStep = (id) => stepTimeouts[id] || defaultStepTimeoutMs;

const writeProductReport = ({ ok, failure = null }) => {
  const summaryPath = path.resolve(
    process.cwd(),
    env.PRINT_QA_SUMMARY_REPORT_PATH,
  );
  const summary = readJsonIfExists(summaryPath) || {};
  const productReport = {
    ok,
    generatedAt: new Date().toISOString(),
    reportPath: productReportPath,
    summaryReportPath: summaryPath,
    defaultStepTimeoutMs,
    stepTimeouts,
    steps,
    failure,
    productBlocks: summary.productBlocks || [],
    summary: summary.summary || {},
  };

  fs.mkdirSync(path.dirname(productReportPath), { recursive: true });
  fs.writeFileSync(productReportPath, `${JSON.stringify(productReport, null, 2)}\n`);
  return productReport;
};

const run = (id, args, extraEnv = {}) =>
  new Promise((resolve, reject) => {
    const childArgs = isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
    const startedAt = new Date();
    const stepTimeoutMs = timeoutForStep(id);
    const step = {
      id,
      command: `npm ${args.join(" ")}`,
      timeoutMs: stepTimeoutMs,
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      durationMs: null,
      status: "running",
      exitCode: null,
      timedOut: false,
      error: "",
    };
    console.log(
      JSON.stringify(
        {
          event: "production-product-step-start",
          id: step.id,
          command: step.command,
          timeoutMs: stepTimeoutMs,
        },
        null,
        2,
      ),
    );
    const child = spawn(npmCommand, childArgs, {
      cwd: process.cwd(),
      env: { ...env, ...extraEnv },
      stdio: "inherit",
      shell: false,
    });
    let settled = false;
    let timeout = null;
    const finish = (status, exitCode = null, error = null) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      const finishedAt = new Date();
      step.finishedAt = finishedAt.toISOString();
      step.durationMs = finishedAt.getTime() - startedAt.getTime();
      step.status = status;
      step.exitCode = exitCode;
      step.error = error?.message || "";
      steps.push(step);
      console.log(
        JSON.stringify(
          {
            event: "production-product-step-finish",
            id: step.id,
            status: step.status,
            exitCode: step.exitCode,
            durationMs: step.durationMs,
            timedOut: step.timedOut,
          },
          null,
          2,
        ),
      );
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    timeout = setTimeout(() => {
      step.timedOut = true;
      killProcessTree(child);
      const error = new Error(
        `${step.command} timed out after ${stepTimeoutMs}ms`,
      );
      error.stepId = id;
      finish("timed_out", null, error);
    }, stepTimeoutMs);

    child.on("error", (error) => {
      error.stepId = id;
      finish("error", null, error);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        finish("passed", code, null);
      } else {
        const error = new Error(`npm ${args.join(" ")} exited with ${code}`);
        error.stepId = id;
        finish("failed", code, error);
      }
    });
  });

try {
  await run("production-smoke", ["run", "qa:production-smoke"]);
  await run("production-prepared", ["run", "qa:production-prepared"]);
  await run("production-batch-print", ["run", "qa:production-batch-print"]);
  await run("production-summary", ["run", "qa:production-summary"], {
    PRINT_QA_REQUIRE_PRODUCT_BLOCKS: "1",
  });

  const summaryPath = path.resolve(
    process.cwd(),
    env.PRINT_QA_SUMMARY_REPORT_PATH,
  );
  const summary = readJsonIfExists(summaryPath) || {};
  const productReport = writeProductReport({
    ok: Boolean(summary.ok),
  });

  console.log(
    JSON.stringify(
      {
        ok: productReport.ok,
        reportPath: productReport.reportPath,
        summaryReportPath: productReport.summaryReportPath,
        steps: productReport.steps.map((step) => ({
          id: step.id,
          status: step.status,
          durationMs: step.durationMs,
          timedOut: step.timedOut,
        })),
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
} catch (error) {
  const productReport = writeProductReport({
    ok: false,
    failure: {
      stepId: error?.stepId || "",
      message: error?.message || String(error),
    },
  });
  console.error(
    JSON.stringify(
      {
        ok: false,
        reportPath: productReport.reportPath,
        failedStep: productReport.failure?.stepId || "",
        failure: productReport.failure?.message || "",
        steps: productReport.steps.map((step) => ({
          id: step.id,
          status: step.status,
          durationMs: step.durationMs,
          timedOut: step.timedOut,
          error: step.error,
        })),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
