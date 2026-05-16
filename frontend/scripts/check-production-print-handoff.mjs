import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_REPORT_PATH = "build/print-qa-report.json";
const DEFAULT_HANDOFF_REPORT_PATH = "build/production-print-handoff-report.json";
const DEFAULT_SEARCH_TERM = "";
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
  "data-auto-fit-level",
  "data-template",
  "data-stock-preset",
  "data-total-labels",
  "data-total-pages",
  "data-issue-types",
  "data-support-chips",
];

const env = process.env;
const SEARCH_RESULT_TIMEOUT_MS = Number.parseInt(
  env.PRINT_QA_SEARCH_TIMEOUT_MS || "60000",
  10,
);
const SEARCH_ATTEMPTS = Number.parseInt(
  env.PRINT_QA_SEARCH_ATTEMPTS || "3",
  10,
);
const SEARCH_RETRY_DELAY_MS = Number.parseInt(
  env.PRINT_QA_SEARCH_RETRY_DELAY_MS || "4000",
  10,
);
const PREVIEW_READY_TIMEOUT_MS = Number.parseInt(
  env.PRINT_QA_PREVIEW_READY_TIMEOUT_MS || "20000",
  10,
);
const PRINT_ACTION_READY_TIMEOUT_MS = Number.parseInt(
  env.PRINT_QA_PRINT_ACTION_READY_TIMEOUT_MS || "20000",
  10,
);
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
  : path.resolve(process.cwd(), DEFAULT_HANDOFF_REPORT_PATH);
const verboseConsole = env.PRINT_QA_VERBOSE === "1";

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
  if (searchTerm) {
    return cases.filter((testCase) => testCase.searchTerm === searchTerm);
  }
  return cases.filter((testCase) => !/^QA-/.test(testCase.searchTerm || ""));
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

const sameMembers = (left = [], right = []) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((item) => rightSet.has(item))
  );
};

const normalizeBool = (value) => String(Boolean(value));

const LABEL_KIND_CLASSES = {
  "complete-primary": "label-kind-complete-primary",
  primary: "label-kind-complete-primary",
  supplemental: "label-kind-supplemental",
  "qr-supplement": "label-kind-qr-supplement",
  "quick-id": "label-kind-quick-id",
};
const QR_TARGET_TYPES = new Set([
  "sds",
  "regulatory",
  "occupational",
  "reference",
  "ghs-lookup",
]);
const QR_TARGET_ROLE_TEXT_RE =
  /(?:SDS|Regulatory|Occupational|Reference|法規|職安|參考)/i;

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

const waitForPressedState = async (page, testId) => {
  await page.waitForFunction(
    (targetTestId) => {
      const node = document.querySelector(`[data-testid="${targetTestId}"]`);
      return (
        node?.getAttribute("aria-pressed") === "true" ||
        String(node?.className || "").includes("border-blue")
      );
    },
    testId,
    { timeout: PREVIEW_READY_TIMEOUT_MS },
  );
};

const waitForPreviewContract = async (page, testCase) => {
  const labelKindClass = LABEL_KIND_CLASSES[testCase.expectedLabelKind] || "";
  const stockClass = testCase.expectedStockPreset
    ? `label-stock-${testCase.expectedStockPreset}`
    : "";
  await page.waitForFunction(
    ({ expectedKindClass, expectedStockClass }) => {
      const frame = document.querySelector(
        '[data-testid="label-fragment-preview"]',
      );
      const label = frame?.contentDocument?.querySelector(".label") || null;
      const className = label?.className || "";
      return (
        Boolean(label) &&
        (!expectedKindClass || className.includes(expectedKindClass)) &&
        (!expectedStockClass || className.includes(expectedStockClass))
      );
    },
    {
      expectedKindClass: labelKindClass,
      expectedStockClass: stockClass,
    },
    { timeout: PREVIEW_READY_TIMEOUT_MS },
  );
};

