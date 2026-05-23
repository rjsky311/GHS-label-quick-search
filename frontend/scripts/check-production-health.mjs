import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_FRONTEND_URL = "https://ghs-frontend.zeabur.app/";
const DEFAULT_BACKEND_HEALTH_URL = "https://ghs-backend.zeabur.app/api/health";

const frontendUrl =
  process.env.PRODUCTION_HEALTH_FRONTEND_URL ||
  process.env.PRINT_QA_PRODUCTION_URL ||
  DEFAULT_FRONTEND_URL;
const backendHealthUrl =
  process.env.PRODUCTION_HEALTH_BACKEND_URL || DEFAULT_BACKEND_HEALTH_URL;
const outputPath = path.resolve(
  process.cwd(),
  process.env.PRODUCTION_HEALTH_REPORT_PATH ||
    "build/production-health-report.json",
);
const maxAttempts = Number(process.env.PRODUCTION_HEALTH_ATTEMPTS || 6);
const timeoutMs = Number(process.env.PRODUCTION_HEALTH_TIMEOUT_MS || 15000);
const retryDelayMs = Number(process.env.PRODUCTION_HEALTH_RETRY_DELAY_MS || 1000);
const expectedAssetTexts = (
  process.env.PRODUCTION_HEALTH_EXPECTED_ASSET_TEXT ||
  process.env.PRINT_QA_EXPECTED_ASSET_TEXT ||
  ""
)
  .split("||")
  .map((value) => value.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withCacheBuster = (url, key = "healthCheck") => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set(key, Date.now().toString());
  return nextUrl.toString();
};

const elapsedFetch = async (url, options = {}) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "cache-control": "no-cache",
        ...(options.headers || {}),
      },
    });
    const elapsedMs = Date.now() - startedAt;
    return { response, elapsedMs };
  } finally {
    clearTimeout(timeout);
  }
};

const responseMeta = (response, elapsedMs) => ({
  status: response.status,
  ok: response.ok,
  elapsedMs,
  requestId: response.headers.get("x-zeabur-request-id") || "",
  server: response.headers.get("server") || "",
});

const resolveIndexAsset = (html, baseUrl) => {
  const match = html.match(/(?:src|href)="([^"]*assets\/index-[^"]+\.js)"/);
  return match ? new URL(match[1], baseUrl).toString() : "";
};

const runAttemptedCheck = async (name, check) => {
  const attempts = [];
  for (let index = 1; index <= maxAttempts; index += 1) {
    try {
      const result = await check(index);
      attempts.push({ attempt: index, ...result });
      if (result.ok) {
        return {
          name,
          ok: true,
          attempts,
        };
      }
    } catch (error) {
      attempts.push({
        attempt: index,
        ok: false,
        error: error?.message || String(error),
      });
    }
    if (index < maxAttempts) {
      await sleep(retryDelayMs * Math.min(index, 5));
    }
  }
  return {
    name,
    ok: false,
    attempts,
  };
};

const checkFrontend = () =>
  runAttemptedCheck("frontend-html-and-asset", async () => {
    const htmlUrl = withCacheBuster(frontendUrl, "productionHealthCheck");
    const { response: htmlResponse, elapsedMs: htmlElapsedMs } =
      await elapsedFetch(htmlUrl);
    const htmlMeta = responseMeta(htmlResponse, htmlElapsedMs);
    const html = await htmlResponse.text();
    if (!htmlResponse.ok) {
      return {
        ok: false,
        frontendUrl,
        htmlUrl,
        html: htmlMeta,
        error: `frontend HTML returned HTTP ${htmlResponse.status}`,
      };
    }

    const assetUrl = resolveIndexAsset(html, htmlUrl);
    if (!assetUrl) {
      return {
        ok: false,
        frontendUrl,
        htmlUrl,
        html: htmlMeta,
        error: "frontend HTML did not include the Vite index asset",
      };
    }

    const { response: assetResponse, elapsedMs: assetElapsedMs } =
      await elapsedFetch(assetUrl);
    const assetMeta = responseMeta(assetResponse, assetElapsedMs);
    if (!assetResponse.ok) {
      return {
        ok: false,
        frontendUrl,
        htmlUrl,
        assetUrl,
        html: htmlMeta,
        asset: assetMeta,
        error: `frontend index asset returned HTTP ${assetResponse.status}`,
      };
    }

    const assetBody = expectedAssetTexts.length ? await assetResponse.text() : "";
    const missingExpectedAssetTexts = expectedAssetTexts.filter(
      (text) => !assetBody.includes(text),
    );
    if (missingExpectedAssetTexts.length) {
      return {
        ok: false,
        frontendUrl,
        htmlUrl,
        assetUrl,
        html: htmlMeta,
        asset: assetMeta,
        expectedAssetText: {
          requiredCount: expectedAssetTexts.length,
          missing: missingExpectedAssetTexts,
        },
        error: "frontend index asset did not include the expected deployed marker text",
      };
    }

    return {
      ok: true,
      frontendUrl,
      htmlUrl,
      assetUrl,
      html: htmlMeta,
      asset: assetMeta,
      expectedAssetText: expectedAssetTexts.length
        ? {
            requiredCount: expectedAssetTexts.length,
            missing: [],
          }
        : undefined,
    };
  });

const checkBackend = () =>
  runAttemptedCheck("backend-health", async () => {
    const healthUrl = withCacheBuster(backendHealthUrl, "productionHealthCheck");
    const { response, elapsedMs } = await elapsedFetch(healthUrl);
    const meta = responseMeta(response, elapsedMs);
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    const healthy = response.ok && body?.status === "healthy";
    return {
      ok: healthy,
      backendHealthUrl,
      healthUrl,
      health: meta,
      version: body?.version || "",
      status: body?.status || "",
      error: healthy
        ? ""
        : `backend health returned HTTP ${response.status} with status ${body?.status || "unknown"}`,
    };
  });

const checks = [await checkFrontend(), await checkBackend()];
const failures = checks
  .filter((check) => !check.ok)
  .map((check) => `${check.name} failed after ${check.attempts.length} attempts`);
const result = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  reportPath: outputPath,
  frontendUrl,
  backendHealthUrl,
  maxAttempts,
  timeoutMs,
  retryDelayMs,
  expectedAssetTextCount: expectedAssetTexts.length,
  checks,
  failures,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}${os.EOL}`);

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
