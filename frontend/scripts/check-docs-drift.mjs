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

function requireNotIncludes(relativePath, text, needle, reason) {
  if (text.toLowerCase().includes(needle.toLowerCase())) {
    failures.push(`${relativePath} must not include "${needle}" (${reason}).`);
  }
}

function requireMaxLineCount(relativePath, text, maxLines, reason) {
  const lineCount = text.trimEnd().split(/\r?\n/).length;
  if (lineCount > maxLines) {
    failures.push(
      `${relativePath} has ${lineCount} lines; expected at most ${maxLines} (${reason}).`,
    );
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

// Maintainer planning documents live in docs/maintainers/. Only the files that
// carry drift-checked contracts are listed here; older checkpoints in
// docs/maintainers/history/ are still scanned by the encoding and stale-phrase
// checks below.
const maintainersDir = "docs/maintainers";
const maintainerDocNames = [
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  "POST_95_REPRIORITIZATION.md",
  "PILOT_OPERATIONS_READY_PLAN.md",
  "PILOT_RUNBOOK.md",
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  "LAB_READY_PILOT_95_PLAN.md",
  "PRODUCT_SCOPE_GATE.md",
  "AUTONOMOUS_WORKFLOW.md",
  "NEXT_PRODUCT_WORK.md",
  "NEXT_REMAINING_PRODUCT_WORK.md",
  "FUTURE_PRODUCT_TODO_AFTER_PRINT_DEFERRAL.md",
  "SIMPLIFIED_LABEL_OUTPUT_MODEL.md",
  "BATCH_LABEL_PRINT_REFACTOR_PLAN.md",
  "PHYSICAL_PRINT_VALIDATION_CHECKLIST.md",
  "SCIENTIFIC_AGENT_SKILLS_EVALUATION.md",
  "CANDIDATE_DISCOVERY_DRY_RUN_PLAN.md",
];

const docs = {
  "README.md": readText("README.md"),
  "AGENTS.md": readText("AGENTS.md"),
  "CLAUDE.md": readText("CLAUDE.md"),
  "docs/maintainers/README.md": readText(`${maintainersDir}/README.md`),
  ...Object.fromEntries(
    maintainerDocNames.map((name) => [name, readText(`${maintainersDir}/${name}`)]),
  ),
  "DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md": readText(
    "DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md",
  ),
  "PRINT_LABEL_CONTRACT.md": readText("PRINT_LABEL_CONTRACT.md"),
  "frontend/public/llms.txt": readText("frontend/public/llms.txt"),
};

// The repository root keeps only user-facing and safety-contract documents.
// Planning, status, and checkpoint documents belong in docs/maintainers/.
const allowedRootMarkdown = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "SECURITY.md",
  "PRINT_LABEL_CONTRACT.md",
  "DATA_GOVERNANCE_AND_SAFETY_BOUNDARIES.md",
]);
for (const fileName of fs.readdirSync(repoRoot)) {
  if (fileName.endsWith(".md") && !allowedRootMarkdown.has(fileName)) {
    failures.push(
      `${fileName} must live in ${maintainersDir}/ (the repository root only keeps user-facing and safety-contract documents).`,
    );
  }
}

function listMarkdown(relativeDir) {
  const dirPath = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(dirPath)) {
    failures.push(`Missing required directory: ${relativeDir}`);
    return [];
  }
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) return listMarkdown(entryPath);
    return entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

const rootMarkdownDocs = Object.fromEntries(
  [
    ...fs.readdirSync(repoRoot).filter((fileName) => fileName.endsWith(".md")),
    ...listMarkdown(maintainersDir),
  ].map((relativePath) => [relativePath, readText(relativePath)]),
);

