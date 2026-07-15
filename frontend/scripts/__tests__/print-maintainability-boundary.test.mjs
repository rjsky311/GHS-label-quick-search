import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");
const modalPath = path.join(frontendRoot, "src/components/LabelPrintModal.jsx");
const hookPath = path.join(frontendRoot, "src/hooks/useLabelPrintOutputPlan.js");

test("LabelPrintModal delegates output-plan derivation to a focused hook", () => {
  const modal = fs.readFileSync(modalPath, "utf8");
  const hook = fs.existsSync(hookPath) ? fs.readFileSync(hookPath, "utf8") : "";

  assert.match(modal, /useLabelPrintOutputPlan/);
  assert.doesNotMatch(modal, /outputPlan\.state/);
  assert.match(hook, /buildPrintOutputPlan/);
  assert.match(hook, /buildBatchPrintPlan/);
});