const fillSearch = async (page, searchTerm) => {
  let lastError = null;
  for (let attempt = 1; attempt <= SEARCH_ATTEMPTS; attempt += 1) {
    const searchInput = page
      .locator('input[role="combobox"], input[type="text"]')
      .first();
    await searchInput.fill(searchTerm);
    await page.getByTestId("single-search-btn").click();
    try {
      await page.locator('input[type="checkbox"]').first().waitFor({
        state: "visible",
        timeout: SEARCH_RESULT_TIMEOUT_MS,
      });
      return attempt;
    } catch (error) {
      const rowText =
        ((await page
          .getByTestId("result-row-0")
          .textContent()
          .catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim();
      lastError = new Error(
        `Search attempt ${attempt} did not produce a selectable print result: ${rowText || error?.message || String(error)}`,
      );
      if (attempt < SEARCH_ATTEMPTS) {
        await sleep(SEARCH_RETRY_DELAY_MS);
        await page.reload({ waitUntil: "networkidle" });
      }
    }
  }
  throw lastError || new Error("Search did not produce a selectable result.");
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
  const targetTestId = `label-purpose-${testCase.targetOption}`;
  await page.getByTestId(targetTestId).click();
  await waitForPressedState(page, targetTestId);
  await ensureDetailsOpen(page, testCase.selectors.stockPickerTestId);
  await ensureDetailsOpen(page, "secondary-output-size-controls");
  await page.getByTestId(testCase.selectors.stockButtonTestId).click();
  await waitForPressedState(page, testCase.selectors.stockButtonTestId);
  await waitForPreviewContract(page, testCase);
};

const setVisualConfig = async (page, testCase) => {
  const desiredNameDisplay = testCase.expectedNameDisplay;
  const desiredColorMode = testCase.expectedColorMode;
  if (desiredNameDisplay) {
    const nameDisplayControl = page.getByTestId(
      `label-config-option-${desiredNameDisplay}`,
    );
    if ((await nameDisplayControl.count()) > 0) {
      await nameDisplayControl.click();
      await sleep(150);
    }
  }
  if (desiredColorMode) {
    const colorModeControl = page.getByTestId(
      `label-config-option-${desiredColorMode}`,
    );
    if ((await colorModeControl.count()) > 0) {
      await colorModeControl.click();
      await sleep(150);
    }
  }
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

const inspectModalShell = async (page) =>
  page.evaluate(() => {
    const failures = [];
    const byTestId = (testId) =>
      document.querySelector(`[data-testid="${testId}"]`);
    const outputControls = byTestId("output-goal-controls");
    const recommendation = byTestId("recommended-output-summary");
    const outputPlan = byTestId("print-output-plan");
    const workflowSteps = byTestId("print-workflow-steps");
    const previewPanel = byTestId("label-preview-panel");
    const previewContext = byTestId("preview-context-strip");
    const printAction =
      byTestId("print-label-action") || byTestId("use-full-page-primary-footer");

    if (workflowSteps) {
      failures.push("legacy-workflow-steps-visible");
    }
    if (!outputControls) {
      failures.push("missing-output-goal-controls");
    }
    if (!recommendation) {
      failures.push("missing-recommended-output-summary");
    }
    if (!outputPlan) {
      failures.push("missing-print-output-plan");
    }
    if (
      outputControls &&
      recommendation &&
      !(
        outputControls.compareDocumentPosition(recommendation) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    ) {
      failures.push("recommendation-before-target-choice");
    }
    if (
      recommendation &&
      outputPlan &&
      !(
        recommendation.compareDocumentPosition(outputPlan) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    ) {
      failures.push("details-before-recommendation");
    }
    if (!previewPanel) {
      failures.push("missing-preview-panel");
    } else {
      const rect = previewPanel.getBoundingClientRect();
      if (rect.width < 360) {
        failures.push("preview-panel-too-narrow");
      }
      if (rect.height < 360) {
        failures.push("preview-panel-too-short");
      }
    }
    if (!printAction) {
      failures.push("missing-print-action");
    } else {
      const rect = printAction.getBoundingClientRect();
      if (rect.width < 280 || rect.height < 44) {
        failures.push("print-action-too-small");
      }
    }
    const previewContextItems = Array.from(
      previewContext?.querySelectorAll('[data-testid^="preview-context-"]') || [],
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      const lines = (node.innerText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return {
        id: node.getAttribute("data-testid") || "",
        width: Math.round(rect.width),
        lines,
      };
    });
    if (!previewContext) {
      failures.push("missing-preview-context-strip");
    }
    if (previewContextItems.length !== 3) {
      failures.push("preview-context-count");
    }
    previewContextItems.forEach((item) => {
      if (item.width < 110) {
        failures.push(`${item.id}-too-narrow`);
      }
      if (item.lines.length > 3) {
        failures.push(`${item.id}-text-overwrapped`);
      }
    });

    const targetButtons = Array.from(
      document.querySelectorAll('[data-testid^="label-purpose-"]'),
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      const lines = (node.innerText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return {
        id: node.getAttribute("data-testid") || "",
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        lines,
      };
    });
    if (targetButtons.length !== 3) {
      failures.push("target-choice-count");
    }
    targetButtons.forEach((button) => {
      if (button.width < 180) {
        failures.push(`${button.id}-too-narrow`);
      }
      if (button.height > 190) {
        failures.push(`${button.id}-too-tall`);
      }
      if (button.lines.length > 6) {
        failures.push(`${button.id}-text-overwrapped`);
      }
    });

    return {
      failures,
      targetButtons,
      previewContextItems,
      outputPlanOpen: Boolean(outputPlan?.open),
      hasLegacyWorkflowSteps: Boolean(workflowSteps),
    };
  });

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
      expectedHasSignalWord,
      expectedIdentityTexts,
      expectedRequiredIdentityTexts,
      expectedForbiddenIdentityTexts,
      expectedColorMode,
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
      const rectsOverlap = (left, right, tolerance = 0) =>
        left &&
        right &&
        left.right > right.left + tolerance &&
        left.left < right.right - tolerance &&
        left.bottom > right.top + tolerance &&
        left.top < right.bottom - tolerance;
      const elementOverflows = (element, tolerance = 1) => {
        if (!element) return false;
        const scrollHeight = Math.ceil(element.scrollHeight || 0);
        const clientHeight = Math.ceil(element.clientHeight || 0);
        const scrollWidth = Math.ceil(element.scrollWidth || 0);
        const clientWidth = Math.ceil(element.clientWidth || 0);
        return (
          (clientHeight > 0 && scrollHeight > clientHeight + tolerance) ||
          (clientWidth > 0 && scrollWidth > clientWidth + tolerance)
        );
      };
      const unique = (values) => Array.from(new Set(values));
      const visibleText = (node) =>
        (node.innerText || node.textContent || "").replace(/\s+/g, " ").trim();
      const identityText = (value) =>
        String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
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
      const normalizedFrameText = identityText(frameText);
      const pictogramImages = Array.from(document.querySelectorAll("img"))
        .map((img, index) => ({
          element: img,
          alt: img.getAttribute("alt") || img.alt || "",
          key: img.getAttribute("alt") || img.alt || `pictogram-${index + 1}`,
        }))
        .filter(({ alt }) => /^GHS\d{2}$/i.test(alt));
      const qrImages = selectorItems(".qrcode-img", "qr");
      const qrTargetAttributes = qrImages.map(({ element, key }) => ({
        key,
        target: element.getAttribute("data-qr-target") || "",
        type: element.getAttribute("data-qr-target-type") || "",
        source: element.getAttribute("data-qr-target-source") || "",
        label: element.getAttribute("data-qr-target-label") || "",
      }));
      const supportChips = selectorItems(".support-chip", "support-chip");
      const signalNodes = selectorItems(".signal", "signal");
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
        ...signalNodes,
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
            const imageReady =
              element.tagName !== "IMG" ||
              (element.complete && element.naturalWidth > 0);
            const withinLabel = labelRect
              ? containsRect(labelRect, rect, geometryTolerancePx)
              : false;
            const withinViewport = containsRect(
              viewportRect,
              rect,
              geometryTolerancePx,
            );
            if (visible && imageReady && withinLabel && withinViewport) {
              return null;
            }
            return JSON.stringify({
              type,
              key,
              visible,
              imageReady,
              withinLabel,
              withinViewport,
              rect: rectToObject(rect),
            });
          })
          .filter(Boolean),
      ).map((item) => JSON.parse(item));
      const contentSelectors = [
        [".title", "title"],
        [".chemical-name", "chemical-name"],
        [".name-section", "name-section"],
        [".cas", "cas"],
        [".meta-chip-cas", "cas-chip"],
        [".meta-chip-cas .meta-chip-value", "cas-value"],
        [".meta-chip-batch", "case-chip"],
        [".meta-chip-batch .meta-chip-value", "case-value"],
        [".signal", "signal"],
        [".standard-title-area", "standard-title-area"],
        [".standard-primary-area", "standard-primary-area"],
        [".standard-secondary-area", "standard-secondary-area"],
        [".standard-hazard-summary", "standard-hazard-summary"],
        [".hazard-summary-item", "hazard-summary-item"],
        [".hazard-code-list", "hazard-code-list"],
        [".compact-identity", "compact-identity"],
        [".qrcode-panel", "qrcode-panel"],
        [".qrcode-caption", "qrcode-caption"],
        [".custom-fields", "custom-fields"],
        [".compliance-core", "compliance-core"],
        [".compliance-alert-panel", "compliance-alert-panel"],
        [".compliance-statements-panel", "compliance-statements-panel"],
        [".compliance-hazard-panel", "compliance-hazard-panel"],
        [".compliance-precaution-panel", "compliance-precaution-panel"],
        [".statement-code", "statement-code"],
        [".statement-text", "statement-text"],
      ];
      const clippedContentElements = unique(
        contentSelectors.flatMap(([selector, type]) =>
          Array.from(document.querySelectorAll(selector)).map(
            (element, index) => {
              const rect = element.getBoundingClientRect();
              const visible = hasVisibleArea(rect);
              if (!visible) return null;
              const withinLabel = labelRect
                ? containsRect(labelRect, rect, geometryTolerancePx)
                : false;
              const overflow = elementOverflows(element, geometryTolerancePx);
              if (!overflow && withinLabel) return null;
              return JSON.stringify({
                type,
                key: `${type}-${index + 1}`,
                overflow,
                withinLabel,
                rect: rectToObject(rect),
                text: visibleText(element).slice(0, 120),
              });
            },
          ),
        ).filter(Boolean),
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
      const pictogramRects = pictogramImages.map(({ element }) =>
        rectToObject(element.getBoundingClientRect()),
      );
      const qrRects = qrImages.map(({ element }) =>
        rectToObject(element.getBoundingClientRect()),
      );
      const supportChipRects = supportChips.map(({ element, key }) => ({
        key,
        rect: rectToObject(element.getBoundingClientRect()),
        text: visibleText(element),
      }));
      const requiredSupportChip = expectedRequiredIdentityText
        ? supportChips.find(({ element }) =>
            identityText(visibleText(element)).includes(
              identityText(expectedRequiredIdentityText),
            ),
          )
        : null;
      const requiredSupportChipRect =
        requiredSupportChip?.element?.getBoundingClientRect();
      const requiredSupportChipVisible =
        !expectedRequiredIdentityText ||
        Boolean(
          requiredSupportChipRect &&
            hasVisibleArea(requiredSupportChipRect) &&
            labelRect &&
            containsRect(
              labelRect,
              requiredSupportChipRect,
              geometryTolerancePx,
            ) &&
            containsRect(
              viewportRect,
              requiredSupportChipRect,
              geometryTolerancePx,
            ),
        );
      const overlapTargets = [
        ...pictogramImages.map(({ element, key }) => ({
          type: "pictogram",
          key,
          rect: element.getBoundingClientRect(),
        })),
        ...qrImages.map(({ element, key }) => ({
          type: "qr",
          key,
          rect: element.getBoundingClientRect(),
        })),
        ...signalNodes.map(({ element, key }) => ({
          type: "signal",
          key,
          rect: element.getBoundingClientRect(),
        })),
      ];
      const supportChipOverlapIssues =
        requiredSupportChip && requiredSupportChipRect
          ? overlapTargets
              .filter(({ rect }) => rectsOverlap(requiredSupportChipRect, rect, -1))
              .map(({ type, key }) => ({
                type,
                key,
                supportChipText: visibleText(requiredSupportChip.element),
                supportChipRect: rectToObject(requiredSupportChipRect),
              }))
          : [];
      const minSide = (rects) => {
        if (rects.length === 0) return 0;
        return Math.min(...rects.map((rect) => Math.min(rect.width, rect.height)));
      };
      const criticalImageFilters = [...pictogramImages, ...qrImages].map(
        ({ element }) => window.getComputedStyle(element).filter || "",
      );
      const expectedColorClass =
        expectedColorMode === "bw" ? "print-bw" : "print-color";

      return {
        labelKind,
        labelClass,
        frameTextSample: frameText.slice(0, 500),
        pictogramCodes: unique(
          pictogramImages.map(({ alt }) => alt.toUpperCase()),
        ).sort(),
        hasQrImage: qrImages.length > 0,
        hasSignalWord:
          !expectedHasSignalWord ||
          signalNodes.some(({ element }) => visibleText(element).length > 0),
        hasCas: expectedCasNumbers.every((cas) => frameText.includes(cas)),
        hasExpectedIdentityText:
          expectedIdentityTexts.length === 0 ||
          expectedIdentityTexts.some((text) =>
            normalizedFrameText.includes(identityText(text)),
          ),
        hasRequiredIdentityTexts: expectedRequiredIdentityTexts.every((text) =>
          normalizedFrameText.includes(identityText(text)),
        ),
        hasNoForbiddenIdentityText: expectedForbiddenIdentityTexts.every(
          (text) => !normalizedFrameText.includes(identityText(text)),
        ),
        hasRequiredIdentityText:
          !expectedRequiredIdentityText ||
          normalizedFrameText.includes(identityText(expectedRequiredIdentityText)),
        hasExpectedColorClass:
          !expectedColorMode ||
          document.body.classList.contains(expectedColorClass),
        hasExpectedImageColorMode:
          !expectedColorMode ||
          criticalImageFilters.length === 0 ||
          (expectedColorMode === "bw"
            ? criticalImageFilters.every((filter) => filter.includes("grayscale"))
            : criticalImageFilters.every((filter) => !filter.includes("grayscale"))),
        imageFilters: criticalImageFilters,
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
        clippedContentElements,
        geometry: {
          viewport: rectToObject(viewportRect),
          label: labelRect ? rectToObject(labelRect) : null,
          pictograms: pictogramRects,
          qrImages: qrRects,
          supportChips: supportChipRects,
        },
        requiredSupportChipVisible,
        supportChipOverlapIssues,
        minPictogramSidePx: round(minSide(pictogramRects)),
        minQrSidePx: round(minSide(qrRects)),
        counts: {
          pictograms: pictogramImages.length,
          qrImages: qrImages.length,
          supportChips: supportChips.length,
          signalWords: signalNodes.length,
          casNodes: casNodes.length,
        },
        qrTargetAttributes,
      };
    },
    {
      expectedCasNumbers: testCase.expectedCasNumbers || [],
      expectedPictograms: testCase.expectedPictograms || [],
      expectedHasQr: Boolean(testCase.expectedHasQr),
      expectedHasSignalWord: Boolean(testCase.expectedHasSignalWord),
      expectedIdentityTexts: testCase.expectedIdentityTexts || [],
      expectedRequiredIdentityTexts:
        testCase.expectedRequiredIdentityTexts || [],
      expectedForbiddenIdentityTexts:
        testCase.expectedForbiddenIdentityTexts || [],
      expectedColorMode: testCase.expectedColorMode || "",
      expectedRequiredIdentityText: testCase.expectedRequiredIdentityText || "",
      geometryTolerancePx: PREVIEW_GEOMETRY_TOLERANCE_PX,
    },
  );
};

