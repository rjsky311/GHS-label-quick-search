import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  injectBackendConnectSrc,
  resolveBackendConnectSrc,
} from "../content-security-policy.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(testDir, "../..");

test("normalizes a configured backend URL to a credential-free CSP origin", () => {
  assert.equal(
    resolveBackendConnectSrc(
      "https://ghs-backend-production.up.railway.app/api/",
    ),
    "https://ghs-backend-production.up.railway.app",
  );
  assert.equal(
    resolveBackendConnectSrc("http://localhost:8001"),
    "http://localhost:8001",
  );
});

test("falls back to the canonical backend for unsafe or missing values", () => {
  for (const value of [
    "",
    "javascript:alert(1)",
    "https://user:password@example.com",
    "https://example.com\nscript-src *",
  ]) {
    assert.equal(resolveBackendConnectSrc(value), "https://ghs-api.yuchelab.com");
  }
});

test("injects the configured backend origin into the index CSP", () => {
  const template = fs.readFileSync(path.join(frontendRoot, "index.html"), "utf8");
  const transformed = injectBackendConnectSrc(
    template,
    "https://ghs-backend-production.up.railway.app",
  );

  assert.match(
    transformed,
    /connect-src[^;]+https:\/\/ghs-backend-production\.up\.railway\.app/,
  );
  assert.doesNotMatch(transformed, /__GHS_BACKEND_CONNECT_SRC__/);
});

test("the meta CSP leaves frame ancestry to deployment response headers", () => {
  const template = fs.readFileSync(path.join(frontendRoot, "index.html"), "utf8");
  assert.doesNotMatch(template, /frame-ancestors/);
});

test("the app shell does not eagerly preload every GHS pictogram", () => {
  const template = fs.readFileSync(path.join(frontendRoot, "index.html"), "utf8");
  assert.doesNotMatch(template, /rel="preload"[^>]+\/ghs\/GHS\d+\.svg/);
});
