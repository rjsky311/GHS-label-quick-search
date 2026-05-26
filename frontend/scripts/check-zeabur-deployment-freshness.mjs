import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ZERO_TIME = "0001-01-01T00:00:00Z";
const DEFAULT_FRONTEND_SERVICE_ID = "69626873d9479ab33ad4590e";
const DEFAULT_ENVIRONMENT_ID = "696262d9a7aaff0c1152b3d6";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const outputPath = path.resolve(
  frontendRoot,
  process.env.ZEABUR_DEPLOYMENT_REPORT_PATH ||
    "build/zeabur-deployment-report.json",
);
const serviceId =
  process.env.ZEABUR_FRONTEND_SERVICE_ID ||
  process.env.ZEABUR_SERVICE_ID ||
  DEFAULT_FRONTEND_SERVICE_ID;
const environmentId =
  process.env.ZEABUR_ENV_ID ||
  process.env.ZEABUR_ENVIRONMENT_ID ||
  DEFAULT_ENVIRONMENT_ID;

const quoteWindowsArg = (arg) => {
  const value = String(arg);
  if (!/[()\s"&<>|^]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const runCommand = (command, args, options = {}) => {
  if (process.platform === "win32") {
    return spawnSync(
      "cmd.exe",
      ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")],
      {
        ...options,
        encoding: "utf8",
      },
    );
  }

  return spawnSync(command, args, {
    ...options,
    encoding: "utf8",
  });
};

const stripAnsi = (text) =>
  String(text || "").replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");

const normalizeSha = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const shasMatch = (actual, expected) => {
  const actualSha = normalizeSha(actual);
  const expectedSha = normalizeSha(expected);
  if (!actualSha || !expectedSha) return false;
  return (
    actualSha === expectedSha ||
    actualSha.startsWith(expectedSha) ||
    expectedSha.startsWith(actualSha)
  );
};

const readGitHead = () => {
  const result = runCommand("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
};

const expectedGitSha = normalizeSha(
  process.env.ZEABUR_EXPECTED_GIT_SHA ||
    process.env.PRODUCTION_HEALTH_EXPECTED_GIT_SHA ||
    process.env.PRINT_QA_EXPECTED_GIT_SHA ||
    process.env.GITHUB_SHA ||
    readGitHead(),
);

const runZeaburDeploymentList = () => {
  const args = [
    "zeabur",
    "deployment",
    "list",
    "--service-id",
    serviceId,
    "--env-id",
    environmentId,
    "--json",
    "--interactive=false",
  ];
  const result = runCommand("npx", args, {
    cwd: repoRoot,
  });
  return {
    command: `npx ${args.join(" ")}`,
    status: result.status,
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    error: result.error?.message || "",
  };
};

const runZeaburServiceGet = () => {
  const args = [
    "zeabur",
    "service",
    "get",
    "--id",
    serviceId,
    "--env-id",
    environmentId,
    "--json",
    "--interactive=false",
  ];
  const result = runCommand("npx", args, {
    cwd: repoRoot,
  });
  return {
    command: `npx ${args.join(" ")}`,
    status: result.status,
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    error: result.error?.message || "",
  };
};

const runZeaburDeploymentLog = (deploymentId) => {
  if (!deploymentId) {
    return {
      command: "",
      status: null,
      stdout: "",
      stderr: "",
      error: "",
      skipped: true,
    };
  }
  const args = [
    "zeabur",
    "deployment",
    "log",
    "--deployment-id",
    deploymentId,
    "--type",
    "build",
    "--json",
    "--interactive=false",
  ];
  const result = runCommand("npx", args, {
    cwd: repoRoot,
  });
  return {
    command: `npx ${args.join(" ")}`,
    status: result.status,
    stdout: stripAnsi(result.stdout),
    stderr: stripAnsi(result.stderr),
    error: result.error?.message || "",
    skipped: false,
  };
};

const deploymentStarted = (deployment) =>
  Boolean(deployment?.startedAt && deployment.startedAt !== ZERO_TIME);

const deploymentFinished = (deployment) =>
  Boolean(deployment?.finishedAt && deployment.finishedAt !== ZERO_TIME);

const summarizeDeployment = (deployment) => {
  if (!deployment) return null;
  return {
    id: deployment.ID || deployment.id || "",
    status: deployment.status || "",
    commitSHA: deployment.commitSHA || "",
    commitMessage: deployment.commitMessage || "",
    ref: deployment.ref || "",
    createdAt: deployment.createdAt || "",
    scheduledAt: deployment.scheduledAt || "",
    startedAt: deployment.startedAt || "",
    finishedAt: deployment.finishedAt || "",
    started: deploymentStarted(deployment),
    finished: deploymentFinished(deployment),
  };
};

const safeJsonParse = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const readLocalZeaburConfig = () => {
  const yamlPath = path.resolve(repoRoot, "zeabur.yaml");
  const zbpackPath = path.resolve(repoRoot, "zbpack.ghs-frontend.json");
  const yaml = fs.existsSync(yamlPath) ? fs.readFileSync(yamlPath, "utf8") : "";
  const zbpack = fs.existsSync(zbpackPath)
    ? safeJsonParse(fs.readFileSync(zbpackPath, "utf8"), null)
    : null;

  return {
    zeaburYaml: {
      exists: Boolean(yaml),
      hasFrontendServiceName: /\bname:\s*ghs-frontend\b/.test(yaml),
      hasBackendServiceName: /\bname:\s*ghs-backend\b/.test(yaml),
      hasLegacyFrontendName: /\bname:\s*frontend\b/.test(yaml),
      hasLegacyBackendName: /\bname:\s*backend\b/.test(yaml),
    },
    frontendZbpack: {
      exists: Boolean(zbpack),
      appDir: zbpack?.app_dir || "",
      buildCommand: zbpack?.build_command || "",
      outputDir: zbpack?.output_dir || "",
      matchesExpected:
        zbpack?.app_dir === "frontend" &&
        zbpack?.build_command === "npm ci && npm run build" &&
        zbpack?.output_dir === "build",
    },
  };
};

let deployments = [];
const zeabur = runZeaburDeploymentList();
let parseError = "";
if (zeabur.status === 0) {
  try {
    deployments = JSON.parse(zeabur.stdout);
    if (!Array.isArray(deployments)) {
      parseError = "Zeabur CLI JSON output was not an array.";
      deployments = [];
    }
  } catch (error) {
    parseError = error?.message || String(error);
  }
}

const latestDeployment = deployments[0] || null;
const runningDeployment =
  deployments.find((deployment) => deployment.status === "RUNNING") || null;
const expectedDeployments = deployments.filter((deployment) =>
  shasMatch(deployment.commitSHA, expectedGitSha),
);
const expectedDeployment = expectedDeployments[0] || null;
const expectedRunning = expectedDeployments.find(
  (deployment) => deployment.status === "RUNNING",
);
const serviceGet = runZeaburServiceGet();
const service = serviceGet.status === 0 ? safeJsonParse(serviceGet.stdout, null) : null;
const buildLog = runZeaburDeploymentLog(
  expectedDeployment?.ID || expectedDeployment?.id || latestDeployment?.ID || latestDeployment?.id,
);
const buildLogEntries =
  buildLog.status === 0 && buildLog.stdout.trim()
    ? safeJsonParse(buildLog.stdout, [])
    : [];
const localConfig = readLocalZeaburConfig();

const failures = [];
const guidance = [];

if (!expectedGitSha) {
  failures.push("Could not resolve an expected git SHA.");
}

if (zeabur.status !== 0) {
  failures.push("Zeabur CLI deployment list command failed.");
  guidance.push("Confirm Zeabur CLI auth and network access, then rerun this gate.");
}

if (serviceGet.status !== 0) {
  guidance.push("Zeabur service metadata could not be read; verify CLI auth before changing product code.");
}

if (parseError) {
  failures.push(`Could not parse Zeabur deployment JSON: ${parseError}`);
}

if (!deployments.length && zeabur.status === 0 && !parseError) {
  failures.push("Zeabur CLI returned no deployments for the frontend service.");
}

if (expectedGitSha && deployments.length && !expectedDeployment) {
  failures.push(`No Zeabur deployment was found for expected commit ${expectedGitSha}.`);
  guidance.push(
    "Trigger the frontend service redeploy, then wait for the expected commit to reach RUNNING before heavier production QA.",
  );
}

if (expectedDeployment && expectedDeployment.status !== "RUNNING") {
  if (
    (expectedDeployment.status === "BUILDING" ||
      expectedDeployment.status === "FAILED") &&
    !deploymentStarted(expectedDeployment)
  ) {
    failures.push(
      `Expected deployment ${expectedDeployment.ID} is ${expectedDeployment.status} but has not reached build start.`,
    );
    guidance.push(
      "Treat this as a Zeabur/GitHub integration or platform scheduling blocker, not a frontend build regression.",
    );
    if (buildLog.status === 0 && buildLogEntries.length === 0) {
      guidance.push(
        "No build logs were returned for the stuck deployment; inspect the Zeabur service queue/integration in the dashboard.",
      );
    }
    if (
      service &&
      !service.RootDirectory &&
      !service.CustomBuildCommand &&
      !service.OutputDir
    ) {
      guidance.push(
        "Zeabur service metadata still shows empty root/build/output fields; confirm the dashboard is consuming zeabur.yaml or zbpack.ghs-frontend.json.",
      );
    }
  } else {
    failures.push(
      `Expected deployment ${expectedDeployment.ID} is ${expectedDeployment.status}, not RUNNING.`,
    );
  }
}

if (runningDeployment && !shasMatch(runningDeployment.commitSHA, expectedGitSha)) {
  failures.push(
    `Latest RUNNING deployment is ${runningDeployment.commitSHA}, not expected ${expectedGitSha}.`,
  );
  guidance.push(
    "Production is stale until /build-info.json and Zeabur RUNNING deployment agree with the expected commit.",
  );
}

if (expectedRunning && !runningDeployment) {
  failures.push("The expected deployment is RUNNING but no RUNNING deployment was identified.");
}

const ok =
  failures.length === 0 &&
  Boolean(expectedRunning) &&
  shasMatch(expectedRunning.commitSHA, expectedGitSha);

const result = {
  ok,
  generatedAt: new Date().toISOString(),
  reportPath: outputPath,
  serviceId,
  environmentId,
  expectedGitSha,
  zeaburCommand: zeabur.command,
  zeaburCli: {
    status: zeabur.status,
    stderr: zeabur.stderr.trim(),
    error: zeabur.error,
    parseError,
  },
  zeaburServiceCommand: serviceGet.command,
  zeaburServiceCli: {
    status: serviceGet.status,
    stderr: serviceGet.stderr.trim(),
    error: serviceGet.error,
  },
  service: service
    ? {
        id: service.ID || service.id || "",
        name: service.Name || service.name || "",
        template: service.Template || service.template || "",
        status: service.Status || service.status || "",
        rootDirectory: service.RootDirectory ?? "",
        customBuildCommand: service.CustomBuildCommand ?? "",
        outputDir: service.OutputDir ?? "",
        watchPaths: service.WatchPaths || [],
      }
    : null,
  buildLogCommand: buildLog.command,
  buildLogCli: {
    status: buildLog.status,
    stderr: buildLog.stderr.trim(),
    error: buildLog.error,
    skipped: buildLog.skipped,
    entryCount: Array.isArray(buildLogEntries) ? buildLogEntries.length : 0,
  },
  localConfig,
  latestDeployment: summarizeDeployment(latestDeployment),
  runningDeployment: summarizeDeployment(runningDeployment),
  expectedDeployment: summarizeDeployment(expectedDeployment),
  expectedDeployments: expectedDeployments.map(summarizeDeployment),
  deploymentCount: deployments.length,
  failures,
  guidance,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}${os.EOL}`);

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
