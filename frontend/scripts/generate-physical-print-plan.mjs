import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_REPORT_PATH = "build/print-qa-report.json";
const DEFAULT_MARKDOWN_PATH = "build/physical-print-validation-plan.md";
const DEFAULT_JSON_PATH = "build/physical-print-validation-plan.json";

const DEFAULT_PHYSICAL_CASE_IDS = Object.freeze([
  "a4-primary",
  "letter-primary",
  "ethylene-oxide-a4-primary-continuation",
  "bottle-supplemental-with-case",
  "large-primary-front-label",
  "tube-vial-quick-id-with-case",
  "medium-rack-quick-id",
  "brother-62mm-quick-id",
  "brother-62mm-qr-supplement",
  "prepared-bottle-supplemental",
  "prepared-tube-quick-id",
  "custom-tiny-complete-primary-blocked",
]);

const PHYSICAL_CASE_NOTES = Object.freeze({
  "a4-primary": {
    family: "A4 primary",
    purpose: "Complete primary reference output on A4 paper.",
    evidence:
      "Full primary label fits the selected A4 page with complete identity, signal, pictograms, and full H/P body.",
  },
  "letter-primary": {
    family: "Letter primary",
    purpose: "Complete primary reference output on Letter paper.",
    evidence:
      "Same complete-primary expectations as A4, with the browser and driver set to Letter.",
  },
  "ethylene-oxide-a4-primary-continuation": {
    family: "Continuation primary",
    purpose: "Dense complete-primary output that still needs continuation pages after A4 layout compaction.",
    evidence:
      "Every continuation page prints in order and repeats enough identity and pictogram context to stay usable.",
  },
  "bottle-supplemental-with-case": {
    family: "Standard bottle",
    purpose: "Bottle supplemental output with a selected case number.",
    evidence:
      "Case number, CAS, signal, and all pictograms remain visible without pretending the label is complete primary.",
  },
  "large-primary-front-label": {
    family: "Large front label",
    purpose: "Large container-facing supplemental/front label.",
    evidence:
      "Chemical identity and pictograms dominate the visual field; hazard summary remains secondary and unclipped.",
  },
  "tube-vial-quick-id-with-case": {
    family: "Tube/vial strip",
    purpose: "Small quick-ID label with a selected case number.",
    evidence:
      "Case number and CAS stay legible, and every pictogram remains recognizable on the physical strip.",
  },
  "medium-rack-quick-id": {
    family: "Rack label",
    purpose: "Rack-sized quick-ID output.",
    evidence:
      "Identity, CAS, signal, and pictograms stay readable at close bench distance.",
  },
  "brother-62mm-quick-id": {
    family: "62 mm continuous",
    purpose: "Continuous-roll quick-ID output.",
    evidence:
      "Roll output does not clip at either edge and pictograms remain large enough after driver scaling.",
  },
  "brother-62mm-qr-supplement": {
    family: "QR supplement",
    purpose: "Continuous-roll QR supplement.",
    evidence:
      "QR scans quickly while GHS pictograms remain present and visually secondary to the QR only where appropriate.",
  },
  "prepared-bottle-supplemental": {
    family: "Prepared solution",
    purpose: "Prepared-solution bottle supplemental output.",
    evidence:
      "Parent identity, prepared concentration/solvent context, and all pictograms remain visible on paper.",
  },
  "prepared-tube-quick-id": {
    family: "Prepared solution",
    purpose: "Prepared-solution small quick-ID output.",
    evidence:
      "Prepared metadata does not push out CAS, case identity, signal, or pictograms.",
  },
  "custom-tiny-complete-primary-blocked": {
    family: "Blocked negative control",
    purpose: "Too-small complete-primary attempt that must not be printable.",
    evidence:
      "Browser workflow blocks printing and routes the user to a larger complete-primary stock.",
  },
});

