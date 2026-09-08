import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "../..");
const repoRoot = path.resolve(frontendRoot, "..");
const trustModulePath = path.join(
  frontendRoot,
  "scripts/production-qa-trust.mjs",
);

let trust = {};
if (fs.existsSync(trustModulePath)) {
  trust = await import(trustModulePath);
}

const {
  FULL_GIT_SHA_LENGTH,
  backendHealthIsReady,
  gitShasMatch,
  httpOriginsMatch,
  nodeVersionMatchesMajor,
  strictTransportSecurityIsReady,
} = trust;

test("accepts only the configured frontend build Node.js major", () => {
  assert.equal(nodeVersionMatchesMajor("v22.23.1", "22"), true);
  assert.equal(nodeVersionMatchesMajor("22.9.0", 22), true);
  assert.equal(nodeVersionMatchesMajor("v20.20.2", "22"), false);
  assert.equal(nodeVersionMatchesMajor("v22.23.1", ""), false);
});

test("pins the frontend build Node.js major at both planner roots", () => {
  const rootNodeVersion = fs
    .readFileSync(path.join(repoRoot, ".node-version"), "utf8")
    .trim();
  const appNodeVersion = fs
    .readFileSync(path.join(frontendRoot, ".node-version"), "utf8")
    .trim();
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"),
  );

  assert.equal(rootNodeVersion, "22");
  assert.equal(appNodeVersion, "22");
  assert.equal(packageJson.engines?.node, "22");
});

test("pins the portable frontend Docker build to Node.js 22", () => {
  const localDockerfile = fs.readFileSync(
    path.join(frontendRoot, "Dockerfile"),
    "utf8",
  );

  assert.match(localDockerfile, /^FROM node:22-alpine AS builder$/m);
});

test("accepts an explicitly ready backend with PDF capability", () => {
  assert.equal(
    backendHealthIsReady({
      status: "healthy",
      readiness: "ready",
      capabilities: { pdf: { available: true } },
    }),
    true,
  );
});

test("rejects a backend with degraded PDF readiness", () => {
  assert.equal(
    backendHealthIsReady({
      status: "healthy",
      readiness: "degraded",
      capabilities: { pdf: { available: false } },
    }),
    false,
  );
});

test("rejects a legacy health body without explicit readiness", () => {
  assert.equal(backendHealthIsReady({ status: "healthy" }), false);
});

test("matches only exact full-length Git SHAs", () => {
  assert.equal(FULL_GIT_SHA_LENGTH, 40);
  const fullSha = "31075ddc31cf0bbff54746964159146777b75bc4";

  assert.equal(gitShasMatch(fullSha, fullSha), true);
  assert.equal(gitShasMatch(fullSha.toUpperCase(), fullSha), true);
  assert.equal(gitShasMatch(fullSha, `${fullSha.slice(0, 39)}0`), false);
  assert.equal(gitShasMatch(`${fullSha.slice(0, 39)}0`, fullSha), false);
});

test("rejects short and non-hexadecimal Git SHA values", () => {
  const fullSha = "31075ddc31cf0bbff54746964159146777b75bc4";

  assert.equal(gitShasMatch(fullSha, "31075ddc31cf0bbff54746964159146777b75bc"), false);
  assert.equal(gitShasMatch(fullSha, "31075ddc31cz"), false);
  assert.equal(gitShasMatch("", fullSha), false);
});

test("matches only credential-free root HTTP(S) origins", () => {
  const expected = "https://ghs-api.yuchelab.com";

  assert.equal(httpOriginsMatch(`${expected}/`, expected), true);
  assert.equal(
    httpOriginsMatch("https://ghs-api.yuchelab.com.evil.test", expected),
    false,
  );
  assert.equal(httpOriginsMatch(`${expected}/api/health`, expected), false);
  assert.equal(
    httpOriginsMatch("https://user:password@ghs-api.yuchelab.com", expected),
    false,
  );
  assert.equal(httpOriginsMatch(`${expected}?redirect=evil`, expected), false);
  assert.equal(httpOriginsMatch(`${expected}#fragment`, expected), false);
  assert.equal(httpOriginsMatch("ftp://ghs-api.yuchelab.com", expected), false);
});

test("requires a one-year HSTS policy for production responses", () => {
  assert.equal(
    strictTransportSecurityIsReady(
      "max-age=31536000; includeSubDomains",
    ),
    true,
  );
  assert.equal(strictTransportSecurityIsReady("max-age=300"), false);
  assert.equal(strictTransportSecurityIsReady(""), false);
});

