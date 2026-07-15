import fs from "node:fs";
import path from "node:path";

const canaryUrl =
  process.env.PRODUCTION_PDF_CANARY_URL ||
  "https://ghs-backend.zeabur.app/api/health/pdf-canary";
const expectedOrigin = process.env.PRODUCTION_HEALTH_EXPECTED_BACKEND_ORIGIN || "";
const outputPath = path.resolve(
  process.cwd(),
  process.env.PRODUCTION_PDF_CANARY_REPORT_PATH ||
    "build/production-pdf-canary-report.json",
);
const timeoutMs = Number(process.env.PRODUCTION_PDF_CANARY_TIMEOUT_MS || 15_000);

const originOf = (value) => {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return "";
    return url.origin;
  } catch {
    return "";
  }
};

const run = async () => {
  const generatedAt = new Date().toISOString();
  if (!originOf(canaryUrl) || originOf(canaryUrl) !== originOf(expectedOrigin)) {
    return {
      ok: false,
      generatedAt,
      reportPath: outputPath,
      canaryUrl,
      expectedOrigin,
      failures: [
        "PDF canary URL must be an HTTP(S) endpoint on the expected backend origin.",
      ],
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(canaryUrl);
    url.searchParams.set("productionPdfCanary", Date.now().toString());
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "cache-control": "no-cache" },
    });
    let body = null;
    let parseError = "";
    try {
      body = await response.json();
    } catch (error) {
      parseError = error?.message || String(error);
    }
    const failures = [];
    if (!response.ok) failures.push(`PDF canary returned HTTP ${response.status}.`);
    if (parseError) failures.push(`PDF canary JSON could not be parsed: ${parseError}`);
    if (body?.ok !== true || body?.pdfHeader !== true || Number(body?.bytes) <= 0) {
      failures.push("PDF canary did not report a non-empty PDF document.");
    }
    return {
      ok: failures.length === 0,
      generatedAt,
      reportPath: outputPath,
      canaryUrl: url.toString(),
      expectedOrigin,
      status: response.status,
      requestId: response.headers.get("x-zeabur-request-id") || "",
      contentType: response.headers.get("content-type") || "",
      body,
      failures,
    };
  } catch (error) {
    return {
      ok: false,
      generatedAt,
      reportPath: outputPath,
      canaryUrl,
      expectedOrigin,
      failures: [error?.message || String(error)],
    };
  } finally {
    clearTimeout(timeout);
  }
};

const report = await run();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