const CHECKLIST_BY_KIND = Object.freeze({
  "complete-primary": [
    "Full label boundary is inside the physical page or die cut.",
    "Identity, CAS, signal word, every pictogram, and H/P body are visible.",
    "No QR code is inserted into the required complete-primary body.",
    "Continuation pages, when present, print in order and preserve identity context.",
  ],
  supplemental: [
    "Output is visibly supplemental and not described as a complete primary label.",
    "Identity, CAS or selected case field, signal word, and every pictogram are visible.",
    "Hazard summary stays readable without overlapping pictograms or the label border.",
    "User would still know to use an SDS, primary label, or local rule for complete details.",
  ],
  "quick-id": [
    "Output is visibly a quick-ID label and not described as complete primary.",
    "Chemical identity, CAS or selected case field, signal word, and every pictogram are visible.",
    "Pictograms are recognizable at close handling distance.",
    "No text or chip crosses the physical edge or die cut.",
  ],
  "qr-supplement": [
    "Output is visibly a QR supplement and not described as complete primary.",
    "QR scans quickly from normal handling distance or close bench distance.",
    "QR destination is http(s) and points to the expected SDS/detail/reference path.",
    "QR does not replace, hide, or crop required GHS pictograms.",
  ],
});

const env = process.env;

const sourceReportPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_REPORT_PATH || DEFAULT_REPORT_PATH,
);
const markdownOutputPath = path.resolve(
  process.cwd(),
  env.PHYSICAL_PRINT_PLAN_PATH || DEFAULT_MARKDOWN_PATH,
);
const jsonOutputPath = path.resolve(
  process.cwd(),
  env.PHYSICAL_PRINT_PLAN_JSON_PATH || DEFAULT_JSON_PATH,
);

const normalizeList = (value) =>
  Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];

const toSentence = (items) => {
  const list = normalizeList(items);
  return list.length > 0 ? list.join(", ") : "none";
};

const tableCell = (value) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();

