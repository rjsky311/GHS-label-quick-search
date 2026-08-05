import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
  serviceIdentityMatches,
  strictTransportSecurityIsReady,
} = trust;

test("accepts only the configured frontend build Node.js major", () => {
  assert.equal(nodeVersionMatchesMajor("v22.23.1", "22"), true);
  assert.equal(nodeVersionMatchesMajor("22.9.0", 22), true);
  assert.equal(nodeVersionMatchesMajor("v20.20.2", "22"), false);
  assert.equal(nodeVersionMatchesMajor("v22.23.1", ""), false);
});

test("pins the Zeabur build Node.js major at both planner roots", () => {
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

test("pins the live frontend service Docker build to Node.js 22", () => {
  const serviceDockerfile = fs.readFileSync(
    path.join(repoRoot, "Dockerfile.ghs-frontend"),
    "utf8",
  );
  const localDockerfile = fs.readFileSync(
    path.join(frontendRoot, "Dockerfile"),
    "utf8",
  );

  assert.match(serviceDockerfile, /^FROM node:22-alpine AS builder$/m);
  assert.match(localDockerfile, /^FROM node:22-alpine AS builder$/m);
  assert.match(
    serviceDockerfile,
    /^COPY frontend\/package\.json frontend\/package-lock\.json \.\/$/m,
  );
  assert.match(
    serviceDockerfile,
    /^COPY frontend\/nginx\.conf \/etc\/nginx\/conf\.d\/default\.conf$/m,
  );
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

test("requires the expected Zeabur service ID and name", () => {
  const expected = {
    id: "69626873d9479ab33ad4590e",
    name: "ghs-frontend",
  };

  assert.equal(serviceIdentityMatches(expected, expected), true);
  assert.equal(
    serviceIdentityMatches(
      { ...expected, id: "6962687391818d5fd9705a67" },
      expected,
    ),
    false,
  );
  assert.equal(
    serviceIdentityMatches({ ...expected, name: "ghs-backend" }, expected),
    false,
  );
  assert.equal(serviceIdentityMatches(expected, { id: expected.id }), false);
  assert.equal(serviceIdentityMatches(expected, { name: expected.name }), false);
});

test("matches only credential-free root HTTP(S) origins", () => {
  const expected = "https://ghs-backend.zeabur.app";

  assert.equal(httpOriginsMatch(`${expected}/`, expected), true);
  assert.equal(
    httpOriginsMatch("https://ghs-backend.zeabur.app.evil.test", expected),
    false,
  );
  assert.equal(httpOriginsMatch(`${expected}/api/health`, expected), false);
  assert.equal(
    httpOriginsMatch("https://user:password@ghs-backend.zeabur.app", expected),
    false,
  );
  assert.equal(httpOriginsMatch(`${expected}?redirect=evil`, expected), false);
  assert.equal(httpOriginsMatch(`${expected}#fragment`, expected), false);
  assert.equal(httpOriginsMatch("ftp://ghs-backend.zeabur.app", expected), false);
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
});

test("CI audits all installed dependencies before expensive frontend checks", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github", "workflows", "ci.yml"),
    "utf8",
  );
  const installIndex = workflow.indexOf("run: npm ci");
  const auditIndex = workflow.indexOf("run: npm audit --audit-level=high");
  const testIndex = workflow.indexOf("run: npm test -- --runInBand");

  assert.notEqual(installIndex, -1);
  assert.notEqual(auditIndex, -1);
  assert.notEqual(testIndex, -1);
  assert.ok(installIndex < auditIndex);
  assert.ok(auditIndex < testIndex);
  assert.doesNotMatch(workflow, /npm audit[^\n]*--omit=dev/);
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

test("pins the Zeabur CLI dependency and has no npx network fallback", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"),
  );
  const deploymentQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/check-zeabur-deployment-freshness.mjs"),
    "utf8",
  );

  assert.equal(packageJson.devDependencies?.zeabur, "0.20.0");
  assert.doesNotMatch(deploymentQa, /\bnpx\s+zeabur\b/);
  assert.doesNotMatch(deploymentQa, /runCommand\(\s*["']npx["']/);
  assert.match(deploymentQa, /process\.execPath/);
});

test("production QA scripts use the centralized trust policy", () => {
  const productionHealth = fs.readFileSync(
    path.join(frontendRoot, "scripts/check-production-health.mjs"),
    "utf8",
  );
  const deploymentQa = fs.readFileSync(
    path.join(frontendRoot, "scripts/check-zeabur-deployment-freshness.mjs"),
    "utf8",
  );

  assert.match(productionHealth, /from "\.\/production-qa-trust\.mjs"/);
  assert.match(productionHealth, /gitShasMatch/);
  assert.match(productionHealth, /httpOriginsMatch/);
  assert.match(productionHealth, /backendHealthIsReady/);
  assert.match(deploymentQa, /from "\.\/production-qa-trust\.mjs"/);
  assert.match(deploymentQa, /gitShasMatch/);
  assert.match(deploymentQa, /httpOriginsMatch/);
  assert.match(deploymentQa, /serviceIdentityMatches/);
});

test("Production Print QA pins service identity and backend origins after npm ci", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/production-print-qa.yml"),
    "utf8",
  );

  assert.match(
    workflow,
    /^\s+ZEABUR_FRONTEND_SERVICE_ID: 69626873d9479ab33ad4590e$/m,
  );
  assert.match(
    workflow,
    /^\s+ZEABUR_EXPECTED_SERVICE_NAME: ghs-frontend$/m,
  );
  assert.match(
    workflow,
    /^\s+ZEABUR_EXPECTED_BACKEND_ORIGIN: https:\/\/ghs-backend\.zeabur\.app$/m,
  );
  assert.match(
    workflow,
    /^\s+PRODUCTION_HEALTH_EXPECTED_BACKEND_ORIGIN: https:\/\/ghs-backend\.zeabur\.app$/m,
  );

  const npmCiIndex = workflow.indexOf("run: npm ci");
  assert.notEqual(npmCiIndex, -1);
  assert.ok(npmCiIndex < workflow.indexOf("run: npm run qa:production-health"));
  assert.ok(npmCiIndex < workflow.indexOf("npm run qa:zeabur-deployment"));
  assert.match(workflow, /statusCategory: "missing-token"/);
  assert.match(workflow, /ZEABUR_TOKEN is required/);
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
});