// Relative Markdown links in the public entry documents must resolve.
for (const linkingDoc of ["README.md", "docs/CASE_STUDY.md", `${maintainersDir}/README.md`]) {
  const linkingText = readText(linkingDoc);
  for (const match of linkingText.matchAll(/\]\((?!https?:|mailto:|#)([^)\s#]+)(?:#[^)]*)?\)/g)) {
    const target = path.resolve(repoRoot, path.dirname(linkingDoc), match[1]);
    if (!fs.existsSync(target)) {
      failures.push(`${linkingDoc} links to a missing file: ${match[1]}`);
    }
  }
}

const frontendPackage = JSON.parse(fs.readFileSync(path.join(frontendRoot, "package.json"), "utf8"));
const ciWorkflow = readText(".github/workflows/ci.yml");
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

if (frontendPackage.scripts?.["qa:bundle-budget"] !== "node scripts/check-bundle-budget.mjs") {
  failures.push("frontend/package.json must keep qa:bundle-budget wired to check-bundle-budget.mjs.");
}

requireIncludes(
  ".github/workflows/ci.yml",
  ciWorkflow,
  "Check bundle budget",
  "CI must name the bundle budget gate explicitly",
);
requireIncludes(
  ".github/workflows/ci.yml",
  ciWorkflow,
  "npm run qa:bundle-budget",
  "CI must run the bundle budget gate after frontend build",
);

for (const [relativePath, text] of Object.entries(docs)) {
  if (relativePath === "PROJECT_STATUS_AND_NEXT_PLAN.md") continue;
  // CLAUDE.md only delegates to AGENTS.md, which carries the pointer.
  if (relativePath === "CLAUDE.md") continue;
  requireIncludes(
    relativePath,
    text,
    "PROJECT_STATUS_AND_NEXT_PLAN.md",
    "canonical planning entry point must stay discoverable",
  );
}

for (const [relativePath, text] of Object.entries(rootMarkdownDocs)) {
  for (const stalePhrase of [
    "active batch-first pilot target",
    "active batch-first target",
    "active batch-first owner doc",
    "active continuation target",
    "active major target",
    "active major owner doc",
    "active next target",
    "active owner-doc contracts",
    "active product contract",
    "active product simplification",
    "active short-term target",
    "current active target is",
    "current major target",
    "default active continuation targets",
    "priority order is a default",
    "still active / recurring",
    "use this as the active continuation target",
  ]) {
    requireNotIncludes(
      relativePath,
      text,
      stalePhrase,
      "completed work must stay shipped/monitoring or evidence-triggered, not an open active target",
    );
  }

  if (text.includes("\uFFFD")) {
    failures.push(
      `${relativePath} must not contain Unicode replacement characters (likely encoding damage).`,
    );
  }
  if (/[\uE000-\uF8FF]/u.test(text)) {
    failures.push(
      `${relativePath} must not contain private-use Unicode characters (likely mojibake).`,
    );
  }
  for (const mojibakeToken of ["蝺刻", "急??", "?", "摮"]) {
    requireNotIncludes(
      relativePath,
      text,
      mojibakeToken,
      "root markdown should not preserve known mojibake tokens",
    );
  }
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
  "shipped 95% evidence packet must stay discoverable from the canonical plan",
);
requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "POST_95_REPRIORITIZATION.md",
  "post-95 target selection must stay discoverable from the canonical plan",
);
requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "PILOT_OPERATIONS_READY_PLAN.md",
  "shipped pilot-operations target must stay discoverable from the canonical plan",
);
requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  "shipped short-term pilot evidence target must stay discoverable from the canonical plan",
);
requireIncludes(
  "PROJECT_STATUS_AND_NEXT_PLAN.md",
  docs["PROJECT_STATUS_AND_NEXT_PLAN.md"],
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  "shipped/monitoring batch-first owner doc must stay discoverable from the canonical plan",
);

