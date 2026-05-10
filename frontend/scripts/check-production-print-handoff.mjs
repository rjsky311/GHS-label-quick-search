import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_REPORT_PATH = "build/print-qa-report.json";
const DEFAULT_SEARCH_TERM = "7647-01-0";
const PREVIEW_GEOMETRY_TOLERANCE_PX = 2;
const STATUS_ATTRIBUTES = [
  "data-status",
  "data-label-kind",
  "data-pictograms",
  "data-has-qr",
  "data-cas-numbers",
  "data-has-cas",
  "data-label-width-mm",
  "data-label-height-mm",
  "data-page-size",
  "data-color-mode",
  "data-name-display",
  "data-template",
  "data-stock-preset",
  "data-issue-types",
  "data-support-chips",
];

const env = process.env;
const reportPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_REPORT_PATH || DEFAULT_REPORT_PATH,
);
const productionUrl = env.PRINT_QA_PRODUCTION_URL || "";
const headless = env.PRINT_QA_HEADLESS !== "0";
const screenshotDir = env.PRINT_QA_SCREENSHOT_DIR
  ? path.resolve(process.cwd(), env.PRINT_QA_SCREENSHOT_DIR)
  : "";
const outputPath = env.PRINT_QA_HANDOFF_REPORT_PATH
  ? path.resolve(process.cwd(), env.PRINT_QA_HANDOFF_REPORT_PATH)
  : "";

const maybeJson = (value) => JSON.stringify(value, null, 2);

const commonChromePaths = () => {
  if (process.platform === "win32") {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  }
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ];
};

const resolveChromeExecutable = () => {
  const explicit =
    env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
    env.CHROME_EXECUTABLE_PATH ||
    env.PLAYWRIGHT_EXECUTABLE_PATH;
  const candidates = explicit ? [explicit] : commonChromePaths();
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      [
        "Could not find a local Chrome/Edge executable for production handoff QA.",
        "Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH to the browser executable path.",
      ].join(" "),
    );
  }
  return found;
};

const readReport = () => {
  if (!fs.existsSync(reportPath)) {
    throw new Error(
      [
        `Missing print QA report: ${reportPath}`,
        "Generate it first with:",
        "PRINT_QA_REPORT_PATH=build/print-qa-report.json npm run qa:print-report",
      ].join("\n"),
    );
  }
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
};

