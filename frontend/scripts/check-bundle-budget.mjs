import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const buildAssetsDir = path.resolve(process.cwd(), "build", "assets");
const outputPath = path.resolve(
  process.cwd(),
  process.env.BUNDLE_BUDGET_REPORT_PATH || "build/bundle-budget-report.json",
);

const kib = 1024;
const budgets = [
  {
    id: "initial-app",
    label: "Initial app chunk",
    pattern: /^index-[\w-]+\.js$/,
    maxBytes: 300 * kib,
    maxGzipBytes: 90 * kib,
    required: true,
  },
  {
    id: "label-print-modal",
    label: "Lazy print modal chunk",
    pattern: /^LabelPrintModal-[\w-]+\.js$/,
    maxBytes: 150 * kib,
    maxGzipBytes: 40 * kib,
    required: true,
  },
  {
    id: "print-label-engine",
    label: "Lazy print engine chunk",
    pattern: /^printLabels-[\w-]+\.js$/,
    maxBytes: 150 * kib,
    maxGzipBytes: 40 * kib,
    required: true,
  },
  {
    id: "pilot-dashboard",
    label: "Lazy pilot dashboard chunk",
    pattern: /^PilotDashboardSidebar-[\w-]+\.js$/,
    maxBytes: 90 * kib,
    maxGzipBytes: 25 * kib,
    required: true,
  },
];

const largeChunkThresholdBytes = Number(
  process.env.BUNDLE_BUDGET_LARGE_CHUNK_BYTES || 100 * kib,
);

const formatKiB = (bytes) => `${(bytes / kib).toFixed(2)} KiB`;

if (!fs.existsSync(buildAssetsDir)) {
  console.error(
    `Missing build assets directory: ${buildAssetsDir}. Run "npm run build" first.`,
  );
  process.exit(1);
}

const chunks = fs
  .readdirSync(buildAssetsDir)
  .filter((name) => name.endsWith(".js"))
  .map((name) => {
    const filePath = path.join(buildAssetsDir, name);
    const source = fs.readFileSync(filePath);
    return {
      name,
      bytes: source.byteLength,
      gzipBytes: zlib.gzipSync(source).byteLength,
    };
  })
  .sort((a, b) => b.bytes - a.bytes);

const failures = [];
const budgetResults = budgets.map((budget) => {
  const matches = chunks.filter((chunk) => budget.pattern.test(chunk.name));
  if (budget.required && matches.length === 0) {
    failures.push(`${budget.label} is missing; expected ${budget.pattern}.`);
  }
  if (matches.length > 1) {
    failures.push(`${budget.label} matched multiple chunks: ${matches.map((m) => m.name).join(", ")}.`);
  }

  const chunk = matches[0] || null;
  if (chunk && chunk.bytes > budget.maxBytes) {
    failures.push(
      `${budget.label} ${chunk.name} is ${formatKiB(chunk.bytes)}, above ${formatKiB(
        budget.maxBytes,
      )}.`,
    );
  }
  if (chunk && chunk.gzipBytes > budget.maxGzipBytes) {
    failures.push(
      `${budget.label} ${chunk.name} gzip is ${formatKiB(
        chunk.gzipBytes,
      )}, above ${formatKiB(budget.maxGzipBytes)}.`,
    );
  }

  return {
    id: budget.id,
    label: budget.label,
    pattern: String(budget.pattern),
    required: budget.required,
    maxBytes: budget.maxBytes,
    maxGzipBytes: budget.maxGzipBytes,
    chunk,
    ok:
      !!chunk &&
      chunk.bytes <= budget.maxBytes &&
      chunk.gzipBytes <= budget.maxGzipBytes &&
      matches.length === 1,
  };
});

const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
const totalGzipBytes = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0);
const largeChunks = chunks.filter((chunk) => chunk.bytes >= largeChunkThresholdBytes);

const report = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  reportPath: outputPath,
  buildAssetsDir,
  totalJsChunks: chunks.length,
  totalBytes,
  totalGzipBytes,
  totalKiB: Number((totalBytes / kib).toFixed(2)),
  totalGzipKiB: Number((totalGzipBytes / kib).toFixed(2)),
  largeChunkThresholdBytes,
  largeChunks,
  budgets: budgetResults,
  chunks,
  failures,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}${os.EOL}`);

console.log(
  JSON.stringify(
    {
      ok: report.ok,
      totalJsChunks: report.totalJsChunks,
      totalKiB: report.totalKiB,
      totalGzipKiB: report.totalGzipKiB,
      largeChunks: report.largeChunks.map((chunk) => ({
        name: chunk.name,
        KiB: Number((chunk.bytes / kib).toFixed(2)),
        gzipKiB: Number((chunk.gzipBytes / kib).toFixed(2)),
      })),
      budgets: report.budgets.map((result) => ({
        id: result.id,
        chunk: result.chunk?.name || null,
        KiB: result.chunk ? Number((result.chunk.bytes / kib).toFixed(2)) : null,
        gzipKiB: result.chunk
          ? Number((result.chunk.gzipBytes / kib).toFixed(2))
          : null,
        ok: result.ok,
      })),
      reportPath: report.reportPath,
      failures: report.failures,
    },
    null,
    2,
  ),
);

if (!report.ok) {
  process.exitCode = 1;
}
