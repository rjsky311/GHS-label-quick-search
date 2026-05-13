import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_PRODUCTION_URL = "https://ghs-frontend.zeabur.app/";

const REQUIRED_PRINT_QA_MARKERS = [
  "layoutBlockedDetailed",
  "casNumbers",
  "labelWidthMm",
  "support-chip",
  "supportChips",
  "custom-label-field-",
  "ready_with_continuation",
  "continuation-badge",
  "preview-page-controls",
  "preview-context-strip",
  "ghs-print-qa-status",
  "autoFitLevel",
  "print_autofit_retry",
  "label-fit-level-",
  "label-stock-small-rack",
  "label-stock-medium-rack",
  "label-content-",
  "label-hazard-mode-",
  "h_codes_only",
  "qr_reference",
];

const productionUrl = process.env.PRINT_QA_PRODUCTION_URL || DEFAULT_PRODUCTION_URL;
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

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  }
  return response.text();
};

const resolveAssetUrl = (html, baseUrl) => {
  const match = html.match(/(?:src|href)="([^"]*assets\/index-[^"]+\.js)"/);
  if (!match) {
    throw new Error("Could not find production index asset in frontend HTML.");
  }
  return new URL(match[1], baseUrl).toString();
};

const htmlUrl = withCacheBuster(productionUrl);
const html = await fetchText(htmlUrl);
const assetUrl = resolveAssetUrl(html, htmlUrl);
const assetText = await fetchText(assetUrl);
const missingMarkers = requiredMarkers.filter(
  (marker) => !assetText.includes(marker),
);

const result = {
  ok: missingMarkers.length === 0,
  generatedAt: new Date().toISOString(),
  productionUrl,
  assetUrl,
  reportPath: outputPath,
  requiredMarkers,
  missingMarkers,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}${os.EOL}`);

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