const parseRequestedCaseIds = () => {
  const raw = (env.PRINT_QA_CASES || "").trim();
  if (!raw) return null;
  if (raw.toLowerCase() === "all") return "all";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

const selectCases = (cases) => {
  const requested = parseRequestedCaseIds();
  if (requested === "all") {
    return cases.filter((testCase) => !/^QA-/.test(testCase.searchTerm || ""));
  }
  if (Array.isArray(requested)) {
    const wanted = new Set(requested);
    return cases.filter((testCase) => wanted.has(testCase.id));
  }
  const searchTerm = env.PRINT_QA_SEARCH_TERM || DEFAULT_SEARCH_TERM;
  return cases.filter((testCase) => testCase.searchTerm === searchTerm);
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("qaPrintHandoff", "1");
  nextUrl.searchParams.set("productionPrintQa", Date.now().toString());
  return nextUrl.toString();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sameNumber = (actual, expected) => {
  const actualNumber = Number.parseFloat(actual);
  const expectedNumber = Number.parseFloat(expected);
  return (
    Number.isFinite(actualNumber) &&
    Number.isFinite(expectedNumber) &&
    Math.abs(actualNumber - expectedNumber) < 0.05
  );
};

const normalizeBool = (value) => String(Boolean(value));

const getAttributeMap = async (locator, attributes) => {
  const result = {};
  for (const attribute of attributes) {
    result[attribute] = await locator.getAttribute(attribute);
  }
  return result;
};

const ensureDetailsOpen = async (page, testId) => {
  const details = page.locator(`details[data-testid="${testId}"]`);
  if ((await details.count()) === 0) return;
  await details.first().evaluate((node) => {
    node.open = true;
  });
};

const fillSearch = async (page, searchTerm) => {
  const searchInput = page.locator('input[role="combobox"], input[type="text"]').first();
  await searchInput.fill(searchTerm);
  const searchButton = page.getByTestId("single-search-btn");
  await searchButton.click();
  await page.locator('input[type="checkbox"]').first().waitFor({
    state: "visible",
    timeout: 20000,
  });
};

const openPrintModal = async (page) => {
  const checkbox = page.locator('input[type="checkbox"]').first();
  await checkbox.check();
  await page.getByTestId("print-all-with-ghs-btn").click();
  await page.locator('[role="dialog"]').waitFor({
    state: "visible",
    timeout: 15000,
  });
};

const setTargetAndStock = async (page, testCase) => {
  await page.getByTestId(`label-purpose-${testCase.targetOption}`).click();
  await sleep(250);
  await ensureDetailsOpen(page, testCase.selectors.stockPickerTestId);
  await ensureDetailsOpen(page, "secondary-output-size-controls");
  await page.getByTestId(testCase.selectors.stockButtonTestId).click();
  await sleep(500);
};

const setCustomFields = async (page, testCase) => {
  const entries = Object.entries(testCase.customLabelFields || {});
  if (entries.length === 0) return;
  await ensureDetailsOpen(page, testCase.selectors.advancedOptionsTestId);
  await ensureDetailsOpen(page, "advanced-custom-fields");
  for (const [key, value] of entries) {
    await page.getByTestId(`${testCase.selectors.customFieldPrefixTestId}${key}`).fill(value);
  }
  await sleep(500);
};

const fillResponsibleProfile = async (page, responsibleProfile = {}) => {
  const entries = Object.entries({
    organization: responsibleProfile.organization || "",
    phone: responsibleProfile.phone || "",
    address: responsibleProfile.address || "",
  }).filter(([, value]) => value);
  if (entries.length === 0) return;
  await ensureDetailsOpen(page, "responsible-profile-controls");
  for (const [key, value] of entries) {
    await page.getByTestId(`responsible-profile-field-${key}`).fill(value);
  }
  await sleep(500);
};

const inspectPreviewFrame = async (page, testCase) => {
  const iframeHandle = await page
    .getByTestId("label-fragment-preview")
    .elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (!frame) {
    throw new Error("Could not resolve label preview iframe.");
  }

  return frame.evaluate(
    ({
      expectedCasNumbers,
      expectedPictograms,
      expectedHasQr,
      expectedRequiredIdentityText,
      geometryTolerancePx,
    }) => {
      const round = (value) => Math.round(value * 100) / 100;
      const rectToObject = (rect) => ({
        left: round(rect.left),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        width: round(rect.width),
        height: round(rect.height),
      });
      const hasVisibleArea = (rect) => rect.width > 0 && rect.height > 0;
      const containsRect = (outer, inner, tolerance = 0) =>
        inner.left >= outer.left - tolerance &&
        inner.top >= outer.top - tolerance &&
        inner.right <= outer.right + tolerance &&
        inner.bottom <= outer.bottom + tolerance;
      const unique = (values) => Array.from(new Set(values));
      const visibleText = (node) =>
        (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
      const selectorItems = (selector, type) =>
        Array.from(document.querySelectorAll(selector)).map((element, index) => ({
          element,
          type,
          key:
            element.getAttribute("data-code") ||
            element.getAttribute("alt") ||
            element.textContent?.trim() ||
            `${type}-${index + 1}`,
        }));
      const label = document.querySelector(".label");
      const labelRect = label?.getBoundingClientRect();
      const viewportWidth =
        document.documentElement.clientWidth || window.innerWidth || 0;
      const viewportHeight =
        document.documentElement.clientHeight || window.innerHeight || 0;
      const viewportRect = {
        left: 0,
        top: 0,
        right: viewportWidth,
        bottom: viewportHeight,
        width: viewportWidth,
        height: viewportHeight,
      };
      const frameText = visibleText(document.body);
      const pictogramImages = Array.from(document.querySelectorAll("img"))
        .map((img, index) => ({
          element: img,
          alt: img.getAttribute("alt") || img.alt || "",
          key: img.getAttribute("alt") || img.alt || `pictogram-${index + 1}`,
        }))
        .filter(({ alt }) => /^GHS\d{2}$/i.test(alt));
      const qrImages = selectorItems(".qrcode-img", "qr");
      const supportChips = selectorItems(".support-chip", "support-chip");
      const casNodes = Array.from(
        document.querySelectorAll(
          ".cas, .meta-chip-cas, .meta-chip-cas .meta-chip-value",
        ),
      ).filter(
        (element) =>
          visibleText(element).includes("CAS") ||
          expectedCasNumbers.some((cas) => visibleText(element).includes(cas)),
      );
      const criticalItems = [
        ...pictogramImages.map(({ element, key }) => ({
          element,
          type: "pictogram",
          key,
        })),
        ...qrImages,
        ...supportChips,
        ...casNodes.slice(0, 3).map((element, index) => ({
          element,
          type: "cas",
          key: `cas-${index + 1}`,
        })),
      ];
      const clippedCriticalElements = unique(
        criticalItems
          .map(({ element, type, key }) => {
            const rect = element.getBoundingClientRect();
            const visible = hasVisibleArea(rect);
            const withinLabel = labelRect
              ? containsRect(labelRect, rect, geometryTolerancePx)
              : false;
            const withinViewport = containsRect(
              viewportRect,
              rect,
              geometryTolerancePx,
            );
            if (visible && withinLabel && withinViewport) {
              return null;
            }
            return JSON.stringify({
              type,
              key,
              visible,
              withinLabel,
              withinViewport,
              rect: rectToObject(rect),
            });
          })
          .filter(Boolean),
      ).map((item) => JSON.parse(item));
      const labelClass = label?.className || "";
      const labelKind = labelClass.includes("label-kind-complete-primary")
        ? "complete-primary"
        : labelClass.includes("label-kind-qr-supplement")
          ? "qr-supplement"
          : labelClass.includes("label-kind-quick-id")
            ? "quick-id"
            : labelClass.includes("label-kind-supplemental")
              ? "supplemental"
              : "";

      return {
        labelKind,
        labelClass,
        frameTextSample: frameText.slice(0, 500),
        pictogramCodes: unique(
          pictogramImages.map(({ alt }) => alt.toUpperCase()),
        ).sort(),
        hasQrImage: qrImages.length > 0,
        hasCas: expectedCasNumbers.every((cas) => frameText.includes(cas)),
        hasRequiredIdentityText:
          !expectedRequiredIdentityText ||
          frameText.includes(expectedRequiredIdentityText),
        expectedHasQr,
        expectedPictograms,
        labelVisible: Boolean(labelRect && hasVisibleArea(labelRect)),
        labelWithinViewport: labelRect
          ? containsRect(viewportRect, labelRect, geometryTolerancePx)
          : false,
        documentHasScrollOverflow:
          document.documentElement.scrollWidth >
            document.documentElement.clientWidth + geometryTolerancePx ||
          document.documentElement.scrollHeight >
            document.documentElement.clientHeight + geometryTolerancePx,
        clippedCriticalElements,
        geometry: {
          viewport: rectToObject(viewportRect),
          label: labelRect ? rectToObject(labelRect) : null,
        },
        counts: {
          pictograms: pictogramImages.length,
          qrImages: qrImages.length,
          supportChips: supportChips.length,
          casNodes: casNodes.length,
        },
      };
    },
    {
      expectedCasNumbers: testCase.expectedCasNumbers || [],
      expectedPictograms: testCase.expectedPictograms || [],
      expectedHasQr: Boolean(testCase.expectedHasQr),
      expectedRequiredIdentityText: testCase.expectedRequiredIdentityText || "",
      geometryTolerancePx: PREVIEW_GEOMETRY_TOLERANCE_PX,
    },
  );
};

const capturePreviewEvidence = async (page, testCase) => {
  const evidence = {
    requiredIdentityTextInPreview: true,
    screenshotPath: "",
  };
  evidence.previewInspection = await inspectPreviewFrame(page, testCase);
  evidence.requiredIdentityTextInPreview =
    evidence.previewInspection.hasRequiredIdentityText;
  if (testCase.expectedRequiredIdentityText) {
    evidence.requiredIdentityTextInPreview =
      evidence.requiredIdentityTextInPreview &&
      (await page
        .frameLocator('[data-testid="label-fragment-preview"]')
        .getByText(testCase.expectedRequiredIdentityText)
        .count()) > 0;
  }
  if (screenshotDir) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    const targetPath = path.join(screenshotDir, `${testCase.id}.png`);
    await page.getByTestId("label-fragment-preview").screenshot({
      path: targetPath,
    });
    evidence.screenshotPath = targetPath;
  }
  return evidence;
};

const readPrintStatus = async (page, testCase) => {
  await page.evaluate(() => {
    document.getElementById("ghs-print-qa-status")?.remove();
  });
  await page.getByTestId(testCase.selectors.printButtonTestId).click();
  const status = page.locator(`#${testCase.selectors.qaStatusElementId}`);
  await status.waitFor({ state: "attached", timeout: 15000 });
  await page.waitForFunction(
    (elementId) => {
      const element = document.getElementById(elementId);
      const statusValue = element?.dataset?.status || "";
      return statusValue === "qa_handoff" || statusValue === "blocked";
    },
    testCase.selectors.qaStatusElementId,
    { timeout: 15000 },
  );
  return {
    attributes: await getAttributeMap(status, STATUS_ATTRIBUTES),
    text: (await status.textContent()) || "",
  };
};

const evaluateCase = ({ testCase, status, evidence }) => {
  const attrs = status.attributes;
  const pictograms = new Set(
    (attrs["data-pictograms"] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const previewInspection = evidence.previewInspection || {};
  const previewPictograms = new Set(previewInspection.pictogramCodes || []);
  const clippedCriticalElements =
    previewInspection.clippedCriticalElements || [];
  const failures = [];
  const assert = (name, passed) => {
    if (!passed) failures.push(name);
  };

  assert("status", attrs["data-status"] === testCase.expectedStatus);
  assert("label-kind", attrs["data-label-kind"] === testCase.expectedLabelKind);
  assert("stock-preset", attrs["data-stock-preset"] === testCase.expectedStockPreset);
  assert("template", attrs["data-template"] === testCase.expectedTemplate);
  assert("has-qr", attrs["data-has-qr"] === normalizeBool(testCase.expectedHasQr));
  assert("has-cas", attrs["data-has-cas"] === "true");
  assert(
    "cas-numbers",
    (testCase.expectedCasNumbers || []).every((casNumber) =>
      (attrs["data-cas-numbers"] || "").includes(casNumber),
    ),
  );
  assert(
    "pictograms",
    (testCase.expectedPictograms || []).every((code) => pictograms.has(code)),
  );
  assert(
    "preview-label-kind",
    previewInspection.labelKind === testCase.expectedLabelKind,
  );
  assert("preview-label-visible", previewInspection.labelVisible === true);
  assert(
    "preview-label-within-viewport",
    previewInspection.labelWithinViewport === true,
  );
  assert("preview-cas", previewInspection.hasCas === true);
  assert(
    "preview-has-qr",
    Boolean(previewInspection.hasQrImage) === Boolean(testCase.expectedHasQr),
  );
  assert(
    "preview-pictograms",
    (testCase.expectedPictograms || []).every((code) =>
      previewPictograms.has(code),
    ),
  );
  assert(
    `preview-critical-elements-visible${
      clippedCriticalElements.length > 0
        ? `:${clippedCriticalElements
            .map((item) => `${item.type}/${item.key}`)
            .join(",")}`
        : ""
    }`,
    clippedCriticalElements.length === 0,
  );
  assert(
    "label-width",
    sameNumber(attrs["data-label-width-mm"], testCase.expectedLabelWidthMm),
  );
  assert(
    "label-height",
    sameNumber(attrs["data-label-height-mm"], testCase.expectedLabelHeightMm),
  );
  assert("page-size", attrs["data-page-size"] === testCase.expectedPageSize);
  assert("issue-types", !(attrs["data-issue-types"] || ""));
  if (testCase.expectedRequiredIdentityText) {
    assert("required-identity-preview", evidence.requiredIdentityTextInPreview);
    assert(
      "required-identity-handoff",
      (attrs["data-support-chips"] || "").includes(
        testCase.expectedRequiredIdentityText,
      ),
    );
  }

  return {
    id: testCase.id,
    searchTerm: testCase.searchTerm,
    passed: failures.length === 0,
    failures,
    status: attrs,
    evidence,
  };
};

const runCase = async ({ browser, testCase, baseUrl, responsibleProfile }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  try {
    await page.goto(withQaParam(baseUrl), { waitUntil: "domcontentloaded" });
    await fillSearch(page, testCase.searchTerm);
    await openPrintModal(page);
    await fillResponsibleProfile(page, responsibleProfile);
    await setTargetAndStock(page, testCase);
    await setCustomFields(page, testCase);
    const evidence = await capturePreviewEvidence(page, testCase);
    const status = await readPrintStatus(page, testCase);
    return evaluateCase({ testCase, status, evidence });
  } catch (error) {
    const failure = {
      id: testCase.id,
      searchTerm: testCase.searchTerm,
      passed: false,
      failures: ["runner-error"],
      error: error?.message || String(error),
    };
    if (screenshotDir) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      const targetPath = path.join(screenshotDir, `${testCase.id}-error.png`);
      await page.screenshot({ path: targetPath, fullPage: true }).catch(() => {});
      failure.evidence = { screenshotPath: targetPath };
    }
    return failure;
  } finally {
    await page.close().catch(() => {});
  }
};

const report = readReport();
const cases = selectCases(report.productionBrowserQa?.cases || []);
if (cases.length === 0) {
  throw new Error(
    "No production Browser QA cases selected. Set PRINT_QA_CASES or PRINT_QA_SEARCH_TERM.",
  );
}

const baseUrl =
  productionUrl || report.productionBrowserQa?.targetUrl || report.targetUrl;
const responsibleProfile = report.productionBrowserQa?.responsibleProfile || {};
const executablePath = resolveChromeExecutable();
const startedAt = new Date().toISOString();
const browser = await chromium.launch({
  executablePath,
  headless,
  args: ["--disable-dev-shm-usage"],
});

const results = [];
try {
  for (const testCase of cases) {
    // Keep progress visible for long HCl matrices.
    // eslint-disable-next-line no-console
    console.log(`Running production print QA: ${testCase.id}`);
    results.push(
      await runCase({ browser, testCase, baseUrl, responsibleProfile }),
    );
  }
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.passed);
const result = {
  ok: failed.length === 0,
  startedAt,
  finishedAt: new Date().toISOString(),
  productionUrl: baseUrl,
  reportPath,
  executablePath,
  headless,
  selectedCases: cases.map((testCase) => testCase.id),
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  results,
};

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${maybeJson(result)}${os.EOL}`);
}

console.log(maybeJson(result));

if (!result.ok) {
  process.exitCode = 1;
}
