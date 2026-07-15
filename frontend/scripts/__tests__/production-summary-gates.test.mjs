import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");
const summaryScript = path.join(
  frontendRoot,
  "scripts/summarize-production-print-qa.mjs",
);

const writeJson = (filePath, payload) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
};

const makeWorkspace = () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ghs-summary-gate-"));
  const buildDir = path.join(cwd, "build");
  writeJson(path.join(buildDir, "production-health-report.json"), {
    ok: true,
    productionUrl: "https://ghs-frontend.example/",
    summary: { checked: true },
  });
  writeJson(path.join(buildDir, "production-pdf-canary-report.json"), {
    ok: true,
    bytes: 128,
    pdfHeader: true,
  });
  writeJson(path.join(buildDir, "zeabur-deployment-report.json"), {
    ok: true,
    statusCategory: "fresh-running",
    expectedGitSha: "0123456789abcdef",
  });
  return cwd;
};

const runSummary = (cwd, env = {}) =>
  spawnSync(process.execPath, [summaryScript], {
    cwd,
    env: {
      ...process.env,
      PRINT_QA_EXPECTED_GIT_SHA: "0123456789abcdef",
      ...env,
    },
    encoding: "utf8",
  });

test("intermediate expected-SHA summary does not require final product blocks", () => {
  const cwd = makeWorkspace();

  const result = runSummary(cwd);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(
    fs.readFileSync(
      path.join(cwd, "build/production-print-qa-summary.json"),
      "utf8",
    ),
  );
  assert.equal(summary.ok, true);
  assert.equal(summary.requireDeploymentFreshness, true);
  assert.equal(summary.requireProductBlocks, false);
  assert.deepEqual(summary.summary.failedRequiredFreshnessBlocks, []);
  assert.deepEqual(summary.summary.failedProductBlocks, []);
  assert.ok(
    summary.summary.incompleteProductBlocks.includes(
      "prepared-solution-reprint",
    ),
  );
});

test("final product summary still blocks missing product reports", () => {
  const cwd = makeWorkspace();

  const result = runSummary(cwd, {
    PRINT_QA_REQUIRE_PRODUCT_BLOCKS: "1",
  });

  assert.equal(result.status, 1, result.stdout);
  const summary = JSON.parse(
    fs.readFileSync(
      path.join(cwd, "build/production-print-qa-summary.json"),
      "utf8",
    ),
  );
  assert.equal(summary.ok, false);
  assert.equal(summary.requireProductBlocks, true);
  assert.ok(
    summary.summary.failedProductBlocks.includes("prepared-solution-reprint"),
  );
  assert.ok(
    summary.summary.failedProductBlocks.includes("fixed-stock-batch-printing"),
  );
});
