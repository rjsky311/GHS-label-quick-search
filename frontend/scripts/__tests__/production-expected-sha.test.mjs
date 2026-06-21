import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createProductionQaExpectedShaEnv,
  resolveProductionQaExpectedSha,
} from "../production-expected-sha.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");
const productionHealthScript = path.join(
  frontendRoot,
  "scripts/check-production-health.mjs",
);

const makeTempDir = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const runGit = (cwd, args) => {
  const result = spawnSync("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "GHS QA",
      GIT_AUTHOR_EMAIL: "qa@example.test",
      GIT_COMMITTER_NAME: "GHS QA",
      GIT_COMMITTER_EMAIL: "qa@example.test",
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

test("resolves expected SHA from existing production QA env", () => {
  const resolved = resolveProductionQaExpectedSha({
    env: {
      PRINT_QA_EXPECTED_GIT_SHA: "  abc123def456  ",
      PRODUCTION_HEALTH_EXPECTED_GIT_SHA: "ignored",
    },
    cwd: makeTempDir("ghs-no-git-env-sha-"),
    execFileSync: () => {
      throw new Error("git should not be called when env SHA exists");
    },
  });

  assert.deepEqual(resolved, {
    expectedGitSha: "abc123def456",
    source: "PRINT_QA_EXPECTED_GIT_SHA",
    allowedUnpinned: false,
  });
});

test("resolves expected SHA from a local git checkout", () => {
  const cwd = makeTempDir("ghs-git-sha-");
  runGit(cwd, ["init"]);
  fs.writeFileSync(path.join(cwd, "README.md"), "qa\n");
  runGit(cwd, ["add", "README.md"]);
  runGit(cwd, [
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--no-gpg-sign",
    "-m",
    "initial",
  ]);
  const expectedGitSha = runGit(cwd, ["rev-parse", "HEAD"]);

  const resolved = resolveProductionQaExpectedSha({
    env: {},
    cwd,
  });

  assert.deepEqual(resolved, {
    expectedGitSha,
    source: "git rev-parse HEAD",
    allowedUnpinned: false,
  });
});

test("fails without expected SHA unless explicitly opted out", () => {
  assert.throws(
    () =>
      resolveProductionQaExpectedSha({
        env: {},
        cwd: makeTempDir("ghs-no-git-sha-"),
        execFileSync: () => {
          throw new Error("not a git repository");
        },
      }),
    /Production QA requires a deployment freshness git SHA/,
  );
});

test("explicit opt-out allows unpinned production QA", () => {
  const resolved = resolveProductionQaExpectedSha({
    env: { ALLOW_UNPINNED_PRODUCTION_QA: "1" },
    cwd: makeTempDir("ghs-unpinned-sha-"),
    execFileSync: () => {
      throw new Error("not a git repository");
    },
  });

  assert.deepEqual(resolved, {
    expectedGitSha: "",
    source: "ALLOW_UNPINNED_PRODUCTION_QA",
    allowedUnpinned: true,
  });
});

test("explicit opt-out wins over git fallback in a local checkout", () => {
  const cwd = makeTempDir("ghs-git-unpinned-sha-");
  runGit(cwd, ["init"]);
  fs.writeFileSync(path.join(cwd, "README.md"), "qa\n");
  runGit(cwd, ["add", "README.md"]);
  runGit(cwd, [
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--no-gpg-sign",
    "-m",
    "initial",
  ]);

  const resolved = resolveProductionQaExpectedSha({
    env: { ALLOW_UNPINNED_PRODUCTION_QA: "1" },
    cwd,
  });

  assert.deepEqual(resolved, {
    expectedGitSha: "",
    source: "ALLOW_UNPINNED_PRODUCTION_QA",
    allowedUnpinned: true,
  });
});

test("creates child env values for both print and production-health SHA gates", () => {
  const expectedEnv = createProductionQaExpectedShaEnv({
    env: { PRODUCTION_HEALTH_EXPECTED_GIT_SHA: "feedface" },
    cwd: makeTempDir("ghs-child-env-sha-"),
    execFileSync: () => {
      throw new Error("git should not be called when env SHA exists");
    },
  });

  assert.deepEqual(expectedEnv, {
    PRINT_QA_EXPECTED_GIT_SHA: "feedface",
    PRODUCTION_HEALTH_EXPECTED_GIT_SHA: "feedface",
  });
});

test("production health script fails early without a freshness SHA", () => {
  const result = spawnSync(process.execPath, [productionHealthScript], {
    cwd: makeTempDir("ghs-health-no-sha-"),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      PRODUCTION_HEALTH_ATTEMPTS: "1",
      PRODUCTION_HEALTH_TIMEOUT_MS: "50",
      PRODUCTION_HEALTH_FRONTEND_URL: "http://127.0.0.1:9/",
      PRODUCTION_HEALTH_BACKEND_URL: "http://127.0.0.1:9/api/health",
    },
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Production health QA requires a deployment freshness git SHA/,
  );
});