test("pins every GitHub Action to its reviewed immutable commit", () => {
  const workflows = ["ci.yml", "production-print-qa.yml"].map((name) =>
    fs.readFileSync(path.join(repoRoot, ".github", "workflows", name), "utf8"),
  );
  const workflowText = workflows.join("\n");

  assert.doesNotMatch(
    workflowText,
    /uses:\s*actions\/(?:checkout|setup-node|setup-python|upload-artifact)@v\d+/,
  );
  assert.match(workflowText, /actions\/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10/);
  assert.match(workflowText, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(workflowText, /actions\/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1/);
  assert.match(workflowText, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(
    workflowText,
    /actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/,
  );
});

test("CI reviews dependency changes before expensive frontend checks", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github", "workflows", "ci.yml"),
    "utf8",
  );
  const installIndex = workflow.indexOf("run: npm ci --no-audit");
  const reviewIndex = workflow.indexOf(
    "uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
  );
  const testIndex = workflow.indexOf("run: npm test -- --runInBand");

  assert.notEqual(installIndex, -1);
  assert.notEqual(reviewIndex, -1);
  assert.notEqual(testIndex, -1);
  assert.ok(reviewIndex < installIndex);
  assert.ok(installIndex < testIndex);
  assert.match(workflow, /fail-on-severity: high/);
  assert.match(workflow, /fail-on-scopes: runtime, development, unknown/);
  assert.doesNotMatch(workflow, /warn-only:\s*true/);
});

test("keeps private security reporting and code ownership discoverable", () => {
  const security = fs.readFileSync(path.join(repoRoot, "SECURITY.md"), "utf8");
  const codeowners = fs.readFileSync(
    path.join(repoRoot, ".github", "CODEOWNERS"),
    "utf8",
  );

  assert.match(security, /security\/advisories\/new/);
  assert.match(security, /Do not open a public GitHub issue/i);
  assert.match(codeowners, /^\*\s+@rjsky311$/m);
});

test("production gates cover HSTS, document language, CJK font loading, and semantic landmarks", () => {
  const healthQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/check-production-health.mjs"),
    "utf8",
  );
  const searchQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/check-production-search-ui.mjs"),
    "utf8",
  );
  const nginx = fs.readFileSync(
    path.join(frontendRoot, "nginx.conf"),
    "utf8",
  );
  const staticHeaders = fs.readFileSync(
    path.join(frontendRoot, "public", "_headers"),
    "utf8",
  );

  assert.match(healthQa, /strictTransportSecurityIsReady/);
  assert.match(healthQa, /nodeVersionMatchesMajor/);
  assert.match(healthQa, /PRODUCTION_HEALTH_EXPECTED_NODE_MAJOR/);
  assert.match(healthQa, /strict-transport-security/);
  assert.match(nginx, /Strict-Transport-Security/);
  assert.match(staticHeaders, /^\/\*$/m);
  assert.match(
    staticHeaders,
    /^\s+Strict-Transport-Security: max-age=31536000; includeSubDomains$/m,
  );
  assert.match(staticHeaders, /^\s+X-Content-Type-Options: nosniff$/m);
  assert.match(staticHeaders, /^\s+X-Frame-Options: DENY$/m);
  assert.match(
    staticHeaders,
    /^\s+Content-Security-Policy: frame-ancestors 'none'$/m,
  );
  assert.match(
    staticHeaders,
    /^\s+Referrer-Policy: strict-origin-when-cross-origin$/m,
  );
  assert.match(
    staticHeaders,
    /^\s+Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)$/m,
  );
  assert.match(searchQa, /document\.fonts\s*\.load/);
  assert.match(searchQa, /document\.documentElement\.lang/);
  assert.match(searchQa, /querySelectorAll\("main"\)/);
  assert.match(searchQa, /unlabeledVisibleButtons/);
});

test("production QA scripts use the centralized trust policy", () => {
  const productionHealth = fs.readFileSync(
    path.join(frontendRoot, "scripts/check-production-health.mjs"),
    "utf8",
  );
  assert.match(productionHealth, /from "\.\/production-qa-trust\.mjs"/);
  assert.match(productionHealth, /gitShasMatch/);
  assert.match(productionHealth, /httpOriginsMatch/);
  assert.match(productionHealth, /backendHealthIsReady/);
});

