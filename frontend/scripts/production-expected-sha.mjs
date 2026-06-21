import { execFileSync as nodeExecFileSync } from "node:child_process";

export const EXPECTED_SHA_ENV_KEYS = Object.freeze([
  "PRINT_QA_EXPECTED_GIT_SHA",
  "PRODUCTION_HEALTH_EXPECTED_GIT_SHA",
  "GITHUB_SHA",
]);

export const ALLOW_UNPINNED_PRODUCTION_QA_ENV =
  "ALLOW_UNPINNED_PRODUCTION_QA";

const trimValue = (value) => String(value || "").trim();

const resolveEnvGitSha = (env) => {
  for (const key of EXPECTED_SHA_ENV_KEYS) {
    const value = trimValue(env[key]);
    if (value) {
      return {
        expectedGitSha: value,
        source: key,
        allowedUnpinned: false,
      };
    }
  }
  return null;
};

const resolveLocalGitSha = ({ cwd, execFileSync }) => {
  try {
    const value = trimValue(
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
    if (value) {
      return {
        expectedGitSha: value,
        source: "git rev-parse HEAD",
        allowedUnpinned: false,
      };
    }
  } catch {
    return null;
  }
  return null;
};

const buildMissingShaError = (scriptName) =>
  [
    `${scriptName} requires a deployment freshness git SHA before running production-facing QA.`,
    `Set PRINT_QA_EXPECTED_GIT_SHA or PRODUCTION_HEALTH_EXPECTED_GIT_SHA, run from a git checkout, or set ${ALLOW_UNPINNED_PRODUCTION_QA_ENV}=1 only for an explicitly unpinned manual check.`,
  ].join(" ");

export const resolveProductionQaExpectedSha = ({
  env = process.env,
  cwd = process.cwd(),
  execFileSync = nodeExecFileSync,
  scriptName = "Production QA",
} = {}) => {
  const envResolution = resolveEnvGitSha(env);
  if (envResolution) return envResolution;

  if (trimValue(env[ALLOW_UNPINNED_PRODUCTION_QA_ENV]) === "1") {
    return {
      expectedGitSha: "",
      source: ALLOW_UNPINNED_PRODUCTION_QA_ENV,
      allowedUnpinned: true,
    };
  }

  const gitResolution = resolveLocalGitSha({ cwd, execFileSync });
  if (gitResolution) return gitResolution;

  throw new Error(buildMissingShaError(scriptName));
};

export const createProductionQaExpectedShaEnv = (options = {}) => {
  const resolution = resolveProductionQaExpectedSha(options);
  if (resolution.allowedUnpinned) return {};

  return {
    PRINT_QA_EXPECTED_GIT_SHA: resolution.expectedGitSha,
    PRODUCTION_HEALTH_EXPECTED_GIT_SHA: resolution.expectedGitSha,
  };
};