const capturePreviewEvidence = async (page, testCase) => {
  const evidence = {
    requiredIdentityTextInPreview: true,
    screenshotPath: "",
    previewPageControlsVisible: false,
    nextPreviewPageChanged: true,
    nextPreviewInspection: null,
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
  if (
    Number(testCase.expectedMinTotalPages || 1) > 1 ||
    Number(testCase.expectedMinTotalLabels || 1) > 1
  ) {
    const pageControls = page.getByTestId("preview-page-controls");
    evidence.previewPageControlsVisible = await pageControls
      .isVisible()
      .catch(() => false);
    const previewFrame = page.getByTestId("label-fragment-preview");
    const beforeSrcDoc = await previewFrame
      .getAttribute("srcdoc")
      .catch(() => "");
    await page.getByTestId("preview-page-next").click();
    await page.waitForFunction(
      (previous) =>
        document
          .querySelector('[data-testid="label-fragment-preview"]')
          ?.getAttribute("srcdoc") !== previous,
      beforeSrcDoc,
      { timeout: 10000 },
    );
    const afterSrcDoc = await previewFrame.getAttribute("srcdoc");
    evidence.nextPreviewPageChanged =
      Boolean(beforeSrcDoc) && beforeSrcDoc !== afterSrcDoc;
    evidence.nextPreviewInspection = await inspectPreviewFrame(page, testCase);
  }
  evidence.outputChecklistText =
    ((await page
      .getByTestId("required-output-checklist")
      .textContent()
      .catch(() => "")) || "")
      .replace(/\s+/g, " ")
      .trim();
  evidence.decisionSummaryText =
    ((await page
      .getByTestId("print-decision-summary")
      .textContent()
      .catch(() => "")) || "")
      .replace(/\s+/g, " ")
      .trim();
  evidence.recoveryRoute = await page
    .getByTestId("print-recovery-route")
    .evaluate((node) => ({
      text: (node.innerText || node.textContent || "")
        .replace(/\s+/g, " ")
        .trim(),
      kind: node.getAttribute("data-recovery-kind") || "",
      currentStock: node.getAttribute("data-current-stock") || "",
      targetStock: node.getAttribute("data-target-stock") || "",
    }))
    .catch(() => null);
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
  const printButton = page.getByTestId(testCase.selectors.printButtonTestId);
  await printButton
    .waitFor({ state: "attached", timeout: PRINT_ACTION_READY_TIMEOUT_MS })
    .catch(() => {});
  if ((await printButton.count()) === 0) {
    const fallbackAction = page.getByTestId("use-full-page-primary-footer");
    const fallbackText =
      ((await fallbackAction.textContent().catch(() => "")) || "").trim();
    const outcomeText =
      ((await page
        .getByTestId("print-outcome-summary")
        .textContent()
        .catch(() => "")) || "").trim();
    return {
      printButtonEnabled: false,
      attributes: Object.fromEntries(
        STATUS_ATTRIBUTES.map((attribute) => [attribute, null]),
      ),
      text: [outcomeText, fallbackText, "missing print-label-action"]
        .filter(Boolean)
        .join(" "),
      buttonText: fallbackText,
      outcomeText,
    };
  }
  const buttonText = ((await printButton.textContent().catch(() => "")) || "").trim();
  const outcomeSummary = page.getByTestId("print-outcome-summary");
  const outcomeText =
    (await outcomeSummary.textContent().catch(() => ""))?.trim() || "";
  const printButtonEnabled = !(await printButton.isDisabled());
  if (!printButtonEnabled) {
    return {
      printButtonEnabled,
      attributes: Object.fromEntries(
        STATUS_ATTRIBUTES.map((attribute) => [attribute, null]),
      ),
      text: [outcomeText, buttonText].filter(Boolean).join(" "),
      buttonText,
      outcomeText,
    };
  }
  await printButton.click();
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
    printButtonEnabled,
    attributes: await getAttributeMap(status, STATUS_ATTRIBUTES),
    text: (await status.textContent()) || "",
    buttonText,
    outcomeText,
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
  const previewUnionPictograms = new Set([
    ...(previewInspection.pictogramCodes || []),
    ...((evidence.nextPreviewInspection || {}).pictogramCodes || []),
  ]);
  const expectsContinuationPreview =
    Number(testCase.expectedMinTotalLabels || 1) > 1 ||
    Number(testCase.expectedMinTotalPages || 1) > 1;
  const previewPictogramSet = expectsContinuationPreview
    ? previewUnionPictograms
    : previewPictograms;
  const clippedCriticalElements =
    previewInspection.clippedCriticalElements || [];
  const clippedContentElements =
    previewInspection.clippedContentElements || [];
  const failures = [];
  const assert = (name, passed) => {
    if (!passed) failures.push(name);
  };
  (evidence.modalShellInspection?.failures || []).forEach((failure) => {
    failures.push(`modal-shell:${failure}`);
  });
  const expectedCanPrint = testCase.expectedCanPrint !== false;
  const expectedPrintButtonEnabled =
    testCase.expectedPrintButtonEnabled ?? expectedCanPrint;
  const blockedText = [
    status.text,
    status.outcomeText,
    status.buttonText,
  ]
    .filter(Boolean)
    .join(" ");

  assert(
    "print-button-enabled",
    status.printButtonEnabled === expectedPrintButtonEnabled,
  );
  if (expectedCanPrint) {
    assert("status", attrs["data-status"] === testCase.expectedStatus);
    assert("label-kind", attrs["data-label-kind"] === testCase.expectedLabelKind);
    assert(
      "stock-preset",
      attrs["data-stock-preset"] === testCase.expectedStockPreset,
    );
    assert("template", attrs["data-template"] === testCase.expectedTemplate);
    assert(
      "has-qr",
      attrs["data-has-qr"] === normalizeBool(testCase.expectedHasQr),
    );
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
      "pictograms-exact",
      (testCase.expectedPictograms || []).length === 0 ||
        sameMembers([...pictograms], testCase.expectedPictograms || []),
    );
  } else {
    const expectedBlockedPatterns = testCase.expectedBlockedTextPatterns || [];
    const expectedRecoveryKind = testCase.expectedRecoveryKind || "";
    assert(
      "status",
      status.printButtonEnabled === false ||
        attrs["data-status"] === testCase.expectedStatus,
    );
    assert(
      "blocked-guidance",
      expectedBlockedPatterns.length === 0 ||
        expectedBlockedPatterns.some((pattern) =>
          new RegExp(pattern, "i").test(blockedText),
        ),
    );
    assert(
      "recovery-route-visible",
      !expectedRecoveryKind || Boolean(evidence.recoveryRoute?.text),
    );
    assert(
      "recovery-route-kind",
      !expectedRecoveryKind ||
        evidence.recoveryRoute?.kind === expectedRecoveryKind,
    );
    assert(
      "recovery-route-current-stock",
      !expectedRecoveryKind || Boolean(evidence.recoveryRoute?.currentStock),
    );
  }
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
      previewPictogramSet.has(code),
    ),
  );
  assert(
    "preview-pictograms-exact",
    (testCase.expectedPictograms || []).length === 0 ||
      sameMembers([...previewPictogramSet], testCase.expectedPictograms || []),
  );
  if (expectedCanPrint) {
    assert(
      "preview-pictograms-match-handoff",
      pictograms.size === previewPictogramSet.size &&
        [...pictograms].every((code) => previewPictogramSet.has(code)),
    );
  }
  assert(
    "preview-signal-word",
    !testCase.expectedHasSignalWord ||
      previewInspection.hasSignalWord === true,
  );
  assert(
    "preview-identity-text",
    previewInspection.hasExpectedIdentityText === true,
  );
  assert(
    "preview-required-identity-texts",
    previewInspection.hasRequiredIdentityTexts === true,
  );
  assert(
    "preview-no-forbidden-identity-text",
    previewInspection.hasNoForbiddenIdentityText === true,
  );
  assert(
    "preview-color-class",
    previewInspection.hasExpectedColorClass === true,
  );
  assert(
    "preview-image-color-mode",
    previewInspection.hasExpectedImageColorMode === true,
  );
  if (Number(testCase.expectedMinPictogramSidePx) > 0) {
    assert(
      "preview-pictogram-min-size",
      Number(previewInspection.minPictogramSidePx) >=
        Number(testCase.expectedMinPictogramSidePx),
    );
  }
  if (Number(testCase.expectedMinQrSidePx) > 0) {
    assert(
      "preview-qr-min-size",
      Number(previewInspection.minQrSidePx) >=
        Number(testCase.expectedMinQrSidePx) - 1,
    );
  }
  if (testCase.expectedLabelKind === "qr-supplement") {
    const qrTargetAttributes = previewInspection.qrTargetAttributes || [];
    assert(
      "qr-target-attributes-present",
      qrTargetAttributes.length > 0 &&
        qrTargetAttributes.every(
          ({ target, type, source, label }) =>
            /^https?:\/\//i.test(target || "") &&
            QR_TARGET_TYPES.has(type) &&
            Boolean(source) &&
            Boolean(label),
        ),
    );
    assert(
      "qr-target-checklist-visible",
      /QR (target|目標)|QR 目標/i.test(evidence.outputChecklistText || "") &&
        /(?:查詢頁|GHS 標籤快速查詢|GHS Label Quick Search|SDS|Regulatory|Occupational|Reference)/i.test(
          evidence.outputChecklistText || "",
        ),
    );
    assert(
      "qr-target-decision-visible",
      /QR/i.test(evidence.decisionSummaryText || "") &&
        /(?:查詢頁|GHS 標籤快速查詢|GHS Label Quick Search|SDS|Regulatory|Occupational|Reference)/i.test(
          evidence.decisionSummaryText || "",
        ),
    );
  }
  if (Number(testCase.expectedMinTotalPages || 1) > 1) {
    const nextPreview = evidence.nextPreviewInspection || {};
    const nextPreviewPictograms = new Set(nextPreview.pictogramCodes || []);
    const nextClippedCriticalElements =
      nextPreview.clippedCriticalElements || [];
    assert("preview-page-controls", evidence.previewPageControlsVisible === true);
    assert("preview-next-page-changes", evidence.nextPreviewPageChanged === true);
    assert("preview-next-label-visible", nextPreview.labelVisible === true);
    assert(
      "preview-next-page-pictograms",
      (testCase.expectedPictograms || []).every((code) =>
        nextPreviewPictograms.has(code),
      ),
    );
    assert(
      "preview-next-critical-elements-visible",
      nextClippedCriticalElements.length === 0,
    );
  }
  assert(
    "preview-no-scroll-overflow",
    previewInspection.documentHasScrollOverflow === false,
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
    `preview-content-not-clipped${
      clippedContentElements.length > 0
        ? `:${clippedContentElements
            .map((item) => `${item.type}/${item.key}`)
            .join(",")}`
        : ""
    }`,
    clippedContentElements.length === 0,
  );
  if (expectedCanPrint) {
    assert(
      "label-width",
      sameNumber(attrs["data-label-width-mm"], testCase.expectedLabelWidthMm),
    );
    assert(
      "label-height",
      sameNumber(attrs["data-label-height-mm"], testCase.expectedLabelHeightMm),
    );
    assert("page-size", attrs["data-page-size"] === testCase.expectedPageSize);
    assert(
      "total-labels",
      Number(attrs["data-total-labels"] || 0) >=
        Number(testCase.expectedMinTotalLabels || 1),
    );
    assert(
      "total-pages",
      Number(attrs["data-total-pages"] || 0) >=
        Number(testCase.expectedMinTotalPages || 1),
    );
    assert(
      "color-mode",
      attrs["data-color-mode"] === testCase.expectedColorMode,
    );
    assert(
      "name-display",
      attrs["data-name-display"] === testCase.expectedNameDisplay,
    );
    assert("issue-types", !(attrs["data-issue-types"] || ""));
  }
  if (testCase.expectedRequiredIdentityText) {
    assert("required-identity-preview", evidence.requiredIdentityTextInPreview);
    assert(
      "required-support-chip-visible",
      previewInspection.requiredSupportChipVisible === true,
    );
    assert(
      `required-support-chip-no-overlap${
        (previewInspection.supportChipOverlapIssues || []).length > 0
          ? `:${(previewInspection.supportChipOverlapIssues || [])
              .map((item) => `${item.type}/${item.key}`)
              .join(",")}`
          : ""
      }`,
      (previewInspection.supportChipOverlapIssues || []).length === 0,
    );
    if (expectedCanPrint) {
      assert(
        "required-identity-handoff",
        (attrs["data-support-chips"] || "").includes(
          testCase.expectedRequiredIdentityText,
        ),
      );
    }
  }

  return {
    id: testCase.id,
    searchTerm: testCase.searchTerm,
    passed: failures.length === 0,
    failures,
    status: attrs,
    statusText: status.text || "",
    evidence,
  };
};

