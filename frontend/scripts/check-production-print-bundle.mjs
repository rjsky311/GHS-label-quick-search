import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_PRODUCTION_URL = "https://ghs-frontend.zeabur.app/";

const REQUIRED_PRINT_QA_MARKERS = [
  "layoutBlockedDetailed",
  "casNumbers",
  "labelWidthMm",
  "ready_with_continuation",
  "continuation-badge",
  "preview-page-controls",
  "preview-context-strip",
  "ghs-print-qa-status",
  "autoFitLevel",
  "print_autofit_retry",
  "label-fit-level-",
  "label-purpose",
  "qrSupplement",
  "quickId",
  "label-stock-small-strip",
  "label-stock-brother-62mm-continuous",
  "ghs-lookup",
  "GHS Label Quick Search",
  "searchParams.set",
  "printAcknowledgedBatchAction",
  "data-batch-category",
];

const productionUrl = process.env.PRINT_QA_PRODUCTION_URL || DEFAULT_PRODUCTION_URL;
const maxAttempts = Number(process.env.PRINT_QA_BUNDLE_ATTEMPTS || 3);
const timeoutMs = Number(process.env.PRINT_QA_BUNDLE_TIMEOUT_MS || 10000);
const retryDelayMs = Number(process.env.PRINT_QA_BUNDLE_RETRY_DELAY_MS || 750);
const outputPath = path.resolve(
  process.cwd(),
  process.env.PRINT_QA_BUNDLE_REPORT_PATH ||
    "build/production-print-bundle-report.json",
);
const requiredMarkers = (
  process.env.PRINT_QA_BUNDLE_MARKERS || REQUIRED_PRINT_QA_MARKERS.join(",")
)
  .split(",")
  .map((marker) => marker.trim())
  .filter(Boolean);

const withCacheBuster = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("printQaBundleCheck", Date.now().toString());
  return nextUrl.toString();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "cache-control": "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GET ${url} failed with HTTP ${response.status}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchTextWithRetry = async (url, label) => {
  const attempts = [];
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const text = await fetchText(url);
      attempts.push({ attempt, ok: true });
      return { text, attempts };
    } catch (error) {
      lastError = error;
      attempts.push({
        attempt,
        ok: false,
        error: error?.message || String(error),
      });
      if (attempt < maxAttempts) {
        await sleep(retryDelayMs * attempt);
      }
    }
  }
  const error = new Error(
    `${label} failed after ${maxAttempts} attempt(s): ${
      lastError?.message || String(lastError)
    }`,
  );
  error.attempts = attempts;
  throw error;
};

const resolveAssetUrl = (html, baseUrl) => {
  const match = html.match(/(?:src|href)="([^"]*assets\/index-[^"]+\.js)"/);
  if (!match) {
    throw new Error("Could not find production index asset in frontend HTML.");
  }
  return new URL(match[1], baseUrl).toString();
};

const htmlUrl = withCacheBuster(productionUrl);
let htmlResult = null;
let assetResult = null;
let assetUrl = "";
let missingMarkers = [];
let failure = "";
try {
  htmlResult = await fetchTextWithRetry(htmlUrl, "production HTML");
  assetUrl = resolveAssetUrl(htmlResult.text, htmlUrl);
  assetResult = await fetchTextWithRetry(assetUrl, "production asset");
  missingMarkers = requiredMarkers.filter(
    (marker) => !assetResult.text.includes(marker),
  );
} catch (error) {
  failure = error?.message || String(error);
}

const result = {
  ok: !failure && missingMarkers.length === 0,
  generatedAt: new Date().toISOString(),
  productionUrl,
  htmlUrl,
  assetUrl,
  reportPath: outputPath,
  maxAttempts,
  timeoutMs,
  retryDelayMs,
  attempts: {
    html: htmlResult?.attempts || [],
    asset: assetResult?.attempts || [],
  },
  requiredMarkers,
  missingMarkers,
  failure,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}${os.EOL}`);

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