const getGitCommit = () => {
  if (env.GITHUB_SHA) return env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: path.resolve(process.cwd(), ".."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

const readReport = () => {
  if (!fs.existsSync(sourceReportPath)) {
    throw new Error(
      [
        `Missing print QA report: ${sourceReportPath}`,
        "Run PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report before generating the physical print plan.",
      ].join(os.EOL),
    );
  }
  return JSON.parse(fs.readFileSync(sourceReportPath, "utf8"));
};

const resolveRequestedCaseIds = (report) => {
  const requested = String(env.PHYSICAL_PRINT_CASES || "").trim();
  if (requested.toLowerCase() === "all") {
    return report.cases.map((testCase) => testCase.id);
  }
  if (requested) {
    return requested
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_PHYSICAL_CASE_IDS];
};

const buildSteps = (browserCase) =>
  (Array.isArray(browserCase?.steps) ? browserCase.steps : []).map((step) => {
    if (!step || typeof step !== "object") return String(step);
    switch (step.action) {
      case "open":
        return `Open ${step.url}`;
      case "search":
        return `Search for ${step.value}`;
      case "selectFirstResult":
        return "Select the first result.";
      case "openPrintModal":
        return "Open the print modal.";
      case "selectTarget":
        return `Select target ${step.value}.`;
      case "selectStock":
        return `Select stock ${step.value}.`;
      case "setCustomField":
        return `Set ${step.key} to ${step.value}.`;
      case "clickPrint":
        return "Click the print action.";
      case "assertQaStatus":
        return `Confirm QA status element ${step.elementId}.`;
      default:
        return `${step.action}: ${step.value || step.key || ""}`.trim();
    }
  });

const roleLabel = (labelKind) => {
  switch (labelKind) {
    case "complete-primary":
      return "complete primary";
    case "qr-supplement":
      return "QR supplement";
    case "quick-id":
      return "quick-ID";
    case "supplemental":
      return "supplemental";
    default:
      return labelKind || "unknown";
  }
};

const physicalAction = (testCase) =>
  testCase.expectedCanPrint === false || testCase.expected?.canPrint === false
    ? "Do not print. Verify that the app blocks handoff and recommends a larger complete-primary stock."
    : "Print on the matching physical stock after confirming browser print settings.";

const buildCaseArtifact = (testCase, browserCase = null) => {
  const expectation = testCase.handoffExpectation || {};
  const expected = testCase.expected || {};
  const note = PHYSICAL_CASE_NOTES[testCase.id] || {};
  const labelKind =
    browserCase?.expectedLabelKind ||
    expectation.labelKind ||
    expected.labelKind ||
    testCase.actual?.labelKind ||
    "";
  const stockFit =
    browserCase?.stockFit || expectation.stockFit || testCase.actual?.stockFit || {};
  const pageSize =
    browserCase?.expectedPageSize || expectation.pageSize || stockFit.pageSize || "";
  const widthMm =
    browserCase?.expectedLabelWidthMm ??
    expectation.labelWidthMm ??
    stockFit.labelWidthMm ??
    "";
  const heightMm =
    browserCase?.expectedLabelHeightMm ??
    expectation.labelHeightMm ??
    stockFit.labelHeightMm ??
    "";
  const pictograms =
    browserCase?.expectedPictograms ||
    expectation.pictogramCodes ||
    testCase.chemical?.expectedPictograms ||
    [];
  const requiredIdentityTexts = [
    ...normalizeList(browserCase?.expectedRequiredIdentityTexts),
    browserCase?.expectedRequiredIdentityText,
    expectation.requiredIdentityText,
  ].filter(Boolean);

  return {
    id: testCase.id,
    label: testCase.label,
    family: note.family || stockFit.stockFamily || "",
    purpose: note.purpose || "",
    evidenceTarget: note.evidence || "",
    searchTerm: browserCase?.searchTerm || testCase.chemical?.cas || "",
    chemicalName: testCase.chemical?.name || "",
    labelKind,
    role: roleLabel(labelKind),
    status: expectation.status || browserCase?.expectedStatus || "",
    expectedCanPrint: browserCase?.expectedCanPrint ?? (expected.canPrint !== false),
    stockPreset:
      browserCase?.expectedStockPreset ||
      expectation.stockPreset ||
      expected.stockPreset ||
      "",
    template:
      browserCase?.expectedTemplate || expectation.template || expected.template || "",
    pageSize,
    orientation:
      stockFit.labelWidthMm && stockFit.labelHeightMm
        ? Number(stockFit.labelWidthMm) >= Number(stockFit.labelHeightMm)
          ? "landscape"
          : "portrait"
        : "",
    labelSizeMm: {
      width: widthMm,
      height: heightMm,
    },
    colorMode: browserCase?.expectedColorMode || expectation.colorMode || "",
    nameDisplay: browserCase?.expectedNameDisplay || expectation.nameDisplay || "",
    pictograms: normalizeList(pictograms),
    casNumbers:
      browserCase?.expectedCasNumbers || expectation.casNumbers || [testCase.chemical?.cas].filter(Boolean),
    requiresQr: Boolean(browserCase?.expectedHasQr ?? expectation.hasQr),
    expectedMinPictogramSidePx:
      browserCase?.expectedPrintMinPictogramSidePx ??
      expectation.expectedPrintMinPictogramSidePx ??
      stockFit.expectedPrintMinPictogramSidePx ??
      0,
    expectedMinQrSidePx:
      browserCase?.expectedPrintMinQrSidePx ??
      expectation.expectedPrintMinQrSidePx ??
      stockFit.expectedPrintMinQrSidePx ??
      0,
    expectedTotalLabels:
      browserCase?.expectedMinTotalLabels || expectation.totalLabels || 1,
    expectedTotalPages:
      browserCase?.expectedMinTotalPages || expectation.totalPages || 1,
    customLabelFields: browserCase?.customLabelFields || {},
    requiredIdentityTexts,
    forbiddenIdentityTexts: normalizeList(browserCase?.expectedForbiddenIdentityTexts),
    physicalAction: physicalAction({
      ...testCase,
      expectedCanPrint: browserCase?.expectedCanPrint,
    }),
    browserSteps: buildSteps(browserCase),
    physicalChecks: [
      "Browser print scale is 100% or Actual size unless the driver cannot support it.",
      "Headers and footers are off.",
      "Background graphics are on.",
      "Paper size and orientation match the app stock.",
      "No visible element crosses the label boundary or die cut.",
      "No content is lost to printer margins.",
      ...(CHECKLIST_BY_KIND[labelKind] || []),
    ],
  };
};

const buildMarkdown = (artifact) => {
  const lines = [
    "# Physical Print Validation Plan",
    "",
    "Generated from the automated print QA matrix. Use this artifact as the physical-print work order after automated Browser/PDF/production gates pass.",
    "",
    "This is not a legal compliance certificate. Final use still requires SDS, supplier-label, and local-regulation review.",
    "",
    "## Source",
    "",
    `- Generated at: ${artifact.generatedAt}`,
    `- Commit: ${artifact.commit || "unknown"}`,
    `- Source print QA report: ${artifact.sourceReportPath}`,
    `- Source report generated at: ${artifact.sourceReportGeneratedAt || "unknown"}`,
    `- Production URL: ${artifact.productionUrl || "unknown"}`,
    `- QA handoff URL: ${artifact.qaHandoffUrl || "unknown"}`,
    `- Automated summary: ${artifact.sourceSummary.passed}/${artifact.sourceSummary.total} passed`,
    "",
    "## Required Preflight",
    "",
    "- `npm run test:print-contract`",
    "- `PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report`",
    "- `npm run qa:print-pdf`",
    "- `npm run qa:production-product` for production-facing print changes after deploy",
    "- `npm run qa:physical-print-plan` to regenerate this file from the current matrix report",
    "",
    "## Physical Print Setup",
    "",
    "- Record browser, OS, printer, driver, paper or label stock, orientation, scale, margins, background graphics, color mode, and whether the driver auto-scaled.",
    "- Use 100% / Actual size where available.",
    "- Turn headers and footers off.",
    "- Match browser paper size and orientation to the selected app stock.",
    "- Fail any output where GHS pictograms, identity, CAS/case field, signal word, QR, or label boundary is clipped.",
    "",
    "## Case Summary",
    "",
    "| Case | Family | Role | Stock | Size | Page | Chemical | Pictograms | QR | Action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const testCase of artifact.cases) {
    lines.push(
      [
        testCase.id,
        testCase.family,
        testCase.role,
        testCase.stockPreset,
        `${testCase.labelSizeMm.width} x ${testCase.labelSizeMm.height} mm`,
        testCase.pageSize,
        `${testCase.chemicalName} (${testCase.searchTerm})`,
        toSentence(testCase.pictograms),
        testCase.requiresQr ? "yes" : "no",
        testCase.expectedCanPrint === false ? "block only" : "print",
      ]
        .map(tableCell)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |"),
    );
  }

  lines.push("", "## Per-Case Evidence Forms", "");

  artifact.cases.forEach((testCase, index) => {
    lines.push(
      `### ${index + 1}. ${testCase.label} (\`${testCase.id}\`)`,
      "",
      `- Family: ${testCase.family || "unknown"}`,
      `- Purpose: ${testCase.purpose || "not specified"}`,
      `- Evidence target: ${testCase.evidenceTarget || "not specified"}`,
      `- Search term: ${testCase.searchTerm}`,
      `- Output role: ${testCase.role}`,
      `- Stock/template: ${testCase.stockPreset} / ${testCase.template}`,
      `- Physical size: ${testCase.labelSizeMm.width} x ${testCase.labelSizeMm.height} mm on ${testCase.pageSize}`,
      `- Orientation expectation: ${testCase.orientation || "record actual"}`,
      `- Color/name mode: ${testCase.colorMode || "record actual"} / ${testCase.nameDisplay || "record actual"}`,
      `- Expected pictograms: ${toSentence(testCase.pictograms)}`,
      `- Expected CAS: ${toSentence(testCase.casNumbers)}`,
      `- Expected selected identity: ${toSentence(testCase.requiredIdentityTexts)}`,
      `- Forbidden identity text: ${toSentence(testCase.forbiddenIdentityTexts)}`,
      `- Minimum print pictogram side: ${testCase.expectedMinPictogramSidePx}px`,
      `- Minimum print QR side: ${testCase.expectedMinQrSidePx}px`,
      `- Expected labels/pages: ${testCase.expectedTotalLabels} / ${testCase.expectedTotalPages}`,
      `- Physical action: ${testCase.physicalAction}`,
      "",
      "Browser steps:",
      "",
    );

    if (testCase.browserSteps.length > 0) {
      testCase.browserSteps.forEach((step, stepIndex) => {
        lines.push(`${stepIndex + 1}. ${step}`);
      });
    } else {
      lines.push("1. Recreate this case from the matching production print target and stock preset.");
    }

    lines.push("", "Physical checks:", "");
    testCase.physicalChecks.forEach((check) => {
      lines.push(`- [ ] ${check}`);
    });

    lines.push(
      "",
      "Result:",
      "",
      "```text",
      "Result: PASS / FAIL",
      "Browser / OS:",
      "Printer / driver:",
      "Paper or label stock:",
      "Browser print settings:",
      "Driver scaling:",
      "Observed identity:",
      "Observed CAS / case:",
      "Observed signal word:",
      "Observed GHS pictograms:",
      "Observed H/P text or summary:",
      "Observed QR scan:",
      "Observed label boundary:",
      "Failure class:",
      "Photo or artifact path:",
      "Follow-up:",
      "Automated regression added:",
      "```",
      "",
    );
  });

  lines.push(
    "## Failure Classification",
    "",
    "Use exactly one primary class, then add secondary notes if needed:",
    "",
    "- App renderer/layout issue.",
    "- Browser print setting issue.",
    "- Printer driver scaling issue.",
    "- Stock/media mismatch.",
    "- QR destination or scan issue.",
    "- Data/content issue.",
    "",
    "Repeated app-renderer failures should become print QA matrix cases, PDF artifact checks, production handoff assertions, or focused unit tests.",
    "",
  );

  return `${lines.join(os.EOL)}${os.EOL}`;
};

const report = readReport();
const failedCount = Number(report.summary?.failed || 0);
if (failedCount > 0 && env.PHYSICAL_PRINT_ALLOW_FAILED_REPORT !== "1") {
  throw new Error(
    `Refusing to generate a physical print plan from a failing print QA report (${failedCount} failed cases).`,
  );
}

const casesById = new Map((report.cases || []).map((testCase) => [testCase.id, testCase]));
const browserCasesById = new Map(
  (report.productionBrowserQa?.cases || []).map((testCase) => [testCase.id, testCase]),
);
const requestedCaseIds = resolveRequestedCaseIds(report);
const missingCaseIds = requestedCaseIds.filter((id) => !casesById.has(id));
if (missingCaseIds.length > 0) {
  throw new Error(`Unknown physical print case id(s): ${missingCaseIds.join(", ")}`);
}

const generatedAt = new Date().toISOString();
const cases = requestedCaseIds.map((id) =>
  buildCaseArtifact(casesById.get(id), browserCasesById.get(id) || null),
);

const artifact = {
  schemaVersion: 1,
  generatedAt,
  commit: getGitCommit(),
  sourceReportPath,
  sourceReportGeneratedAt: report.generatedAt || "",
  productionUrl: report.productionBrowserQa?.targetUrl || "",
  qaHandoffUrl: report.productionBrowserQa?.qaHandoffUrl || "",
  sourceSummary: {
    total: Number(report.summary?.total || 0),
    passed: Number(report.summary?.passed || 0),
    failed: failedCount,
  },
  selectedCaseIds: requestedCaseIds,
  cases,
};

fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true });
fs.writeFileSync(jsonOutputPath, `${JSON.stringify(artifact, null, 2)}${os.EOL}`);
fs.writeFileSync(markdownOutputPath, buildMarkdown(artifact));

console.log(
  JSON.stringify(
    {
      ok: true,
      markdownOutputPath,
      jsonOutputPath,
      cases: artifact.cases.length,
      sourceReportPath,
    },
    null,
    2,
  ),
);
