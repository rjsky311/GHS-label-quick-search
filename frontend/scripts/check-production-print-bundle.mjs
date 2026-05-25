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

const collectJsAssetUrls = (text, baseUrl) => {
  const urls = new Set();
  const patterns = [
    /(?:src|href)="([^"]*assets\/[^"]+\.js)"/g,
    /["'`]([^"'`]*assets\/[^"'`]+\.js)["'`]/g,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(text);
    while (match) {
      urls.add(new URL(match[1], baseUrl).toString());
      match = pattern.exec(text);
    }
  });

  return [...urls].sort();
};

const fetchProductionJsBundle = async (html, baseUrl) => {
  const queued = collectJsAssetUrls(html, baseUrl);
  if (queued.length === 0) {
    throw new Error("Could not find production JS assets in frontend HTML.");
  }

  const seen = new Set();
  const assetResults = [];
  let combinedText = "";

  while (queued.length > 0) {
    const url = queued.shift();
    if (seen.has(url)) {
      continue;
    }

    seen.add(url);
    const asset = await fetchTextWithRetry(url, "production asset");
    assetResults.push({
      url,
      attempts: asset.attempts,
      bytes: asset.text.length,
    });
    combinedText += `\n/* ${url} */\n${asset.text}`;

    collectJsAssetUrls(asset.text, baseUrl).forEach((nestedUrl) => {
      if (!seen.has(nestedUrl)) {
        queued.push(nestedUrl);
      }
    });
  }

  return {
    text: combinedText,
    assets: assetResults,
  };
};

const htmlUrl = withCacheBuster(productionUrl);
let htmlResult = null;
let bundleResult = null;
let assetUrl = "";
let missingMarkers = [];
let failure = "";
try {
  htmlResult = await fetchTextWithRetry(htmlUrl, "production HTML");
  bundleResult = await fetchProductionJsBundle(htmlResult.text, htmlUrl);
  assetUrl = bundleResult.assets[0]?.url || "";
  missingMarkers = requiredMarkers.filter(
    (marker) => !bundleResult.text.includes(marker),
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
    asset: bundleResult?.assets?.[0]?.attempts || [],
  },
  assetUrls: bundleResult?.assets?.map((asset) => asset.url) || [],
  assetCount: bundleResult?.assets?.length || 0,
  assetBytes: bundleResult?.assets?.reduce((sum, asset) => sum + asset.bytes, 0) || 0,
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
