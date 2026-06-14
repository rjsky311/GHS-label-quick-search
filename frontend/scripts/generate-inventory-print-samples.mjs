import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildInventoryPrintSampleReport,
  renderInventoryPrintSampleMarkdown,
} from "./inventory-print-sampling.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");

const taipeiDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueFor = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
};

const taipeiTimestamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const valueFor = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}T${valueFor("hour")}:${valueFor("minute")}:${valueFor("second")}+08:00`;
};

const DEFAULT_INPUT = path.join(
  repoRoot,
  "qa/fixtures/organic-inventory-2026-06-14.csv",
);
const DEFAULT_OUTPUT_DIR = path.join(
  repoRoot,
  "qa/evidence",
  `${taipeiDate()}-inventory-print-sampling`,
);

const parseArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      options.input = argv[index + 1];
      index += 1;
    } else if (arg === "--output-dir") {
      options.outputDir = argv[index + 1];
      index += 1;
    } else if (arg === "--source-name") {
      options.sourceName = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }
  return options;
};

const usage = () => `Usage:
  npm run qa:inventory-print-samples -- [--input <csv>] [--output-dir <dir>]

Defaults:
  input: ${path.relative(repoRoot, DEFAULT_INPUT)}
  output-dir: ${path.relative(repoRoot, DEFAULT_OUTPUT_DIR)}
`;

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const inputPath = path.resolve(args.input || DEFAULT_INPUT);
  const outputDir = path.resolve(args.outputDir || DEFAULT_OUTPUT_DIR);
  const sourceName = args.sourceName || path.relative(repoRoot, inputPath);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Inventory CSV not found: ${inputPath}`);
  }

  const csvText = fs.readFileSync(inputPath, "utf8");
  const report = buildInventoryPrintSampleReport(csvText, {
    sourceName,
    generatedAt: taipeiTimestamp(),
  });
  const markdown = renderInventoryPrintSampleMarkdown(report);

  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "inventory-print-sampling-report.json");
  const markdownPath = path.join(outputDir, "inventory-print-sampling-report.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, markdown);

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        inputPath,
        outputDir,
        jsonPath,
        markdownPath,
        summary: report.summary,
        inventorySamples: report.inventorySamples.length,
        syntheticStressCases: report.syntheticStressCases.length,
      },
      null,
      2,
    )}\n`,
  );
};

main();
