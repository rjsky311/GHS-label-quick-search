import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "../..");
const generatorPath = path.resolve(scriptDir, "../generate-physical-print-plan.mjs");

const DEFAULT_CASE_IDS = [
  "a4-primary",
  "letter-primary",
  "ethylene-oxide-a4-primary-continuation",
  "tube-vial-quick-id",
  "brother-62mm-qr-supplement",
  "custom-tiny-complete-primary-blocked",
];

const caseFixture = (id, labelKind, stockPreset, options = {}) => ({
  id,
  label: id,
  chemical: {
    cas: "7647-01-0",
    name: "Hydrochloric acid",
    expectedPictograms: ["GHS05"],
  },
  expected: {
    canPrint: options.canPrint ?? true,
    labelKind,
    stockPreset,
    template: labelKind === "qr-supplement" ? "qrcode" : labelKind === "quick-id" ? "icon" : "full",
  },
  actual: {
    stockFit: {
      pageSize: options.pageSize || "A4",
      labelWidthMm: options.width || 70,
      labelHeightMm: options.height || 24,
    },
  },
  handoffExpectation: {
    hasQr: ["complete-primary", "qr-supplement"].includes(labelKind),
  },
});

const reportFixture = {
  generatedAt: "2026-09-08T00:00:00.000Z",
  summary: { total: 7, passed: 7, failed: 0 },
  cases: [
    caseFixture("a4-primary", "complete-primary", "a4-primary", {
      width: 188,
      height: 268,
    }),
    caseFixture("letter-primary", "complete-primary", "letter-primary", {
      pageSize: "Letter",
      width: 196,
      height: 250,
    }),
    caseFixture(
      "ethylene-oxide-a4-primary-continuation",
      "complete-primary",
      "a4-primary",
      { width: 188, height: 268 },
    ),
    caseFixture("tube-vial-quick-id", "quick-id", "small-strip"),
    caseFixture(
      "brother-62mm-qr-supplement",
      "qr-supplement",
      "brother-62mm-continuous",
      { width: 62, height: 40 },
    ),
    caseFixture(
      "custom-tiny-complete-primary-blocked",
      "complete-primary",
      "custom",
      { canPrint: false, width: 45, height: 28 },
    ),
    caseFixture("bottle-supplemental-with-case", "supplemental", "avery-3422"),
  ],
  productionBrowserQa: { targetUrl: "https://ghs.yuchelab.com", cases: [] },
};

const runGenerator = (physicalPrintCases = "") => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ghs-physical-plan-test-"));
  const reportPath = path.join(tempDir, "print-qa-report.json");
  const jsonPath = path.join(tempDir, "physical-plan.json");
  const markdownPath = path.join(tempDir, "physical-plan.md");
  fs.writeFileSync(reportPath, JSON.stringify(reportFixture));

  const result = spawnSync(process.execPath, [generatorPath], {
    cwd: frontendDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PRINT_QA_REPORT_PATH: reportPath,
      PHYSICAL_PRINT_PLAN_JSON_PATH: jsonPath,
      PHYSICAL_PRINT_PLAN_PATH: markdownPath,
      PHYSICAL_PRINT_CASES: physicalPrintCases,
      GITHUB_SHA: "test-sha",
    },
  });

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return {
      artifact: JSON.parse(fs.readFileSync(jsonPath, "utf8")),
      markdown: fs.readFileSync(markdownPath, "utf8"),
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

test("default physical work order covers only the current public output model", () => {
  const { artifact, markdown } = runGenerator();

  assert.deepEqual(artifact.selectedCaseIds, DEFAULT_CASE_IDS);
  assert.equal(artifact.cases.some((entry) => entry.role === "legacy supplemental"), false);
  assert.deepEqual(
    new Set(artifact.cases.map((entry) => entry.role)),
    new Set([
      "Complete A4/Letter label",
      "Identification small label",
      "QR small label",
    ]),
  );
  assert.equal(
    artifact.cases
      .filter((entry) => entry.role === "Complete A4/Letter label")
      .every((entry) => entry.requiresQr),
    true,
  );
  assert.equal(
    artifact.cases.find((entry) => entry.role === "QR small label")?.requiresQr,
    true,
  );
  assert.equal(
    artifact.cases.find((entry) => entry.role === "Identification small label")?.requiresQr,
    false,
  );
  assert.match(markdown, /current three public outputs/i);
  assert.match(markdown, /PHYSICAL_PRINT_CASES=all/);
});

test("all mode keeps legacy and internal regression cases available by explicit opt-in", () => {
  const { artifact } = runGenerator("all");

  assert.equal(artifact.selectedCaseIds.length, reportFixture.cases.length);
  assert.equal(artifact.selectedCaseIds.includes("bottle-supplemental-with-case"), true);
  assert.equal(artifact.cases.some((entry) => entry.role === "legacy supplemental"), true);
});