test("Production Print QA aligns npm and uses first-party production origins", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/production-print-qa.yml"),
    "utf8",
  );

  assert.match(
    workflow,
    /^\s+PRODUCTION_HEALTH_EXPECTED_BACKEND_ORIGIN: https:\/\/ghs-api\.yuchelab\.com$/m,
  );
  assert.match(workflow, /default: https:\/\/ghs\.yuchelab\.com\//);

  const npmAlignIndex = workflow.indexOf(
    "run: npm install --global npm@11.6.2",
  );
  const npmCiIndex = workflow.indexOf("run: npm ci --no-audit");
  assert.notEqual(npmAlignIndex, -1);
  assert.notEqual(npmCiIndex, -1);
  assert.ok(npmAlignIndex < npmCiIndex);
  assert.ok(npmCiIndex < workflow.indexOf("run: npm run qa:production-health"));
  assert.doesNotMatch(workflow, /ZEABUR_TOKEN/);
  assert.doesNotMatch(workflow, /qa:zeabur-deployment/);
  assert.doesNotMatch(workflow, /check_inline_dockerfile_parity/);
  assert.match(workflow, /Externally blocked product blocks/);
  assert.match(workflow, /fetch-depth: 2/);
  assert.match(workflow, /id: production_relevance/);
  assert.match(
    workflow,
    /steps\.production_relevance\.outputs\.run_full == 'true'/,
  );
});

test("automatic production QA skips only known non-runtime change sets", () => {
  const classifierPath = path.join(
    repoRoot,
    ".github/scripts/classify-production-qa-change.sh",
  );
  const classify = (...changedPaths) => {
    const result = spawnSync("bash", [classifierPath, ...changedPaths], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout.trim();
  };

  assert.equal(classify(), "run");
  assert.equal(
    classify(
      "PROJECT_STATUS_AND_NEXT_PLAN.md",
      "docs/evidence/checkpoint.md",
      ".github/workflows/production-print-qa.yml",
      "backend/test_pilot_storage.py",
      "frontend/scripts/__tests__/production-qa-trust.test.mjs",
      "frontend/scripts/generate-physical-print-plan.mjs",
    ),
    "skip",
  );
  assert.equal(classify("frontend/src/App.jsx"), "run");
  assert.equal(classify("backend/server.py"), "run");
  assert.equal(classify("frontend/package.json"), "run");
  assert.equal(classify("frontend/scripts/content-security-policy.mjs"), "run");
  assert.equal(classify("frontend/public/runtime-guide.md"), "run");
});

test("retired Zeabur deployment artifacts cannot silently return", () => {
  const retiredPaths = [
    "zeabur.yaml",
    "zbpack.ghs-frontend.json",
    "Dockerfile.ghs-frontend",
    "backend/scripts/check_inline_dockerfile_parity.py",
    "backend/test_inline_dockerfile_parity.py",
    "frontend/scripts/check-zeabur-deployment-freshness.mjs",
  ];
  for (const relativePath of retiredPaths) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false);
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"),
  );
  assert.equal(packageJson.scripts?.["qa:zeabur-deployment"], undefined);
});

test("production product QA short-circuits only on the structured upstream gate", () => {
  const productQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/run-production-product-qa.mjs"),
    "utf8",
  );
  const smokeQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/run-production-print-smoke.mjs"),
    "utf8",
  );

  assert.match(productQa, /isExternalUpstreamUnavailableReport/);
  assert.match(productQa, /PRINT_QA_ALLOW_EXTERNAL_UPSTREAM_BLOCKED/);
  assert.match(smokeQa, /isExternalUpstreamUnavailableReport/);
  assert.match(smokeQa, /stoppedEarly/);
});

test("Production Print QA includes the active PDF canary", () => {
  const productionProductQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/run-production-product-qa.mjs"),
    "utf8",
  );
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"),
  );
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/production-print-qa.yml"),
    "utf8",
  );

  assert.match(productionProductQa, /qa:production-pdf-canary/);
  assert.equal(packageJson.scripts["qa:production-pdf-canary"], "node scripts/check-production-pdf-canary.mjs");
  assert.match(workflow, /npm run qa:production-pdf-canary/);
  assert.match(
    workflow,
    /PRINT_QA_ALLOW_EXTERNAL_UPSTREAM_BLOCKED:\s*"1"/,
  );
});