requireMaxLineCount(
  "frontend/public/llms.txt",
  docs["frontend/public/llms.txt"],
  120,
  "agent guide should stay concise",
);
for (const [needle, reason] of [
  ["# GHS Label Quick Search", "guide title"],
  [
    "https://ghs-api.yuchelab.com/openapi.json",
    "agents should discover the authoritative OpenAPI document",
  ],
  [
    "https://ghs-api.yuchelab.com/api/agent/label-summary?q=64-17-5",
    "agents should discover the read-only label summary endpoint",
  ],
  ["agent_label_summary.v0", "guide should name the response contract"],
  ["read-only", "guide must state the no-write boundary"],
  ["no write endpoints", "guide must not imply agent write-back"],
  ["not approval", "guide must not imply approval authority"],
  ["SDS", "guide must preserve SDS authority"],
  ["supplier labels", "guide must preserve supplier-label authority"],
  ["local regulations", "guide must preserve local-rule authority"],
  ["unapproved candidate", "guide must exclude pending/candidate evidence"],
]) {
  requireIncludes("frontend/public/llms.txt", docs["frontend/public/llms.txt"], needle, reason);
}
requireIncludes(
  "POST_95_REPRIORITIZATION.md",
  docs["POST_95_REPRIORITIZATION.md"],
  "Small Pilot Observation And Operator Loop",
  "post-95 re-rank must keep the shipped target-selection evidence discoverable",
);
requireIncludes(
  "POST_95_REPRIORITIZATION.md",
  docs["POST_95_REPRIORITIZATION.md"],
  "PILOT_OPERATIONS_READY_PLAN.md",
  "post-95 re-rank must point to the shipped pilot-operations owner doc",
);
requireIncludes(
  "PILOT_OPERATIONS_READY_PLAN.md",
  docs["PILOT_OPERATIONS_READY_PLAN.md"],
  "Pilot Operations Ready",
  "pilot-operations target role statement",
);
requireIncludes(
  "PILOT_OPERATIONS_READY_PLAN.md",
  docs["PILOT_OPERATIONS_READY_PLAN.md"],
  "PILOT_RUNBOOK.md",
  "pilot-operations owner doc must point to the runbook",
);
requireIncludes(
  "PILOT_OPERATIONS_READY_PLAN.md",
  docs["PILOT_OPERATIONS_READY_PLAN.md"],
  "Completion Audit",
  "pilot-operations target must define closure evidence",
);
requireIncludes(
  "PILOT_RUNBOOK.md",
  docs["PILOT_RUNBOOK.md"],
  "Daily Operator Checklist",
  "pilot runbook must include daily operating checks",
);
requireIncludes(
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  docs["PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md"],
  "Pilot Evidence And Maintainability Pass",
  "shipped short-term evidence-pass role statement",
);
requireIncludes(
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  docs["PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md"],
  "Batch Export Usability",
  "short-term target must cover export usability",
);
requireIncludes(
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  docs["PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md"],
  "Maintainability Refactor Audit",
  "short-term target must cover maintainability boundaries",
);
requireIncludes(
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  docs["PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md"],
  "Completion Audit",
  "short-term target must define closure evidence",
);
requireIncludes(
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  docs["BATCH_FIRST_LAB_PILOT_V1_PLAN.md"],
  "Batch-First Lab Pilot v1",
  "batch-first owner doc role statement",
);
requireIncludes(
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  docs["BATCH_FIRST_LAB_PILOT_V1_PLAN.md"],
  "Batch Review Flow",
  "batch-first owner doc must cover batch review flow",
);
requireIncludes(
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  docs["BATCH_FIRST_LAB_PILOT_V1_PLAN.md"],
  "Batch Export v1",
  "batch-first owner doc must cover batch export",
);
requireIncludes(
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  docs["BATCH_FIRST_LAB_PILOT_V1_PLAN.md"],
  "Maintainability Slice",
  "batch-first owner doc must cover the bounded maintainability work",
);
requireIncludes(
  "NEXT_PRODUCT_WORK.md",
  docs["NEXT_PRODUCT_WORK.md"],
  "PILOT_OPERATIONS_READY_PLAN.md",
  "short queue must point to the shipped pilot-operations owner doc",
);
requireIncludes(
  "NEXT_PRODUCT_WORK.md",
  docs["NEXT_PRODUCT_WORK.md"],
  "PILOT_EVIDENCE_AND_MAINTAINABILITY_PASS.md",
  "short queue must point to the shipped short-term evidence doc",
);
requireIncludes(
  "NEXT_PRODUCT_WORK.md",
  docs["NEXT_PRODUCT_WORK.md"],
  "BATCH_FIRST_LAB_PILOT_V1_PLAN.md",
  "short queue must point to the shipped/monitoring batch-first owner doc",
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
  "NEXT_PRODUCT_WORK.md",
  docs["NEXT_PRODUCT_WORK.md"],
  "Open a new slice only when the evidence states",
  "live queue must require evidence before opening a new slice",
);
requireIncludes(
  "NEXT_PRODUCT_WORK.md",
  docs["NEXT_PRODUCT_WORK.md"],
  "It is not a standing backlog to work through",
  "live queue must not become a permanent backlog order",
);
requireIncludes(
  "NEXT_REMAINING_PRODUCT_WORK.md",
  docs["NEXT_REMAINING_PRODUCT_WORK.md"],
  "not the canonical planning entry point",
  "execution backlog must not become a competing roadmap",
);
requireIncludes(
  "NEXT_REMAINING_PRODUCT_WORK.md",
  docs["NEXT_REMAINING_PRODUCT_WORK.md"],
  "Do not work through this file linearly",
  "execution backlog must require an evidence-triggered slice",
);
requireIncludes(
  "CLAUDE.md",
  docs["CLAUDE.md"],
  "It is not a second project roadmap",
  "compatibility entry point must not duplicate the roadmap",
);
requireIncludes(
  "CLAUDE.md",
  docs["CLAUDE.md"],
  "AGENTS.md",
  "compatibility entry point must delegate to the agent bootstrap",
);
requireMaxLineCount(
  "CLAUDE.md",
  docs["CLAUDE.md"],
  10,
  "compatibility entry point should stay a pointer, not a second document",
);
requireIncludes(
  "AGENTS.md",
  docs["AGENTS.md"],
  "source, affected user job, expected",
  "agent bootstrap must explain evidence-triggered slice requirements",
);
requireIncludes(
  "AGENTS.md",
  docs["AGENTS.md"],
  "do not continue by backlog inertia",
  "agent bootstrap must prevent autonomous backlog drift",
);
requireMaxLineCount(
  "AGENTS.md",
  docs["AGENTS.md"],
  260,
  "agent bootstrap should stay concise and point to owner docs instead of duplicating history",
);
requireIncludes(
  "AUTONOMOUS_WORKFLOW.md",
  docs["AUTONOMOUS_WORKFLOW.md"],
  "Stop Conditions",
  "continuation rules need explicit stopping criteria",
);
requireIncludes(
  "AUTONOMOUS_WORKFLOW.md",
  docs["AUTONOMOUS_WORKFLOW.md"],
  "source, affected user job, expected proof",
  "autonomous continuation must use evidence-triggered slice requirements",
);
requireIncludes(
  "PRODUCT_SCOPE_GATE.md",
  docs["PRODUCT_SCOPE_GATE.md"],
  "Decision Packet",
  "scope gate must produce a bounded implementation decision",
);
for (const relativePath of [
  "AGENTS.md",
  "docs/maintainers/README.md",
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
  "SIMPLIFIED_LABEL_OUTPUT_MODEL.md",
  docs["SIMPLIFIED_LABEL_OUTPUT_MODEL.md"],
  "Direct CAS query hydration from URL params is now part of the product",
  "QR labels must stay connected to the deployed ?cas= lookup return path",
);
requireIncludes(
  "PRINT_LABEL_CONTRACT.md",
  docs["PRINT_LABEL_CONTRACT.md"],
  "GHS pictograms are never summarized",
  "print safety contract must keep pictogram non-omission visible",
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
