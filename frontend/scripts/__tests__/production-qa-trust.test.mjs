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
  MIN_GIT_SHA_PREFIX_LENGTH,
  gitShasMatch,
  httpOriginsMatch,
  serviceIdentityMatches,
} = trust;

test("matches exact Git SHAs and hexadecimal prefixes of at least 12 characters", () => {
  assert.equal(MIN_GIT_SHA_PREFIX_LENGTH, 12);

  const fullSha = "31075ddc31cf0bbff54746964159146777b75bc4";
  const minimumPrefix = fullSha.slice(0, MIN_GIT_SHA_PREFIX_LENGTH);

  assert.equal(gitShasMatch(fullSha, fullSha), true);
  assert.equal(gitShasMatch(fullSha, minimumPrefix), true);
  assert.equal(gitShasMatch(minimumPrefix, fullSha), true);
  assert.equal(gitShasMatch(fullSha.toUpperCase(), minimumPrefix), true);
});

test("rejects short and non-hexadecimal Git SHA values", () => {
  const fullSha = "31075ddc31cf0bbff54746964159146777b75bc4";

  assert.equal(gitShasMatch(fullSha, "31075ddc31c"), false);
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
});
