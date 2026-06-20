import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = process.env;
const repo = env.GITHUB_RESOURCE_REPO || "rjsky311/GHS-label-quick-search";
const outputPath = path.resolve(
  process.cwd(),
  env.GITHUB_RESOURCE_REPORT_PATH || "build/github-resource-report.json",
);

const kib = 1024;
const mib = kib * kib;
const thresholds = {
  repoDiskKiB: Number(env.GITHUB_RESOURCE_MAX_REPO_DISK_KIB || 100 * kib),
  artifactsBytes: Number(env.GITHUB_RESOURCE_MAX_ARTIFACT_BYTES || 1024 * mib),
  cachesBytes: Number(env.GITHUB_RESOURCE_MAX_CACHE_BYTES || 1024 * mib),
};
const expectedVisibility = String(env.GITHUB_RESOURCE_EXPECTED_VISIBILITY || "PUBLIC")
  .trim()
  .toUpperCase();

const runGhJson = (args) => {
  try {
    const raw = execFileSync("gh", args, {
      encoding: "utf8",
      maxBuffer: 32 * mib,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw);
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : "";
    throw new Error(
      [
        `Failed to run gh ${args.join(" ")}`,
        stderr.trim() || error?.message || String(error),
      ]
        .filter(Boolean)
        .join(": "),
    );
  }
};

const collectPages = (endpoint, listKey) => {
  const pages = runGhJson(["api", endpoint, "--paginate", "--slurp"]);
  return pages.flatMap((page) => (Array.isArray(page?.[listKey]) ? page[listKey] : []));
};

const sum = (items, selector) =>
  items.reduce((total, item) => total + Number(selector(item) || 0), 0);

const bytesLabel = (bytes) => `${(Number(bytes || 0) / mib).toFixed(2)} MiB`;
const kibLabel = (value) => `${(Number(value || 0) / kib).toFixed(2)} MiB`;

const repoInfo = runGhJson([
  "repo",
  "view",
  repo,
  "--json",
  "nameWithOwner,visibility,isPrivate,diskUsage,defaultBranchRef",
]);

const artifacts = collectPages(`repos/${repo}/actions/artifacts`, "artifacts");
const caches = collectPages(`repos/${repo}/actions/caches`, "actions_caches");

const activeArtifacts = artifacts.filter((artifact) => !artifact.expired);
const expiredArtifacts = artifacts.filter((artifact) => artifact.expired);
const artifactBytes = sum(artifacts, (artifact) => artifact.size_in_bytes);
const activeArtifactBytes = sum(activeArtifacts, (artifact) => artifact.size_in_bytes);
const expiredArtifactBytes = sum(expiredArtifacts, (artifact) => artifact.size_in_bytes);
const cacheBytes = sum(caches, (cache) => cache.size_in_bytes);

const largestArtifacts = [...artifacts]
  .sort((left, right) => Number(right.size_in_bytes || 0) - Number(left.size_in_bytes || 0))
  .slice(0, 10)
  .map((artifact) => ({
    name: artifact.name,
    sizeInBytes: artifact.size_in_bytes,
    size: bytesLabel(artifact.size_in_bytes),
    expired: Boolean(artifact.expired),
    createdAt: artifact.created_at,
  }));

const largestCaches = [...caches]
  .sort((left, right) => Number(right.size_in_bytes || 0) - Number(left.size_in_bytes || 0))
  .slice(0, 10)
  .map((cache) => ({
    key: cache.key,
    ref: cache.ref,
    sizeInBytes: cache.size_in_bytes,
    size: bytesLabel(cache.size_in_bytes),
    lastAccessedAt: cache.last_accessed_at,
  }));

const failures = [];
const warnings = [];

if (repoInfo.diskUsage > thresholds.repoDiskKiB) {
  failures.push(
    `Repository disk usage ${kibLabel(repoInfo.diskUsage)} exceeds ${kibLabel(
      thresholds.repoDiskKiB,
    )}.`,
  );
}

if (artifactBytes > thresholds.artifactsBytes) {
  failures.push(
    `Actions artifacts ${bytesLabel(artifactBytes)} exceed ${bytesLabel(
      thresholds.artifactsBytes,
    )}.`,
  );
}

if (cacheBytes > thresholds.cachesBytes) {
  failures.push(
    `Actions caches ${bytesLabel(cacheBytes)} exceed ${bytesLabel(
      thresholds.cachesBytes,
    )}.`,
  );
}

if (expectedVisibility && repoInfo.visibility !== expectedVisibility) {
  failures.push(
    `Repository visibility is ${repoInfo.visibility}; expected ${expectedVisibility}.`,
  );
}

if (expiredArtifactBytes > 0) {
  warnings.push(
    `GitHub still lists ${bytesLabel(expiredArtifactBytes)} of expired artifacts; delete them first if storage cleanup becomes necessary.`,
  );
}

const report = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  repo,
  reportPath: outputPath,
  thresholds,
  expectedVisibility: expectedVisibility || null,
  repoInfo,
  artifacts: {
    count: artifacts.length,
    activeCount: activeArtifacts.length,
    expiredCount: expiredArtifacts.length,
    totalBytes: artifactBytes,
    total: bytesLabel(artifactBytes),
    activeBytes: activeArtifactBytes,
    active: bytesLabel(activeArtifactBytes),
    expiredBytes: expiredArtifactBytes,
    expired: bytesLabel(expiredArtifactBytes),
    largest: largestArtifacts,
  },
  caches: {
    count: caches.length,
    totalBytes: cacheBytes,
    total: bytesLabel(cacheBytes),
    largest: largestCaches,
  },
  warnings,
  failures,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}${os.EOL}`);

console.log(
  JSON.stringify(
    {
      ok: report.ok,
      repo: report.repo,
      visibility: report.repoInfo.visibility,
      repoDiskUsage: kibLabel(report.repoInfo.diskUsage),
      artifacts: report.artifacts.total,
      activeArtifacts: report.artifacts.active,
      expiredArtifacts: report.artifacts.expired,
      caches: report.caches.total,
      warnings: report.warnings,
      failures: report.failures,
      reportPath: report.reportPath,
    },
    null,
    2,
  ),
);

if (!report.ok) {
  process.exitCode = 1;
}
