import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(frontendRoot, "..");

const failures = [];

function readText(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required document: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireIncludes(relativePath, text, needle, reason) {
  if (!text.includes(needle)) {
    failures.push(`${relativePath} must include "${needle}" (${reason}).`);
  }
}

function extract(relativePath, text, pattern, label) {
  const match = text.match(pattern);
  if (!match) {
    failures.push(`${relativePath} is missing ${label}.`);
    return null;
  }
  return match[1];
}

const docs = {
  "README.md": readText("README.md"),
  "AGENTS.md": readText("AGENTS.md"),
  "CLAUDE.md": readText("CLAUDE.md"),
  "PROJECT_STATUS_AND_NEXT_PLAN.md": readText("PROJECT_STATUS_AND_NEXT_PLAN.md"),
  "POST_95_REPRIORITIZATION.md": readText("POST_95_REPRIORITIZATION.md"),
  "LAB_READY_PILOT_95_PLAN.md": readText("LAB_READY_PILOT_95_PLAN.md"),
  "PRODUCT_SCOPE_GATE.md": readText("PRODUCT_SCOPE_GATE.md"),
  "AUTONOMOUS_WORKFLOW.md": readText("AUTONOMOUS_WORKFLOW.md"),
  "NEXT_PRODUCT_WORK.md": readText("NEXT_PRODUCT_WORK.md"),
  "NEXT_REMAINING_PRODUCT_WORK.md": readText("NEXT_REMAINING_PRODUCT_WORK.md"),
  "FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md": readText(
    "FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md",
  ),
  "DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md": readText(
    "DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md",
  ),
  "SIMPLIFIED_LABEL_OUTPUT_MODEL.md": readText("SIMPLIFIED_LABEL_OUTPUT_MODEL.md"),
  "PRINT_LABEL_CONTRACT.md": readText("PRINT_LABEL_CONTRACT.md"),
  "BATCH_LABEL_PRINT_REFACTOR_PLAN.md": readText(
    "BATCH_LABEL_PRINT_REFACTOR_PLAN.md",
  ),
  "PHYSICAL_PRINT_VALIDATION_CHECKLIST.md": readText(
    "PHYSICAL_PRINT_VALIDATION_CHECKLIST.md",
  ),
  "BRANDED_UTILITY_STRATEGY.md": readText("BRANDED_UTILITY_STRATEGY.md"),
  "SCIENTIFIC_AGENT_SKILLS_EVALUATION.md": readText(
    "SCIENTIFIC_AGENT_SKILLS_EVALUATION.md",
  ),
  "CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md": readText(
    "CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md",
  ),
};

const frontendPackage = JSON.parse(fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"));
const versionSources = {
  "frontend/package.json": frontendPackage.version,
  "frontend/src/constants/version.js": extract(
    "frontend/src/constants/version.js",
    readText("frontend/src/constants/version.js"),
    /APP_VERSION\s*=\s*["']([^"']+)["']/,
    "APP_VERSION",
  ),
  "backend/server.py": extract(
    "backend/server.py",
    readText("backend/server.py"),
    /APP_VERSION\s*=\s*["']([^"']+)["']/,
    "APP_VERSION",
  ),
  "README.md": extract(
    "README.md",
    docs["README.md"],
    /Current runtime version:\s*`([^`]+)`/,
    "current runtime version",
  ),
  "PROJECT_STATUS_AND_NEXT_PLAN.md": extract(
    "PROJECT_STATUS_AND_NEXT_PLAN.md",
    docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
    /Runtime\/code version is `([^`]+)`/,
    "runtime/code version",
  ),
  "AGENTS.md current version": extract(
    "AGENTS.md",
    docs["AGENTS.md"],
    /\*\*Current Version\*\*:\s*v([0-9]+\.[0-9]+\.[0-9]+)/,
    "Current Version",
  ),
};

const expectedVersion = frontendPackage.version;
for (const [source, version] of Object.entries(versionSources)) {
  if (version && version !== expectedVersion) {
    failures.push(`${source} version ${version} does not match ${expectedVersion}.`);
  }
}

for (const [relativePath, text] of Object.entries(docs)) {
  if (relativePath === "PROJECT_STATUS_AND_NEXT_PLAN.md") continue;
  requireIncludes(
    relativePath,
    text,
    "PROJECT_STATUS_AND_NEXT_PLAN.md",
    "canonical planning entry point must stay discoverable",
  );
}

requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "This is the canonical planning entry point",
  "canonical role statement",
);
requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "LAB_READY_PILOT_95_PLAN.md",
  "next major product target must stay discoverable from the canonical plan",
);
requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "POST_95_REPRIORITIZATION.md",
  "post-95 target selection must stay discoverable from the canonical plan",
);
requireIncludes(
  "POST_95_REPRIORITIZATION.md",
  docs["POST_95_REPRIORITIZATION.md"],
  "Small Pilot Observation And Operator Loop",
  "post-95 re-rank must name the active next target",
);
requireIncludes(
  "LAB_READY_PILOT_95_PLAN.md",
  docs["LAB_READY_PILOT_95_PLAN.md"],
  "95% Lab-Ready Pilot",
  "lab-ready pilot target role statement",
);
requireIncludes(
  "LAB_READY_PILOT_95_PLAN.md",
  docs["LAB_READY_PILOT_95_PLAN.md"],
  "Final Completion Audit",
  "lab-ready pilot must define closure evidence",
);
requireIncludes(
  "NEXT_PRODUCT_WORK.md",
  docs["NEXT_PRODUCT_WORK.md"],
  "short live queue",
  "short queue role statement",
);
requireIncludes(
  "NEXT_REMAINING_PRODUCT_WORK.md",
  docs["NEXT_REMAINING_PRODUCT_WORK.md"],
  "not the canonical planning entry point",
  "execution backlog must not become a competing roadmap",
);
requireIncludes(
  "CLAUDE.md",
  docs["CLAUDE.md"],
  "It is not a second project roadmap",
  "compatibility entry point must not duplicate the roadmap",
);
requireIncludes(
  "AUTONOMOUS_WORKFLOW.md",
  docs["AUTONOMOUS_WORKFLOW.md"],
  "Stop Conditions",
  "continuation rules need explicit stopping criteria",
);
requireIncludes(
  "PRODUCT_SCOPE_GATE.md",
  docs["PRODUCT_SCOPE_GATE.md"],
  "Decision Packet",
  "scope gate must produce a bounded implementation decision",
);
for (const relativePath of [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  "AUTONOMOUS_WORKFLOW.md",
  "NEXT_PRODUCT_WORK.md",
]) {
  requireIncludes(
    relativePath,
    docs[relativePath],
    "PRODUCT_SCOPE_GATE.md",
    "project-level scope gate must stay discoverable",
  );
}
requireIncludes(
  "FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md",
  docs["FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md"],
  "Physical print validation is out of scope for this document",
  "physical-print deferral boundary",
);
requireIncludes(
  "BATCH_LABEL_PRINT_REFACTOR_PLAN.md",
  docs["BATCH_LABEL_PRINT_REFACTOR_PLAN.md"],
  "fixed-stock",
  "batch print contract must preserve one selected stock per batch",
);
requireIncludes(
  "BATCH_LABEL_PRINT_REFACTOR_PLAN.md",
  docs["BATCH_LABEL_PRINT_REFACTOR_PLAN.md"],
  "Quick ID",
  "batch plan must define purpose-first output modes",
);
requireIncludes(
  "BATCH_LABEL_PRINT_REFACTOR_PLAN.md",
  docs["BATCH_LABEL_PRINT_REFACTOR_PLAN.md"],
  "50-item",
  "batch plan must include the mixed batch QA target",
);
requireIncludes(
  "DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md",
  docs["DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md"],
  "issue-template option",
  "data governance must keep support-link schema compatibility visible",
);
requireIncludes(
  "SIMPLIFIED_LABEL_OUTPUT_MODEL.md",
  docs["SIMPLIFIED_LABEL_OUTPUT_MODEL.md"],
  "Complete labels support A4 and Letter",
  "simplified label model must preserve the three-output contract",
);
requireIncludes(
  "PRINT_LABEL_CONTRACT.md",
  docs["PRINT_LABEL_CONTRACT.md"],
  "GHS pictograms are never summarized",
  "print safety contract must keep pictogram non-omission visible",
);
requireIncludes(
  "BRANDED_UTILITY_STRATEGY.md",
  docs["BRANDED_UTILITY_STRATEGY.md"],
  "safety decision",
  "brand strategy must preserve the low-noise safety boundary",
);
requireIncludes(
  "SCIENTIFIC_AGENT_SKILLS_EVALUATION.md",
  docs["SCIENTIFIC_AGENT_SKILLS_EVALUATION.md"],
  "Do not install the full repository",
  "scientific skill evaluation must keep the install boundary visible",
);
requireIncludes(
  "CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md",
  docs["CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md"],
  "Dry-Run Output Contract",
  "candidate discovery must stay evidence-only before implementation",
);
requireIncludes(
  "CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md",
  docs["CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md"],
  "approved_for_public_use",
  "candidate discovery must preserve review-only output flags",
);

const allowedStatuses = new Set([
  "Open",
  "Planned",
  "In progress",
  "Gate added",
  "Shipped",
  "Monitoring",
  "Deferred",
]);
const futureDoc = docs["FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md"];
const statusPattern = /Status:\s*`([^`]+)`/g;
for (const match of futureDoc.matchAll(statusPattern)) {
  if (!allowedStatuses.has(match[1])) {
    failures.push(`Future tracker has unsupported status "${match[1]}".`);
  }
}

const trackingStatusPattern = /^\|[^|\n]+\|\s*`([^`]+)`\s*\|/gm;
for (const match of futureDoc.matchAll(trackingStatusPattern)) {
  if (!allowedStatuses.has(match[1])) {
    failures.push(`Future tracker table has unsupported status "${match[1]}".`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `docs drift OK: version ${expectedVersion}, ${Object.keys(docs).length} docs, ` +
    `${[...futureDoc.matchAll(statusPattern)].length} section statuses checked.`,
);