const runCase = async ({ browser, testCase, baseUrl, responsibleProfile }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  try {
    await page.addInitScript(() => {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    });
    await page.goto(withQaParam(baseUrl), { waitUntil: "domcontentloaded" });
    await fillSearch(page, testCase.searchTerm);
    await openPrintModal(page);
    const modalShellInspection = await inspectModalShell(page);
    await fillResponsibleProfile(
      page,
      testCase.responsibleProfile ?? responsibleProfile,
    );
    await setTargetAndStock(page, testCase);
    await setVisualConfig(page, testCase);
    await setCustomFields(page, testCase);
    const evidence = await capturePreviewEvidence(page, testCase);
    evidence.modalShellInspection = modalShellInspection;
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
const failedCaseSummary = failed.map(({ id, searchTerm, failures, status, evidence }) => ({
  id,
  searchTerm,
  failures,
  printButtonEnabled: status?.printButtonEnabled,
  statusText: status?.text || "",
  labelKind: evidence?.previewInspection?.labelKind || "",
  previewText: evidence?.previewInspection?.frameTextSample || "",
}));
const result = {
  ok: failed.length === 0,
  startedAt,
  finishedAt: new Date().toISOString(),
  productionUrl: baseUrl,
  reportPath,
  handoffReportPath: outputPath,
  executablePath,
  headless,
  selectedCases: cases.map((testCase) => testCase.id),
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  failedCaseSummary,
  results,
};

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${maybeJson(result)}${os.EOL}`);
}

  const consoleResult = verboseConsole
  ? result
  : {
      ok: result.ok,
      productionUrl: result.productionUrl,
      reportPath: result.reportPath,
      handoffReportPath: result.handoffReportPath,
      summary: result.summary,
      selectedCases: result.selectedCases,
      failedCases: failedCaseSummary,
    };

console.log(maybeJson(consoleResult));

if (!result.ok) {
  process.exitCode = 1;
}
