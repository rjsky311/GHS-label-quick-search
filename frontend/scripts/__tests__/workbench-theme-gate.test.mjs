import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");
const workbenchScript = path.join(
  frontendRoot,
  "scripts/check-experiment-notebook-workbench.mjs",
);

test("workbench QA fails fast for unsupported theme values", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ghs-workbench-theme-"));
  const result = spawnSync(process.execPath, [workbenchScript], {
    cwd,
    env: {
      ...process.env,
      WORKBENCH_QA_THEME: "darkbench",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported WORKBENCH_QA_THEME "darkbench"/);
  assert.doesNotMatch(
    result.stderr,
    /Could not find Chrome|ECONNREFUSED|net::ERR_CONNECTION_REFUSED/,
  );
});
