import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  gitShasMatch,
  httpOriginsMatch,
  serviceIdentityMatches,
} from "./production-qa-trust.mjs";

const DEFAULT_GRAPHQL_ENDPOINT = "https://api.zeabur.com/graphql";
const DEFAULT_HEALTH_REPORT_PATH = "build/production-health-report.json";
const DEFAULT_OUTPUT_PATH = "build/zeabur-deployment-report.json";
const SERVICE_QUERY = `
query ProductionServiceIdentity($serviceID: ObjectID!) {
  service(_id: $serviceID) {
    _id
    name
  }
}`.trim();

const cwd = process.cwd();
const outputPath = path.resolve(
  cwd,
  process.env.ZEABUR_DEPLOYMENT_REPORT_PATH || DEFAULT_OUTPUT_PATH,
);
const healthReportPath = path.resolve(
  cwd,
  process.env.PRODUCTION_HEALTH_REPORT_PATH || DEFAULT_HEALTH_REPORT_PATH,
);
const serviceId =
  process.env.ZEABUR_FRONTEND_SERVICE_ID ||
  process.env.ZEABUR_SERVICE_ID ||
  "";
const expectedServiceName = process.env.ZEABUR_EXPECTED_SERVICE_NAME || "";
const expectedBackendOrigin = process.env.ZEABUR_EXPECTED_BACKEND_ORIGIN || "";
const expectedGitSha = String(
  process.env.ZEABUR_EXPECTED_GIT_SHA ||
    process.env.PRODUCTION_HEALTH_EXPECTED_GIT_SHA ||
    process.env.PRINT_QA_EXPECTED_GIT_SHA ||
    process.env.GITHUB_SHA ||
    "",
)
  .trim()
  .toLowerCase();
const graphqlEndpoint =
  process.env.ZEABUR_GRAPHQL_ENDPOINT || DEFAULT_GRAPHQL_ENDPOINT;
const token = process.env.ZEABUR_TOKEN || "";

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
};

const successfulAttempt = (report, name) =>
  report?.checks
    ?.find((check) => check?.name === name)
    ?.attempts?.find((attempt) => attempt?.ok) || null;

const failures = [];
const guidance = [];
let statusCategory = "unknown";

const fail = (category, message, nextGuidance = "") => {
  if (statusCategory === "unknown") statusCategory = category;
  failures.push(message);
  if (nextGuidance) guidance.push(nextGuidance);
};

if (!gitShasMatch(expectedGitSha, expectedGitSha)) {
  fail(
    "invalid-expected-sha",
    "Deployment QA requires a full expected git SHA.",
  );
}
if (
  !serviceIdentityMatches(
    { id: serviceId, name: expectedServiceName },
    { id: serviceId, name: expectedServiceName },
  )
) {
  fail(
    "invalid-service-identity",
    "Deployment QA requires the expected Zeabur frontend service ID and name.",
  );
}
if (!httpOriginsMatch(expectedBackendOrigin, expectedBackendOrigin)) {
  fail(
    "invalid-backend-origin",
    "Deployment QA requires a credential-free expected backend HTTP(S) origin.",
  );
}
if (!token) {
  fail(
    "missing-token",
    "ZEABUR_TOKEN is required for strict service identity verification.",
    "Add the repository ZEABUR_TOKEN secret, then rerun Production Print QA.",
  );
}

const healthReport = readJson(healthReportPath);
if (!healthReport) {
  fail(
    "production-health-unavailable",
    "The production health report was missing or invalid.",
    "Run qa:production-health before the deployment evidence gate.",
  );
} else if (!healthReport.ok) {
  fail(
    "production-health-failed",
    "The production health gate did not pass.",
    "Resolve the public frontend or backend freshness failure before heavier production QA.",
  );
}

const frontendAttempt = successfulAttempt(
  healthReport,
  "frontend-html-and-asset",
);
const backendAttempt = successfulAttempt(healthReport, "backend-health");
const frontendGitSha = frontendAttempt?.buildInfo?.gitSha || "";
const backendGitSha = backendAttempt?.gitSha || "";
const healthBackendOrigin = healthReport?.expectedBackendOrigin || "";

if (healthReport) {
  if (!gitShasMatch(healthReport.expectedGitSha, expectedGitSha)) {
    fail(
      "health-report-sha-mismatch",
      "The production health report was generated for a different expected commit.",
    );
  }
  if (!gitShasMatch(frontendGitSha, expectedGitSha)) {
    fail(
      "frontend-stale",
      "The public frontend build metadata did not match the expected commit.",
    );
  }
  if (!gitShasMatch(backendGitSha, expectedGitSha)) {
    fail(
      "backend-stale",
      "The public backend health metadata did not match the expected commit.",
    );
  }
  if (!httpOriginsMatch(healthBackendOrigin, expectedBackendOrigin)) {
    fail(
      "backend-origin-mismatch",
      "The production health report used a different backend origin.",
    );
  }
}

let service = null;
let graphqlStatus = 0;
let graphqlErrors = [];
if (token && serviceId) {
  try {
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "user-agent": "ghs-production-deployment-evidence/1",
      },
      body: JSON.stringify({
        query: SERVICE_QUERY,
        variables: { serviceID: serviceId },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    graphqlStatus = response.status;
    const payload = await response.json();
    graphqlErrors = Array.isArray(payload?.errors) ? payload.errors : [];
    service = payload?.data?.service || null;
    if (!response.ok || graphqlErrors.length) {
      fail(
        "service-identity-unavailable",
        `Zeabur service identity query failed with HTTP ${response.status}.`,
        "Verify the Zeabur token and GraphQL service access before changing product code.",
      );
    }
  } catch {
    fail(
      "service-identity-unavailable",
      "Zeabur service identity could not be queried.",
      "Verify Zeabur API availability and token access, then rerun Production Print QA.",
    );
  }
}

const actualServiceIdentity = {
  id: service?._id || "",
  name: service?.name || "",
};
if (
  token &&
  !graphqlErrors.length &&
  !serviceIdentityMatches(actualServiceIdentity, {
    id: serviceId,
    name: expectedServiceName,
  })
) {
  fail(
    "service-identity-mismatch",
    `Zeabur service identity ${actualServiceIdentity.id || "missing-id"}/${actualServiceIdentity.name || "missing-name"} did not match ${serviceId}/${expectedServiceName}.`,
  );
}

const ok = failures.length === 0;
if (ok) statusCategory = "fresh-serving";

const result = {
  ok,
  generatedAt: new Date().toISOString(),
  reportPath: outputPath,
  healthReportPath,
  statusCategory,
  expectedGitSha,
  expectedBackendOrigin,
  service: service
    ? { id: actualServiceIdentity.id, name: actualServiceIdentity.name }
    : null,
  productionEvidence: {
    frontendGitSha,
    backendGitSha,
    healthBackendOrigin,
  },
  graphql: {
    endpoint: graphqlEndpoint,
    status: graphqlStatus,
    errorCount: graphqlErrors.length,
  },
  latestDeployment: null,
  expectedDeployment: null,
  runningDeployment: null,
  recovery: {
    nextActions: ok
      ? ["Proceed with heavier production QA."]
      : ["Resolve the reported evidence failure, then rerun Production Print QA."],
  },
  failures,
  guidance,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}${os.EOL}`);
console.log(JSON.stringify(result, null, 2));

if (!ok) process.exitCode = 1;
