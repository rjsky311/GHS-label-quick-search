import { spawn } from "node:child_process";
import path from "node:path";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";

const LAYERS = Object.freeze({
  primary: [
    "a4-primary",
    "a4-primary-profile-blocked",
    "letter-primary",
    "a4-primary-zh-bw",
    "letter-primary-en-bw",
    "ethylene-oxide-a4-primary-continuation",
  ],
  compact: [
    "tube-vial-quick-id",
    "brother-62mm-qr-supplement",
  ],
  "multi-chemical": [
    "ethanol-tube-quick-id",
    "hydrogen-peroxide-qr-supplement-en",
    "nitrogen-tube-quick-id-single-pictogram",
    "zinc-oxide-small-qr-environmental",
  ],
});

const layerName = process.argv[2] || "primary";
const cases = LAYERS[layerName];

if (!cases) {
  throw new Error(
    `Unknown production print QA layer "${layerName}". Valid layers: ${Object.keys(
      LAYERS,
    ).join(", ")}`,
  );
}

const env = {
  ...process.env,
  PRINT_QA_CASES: process.env.PRINT_QA_CASES || cases.join(","),
  PRINT_QA_REPORT_PATH:
    process.env.PRINT_QA_REPORT_PATH || "build/print-qa-report.json",
  PRINT_QA_HANDOFF_REPORT_PATH:
    process.env.PRINT_QA_HANDOFF_REPORT_PATH ||
    `build/production-print-${layerName}-report.json`,
  PRINT_QA_SCREENSHOT_DIR:
    process.env.PRINT_QA_SCREENSHOT_DIR ||
    `build/production-print-${layerName}-screenshots`,
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const childArgs = isWindows ? ["/d", "/s", "/c", "npm", ...args] : args;
    const child = spawn(npmCommand, childArgs, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm ${args.join(" ")} exited with ${code}`));
      }
    });
  });

await run(["run", "qa:production-bundle"]);
await run(["run", "qa:production-search-ui"]);
await run(["run", "qa:print-report"]);
await run(["run", "qa:production-handoff"]);
await run(["run", "qa:production-summary"]);

console.log(
  JSON.stringify(
    {
      ok: true,
      layer: layerName,
      cases: env.PRINT_QA_CASES.split(",").filter(Boolean),
      reportPath: path.resolve(process.cwd(), env.PRINT_QA_REPORT_PATH),
      handoffPath: path.resolve(
        process.cwd(),
        env.PRINT_QA_HANDOFF_REPORT_PATH,
      ),
      screenshotDir: path.resolve(process.cwd(), env.PRINT_QA_SCREENSHOT_DIR),
      summaryPath: path.resolve(
        process.cwd(),
        process.env.PRINT_QA_SUMMARY_REPORT_PATH ||
          "build/production-print-qa-summary.json",
      ),
    },
    null,
    2,
  ),
);
