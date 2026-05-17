import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_PRODUCTION_URL = "https://ghs-frontend.zeabur.app/";
const DEFAULT_REPORT_PATH = "build/production-prepared-print-report.json";
const DEFAULT_SCREENSHOT_DIR = "build/production-prepared-print-screenshots";
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
  "data-total-labels",
  "data-total-pages",
  "data-issue-types",
  "data-support-chips",
];

const env = process.env;
const productionUrl = env.PRINT_QA_PRODUCTION_URL || DEFAULT_PRODUCTION_URL;
const outputPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_PREPARED_REPORT_PATH || DEFAULT_REPORT_PATH,
);
const screenshotDir = path.resolve(
  process.cwd(),
  env.PRINT_QA_SCREENSHOT_DIR || DEFAULT_SCREENSHOT_DIR,
);
const headless = env.PRINT_QA_HEADLESS !== "0";
const verboseConsole = env.PRINT_QA_VERBOSE === "1";

const localDateOffset = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const PREPARED_FORM = Object.freeze({
  searchTerm: "7647-01-0",
  concentration: "1 M",
  solvent: "Water",
  preparedBy: "QA Analyst",
  preparedDate: localDateOffset(0),
  expiryDate: localDateOffset(30),
});

const PREPARED_PRESET_NAME = "QA HCl 1M preset";
const STALE_PRESET_OPERATIONAL = Object.freeze({
  preparedBy: "STALE Operator",
  preparedDate: "2020-01-01",
  expiryDate: "2020-07-01",
});

const PREPARED_CASES = Object.freeze([
  {
    id: "prepared-a4-primary",
    label: "Prepared HCl A4 complete primary",
    targetOption: "complete",
    stockPreset: "a4-primary",
    expectedLabelKind: "complete-primary",
    expectedTemplate: "full",
    expectedHasQr: true,
    expectedHasPreparedBadge: true,
    expectedMinPictogramSidePx: 18,
    expectedPreparedTexts: [
      PREPARED_FORM.concentration,
      PREPARED_FORM.solvent,
      PREPARED_FORM.preparedBy,
      PREPARED_FORM.preparedDate,
      PREPARED_FORM.expiryDate,
    ],
  },
  {
    id: "prepared-qr-supplement",
    label: "Prepared HCl QR small label",
    targetOption: "qrSupplement",
    stockPreset: "brother-62mm-continuous",
    expectedLabelKind: "qr-supplement",
    expectedTemplate: "qrcode",
    expectedHasQr: true,
    expectedMinPictogramSidePx: 35,
    expectedMinTotalLabels: 2,
    expectedHasPreparedBadge: false,
    expectedPreparedTexts: [],
  },
  {
    id: "prepared-tube-quick-id",
    label: "Prepared HCl tube quick-ID",
    targetOption: "quickId",
    stockPreset: "small-strip",
    expectedLabelKind: "quick-id",
    expectedTemplate: "icon",
    expectedHasQr: false,
    expectedMinPictogramSidePx: 26,
    expectedHasPreparedBadge: false,
    expectedPreparedTexts: [],
  },
]);

const PREPARED_REPRINT_CASES = Object.freeze(
  PREPARED_CASES.map((testCase) => ({
    ...testCase,
    id: `prepared-reprint-${testCase.id.replace(/^prepared-/, "")}`,
    label: `${testCase.label} via recent reprint`,
    entryMode: "reprint",
  })),
);

const PREPARED_PRESET_CASES = Object.freeze(
  PREPARED_CASES.map((testCase) => ({
    ...testCase,
    id: `prepared-preset-${testCase.id.replace(/^prepared-/, "")}`,
    label: `${testCase.label} via saved preset reuse`,
    entryMode: "preset",
  })),
);

const ALL_PREPARED_CASES = Object.freeze([
  ...PREPARED_CASES,
  ...PREPARED_REPRINT_CASES,
  ...PREPARED_PRESET_CASES,
]);

const EXPECTED_PICTOGRAMS = Object.freeze(["GHS04", "GHS05", "GHS06", "GHS07"]);

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
        "Could not find a local Chrome/Edge executable for prepared print QA.",
        "Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH to the browser executable path.",
      ].join(" "),
    );
  }
  return found;
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("qaPrintHandoff", "1");
  nextUrl.searchParams.set("productionPreparedPrintQa", Date.now().toString());
  return nextUrl.toString();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const sameMembers = (left = [], right = []) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === rightSet.size &&
    [...leftSet].every((item) => rightSet.has(item))
  );
};

const normalizeText = (value) =>
  String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

const fillSearch = async (page, searchTerm) => {
  const searchInput = page.locator('input[role="combobox"], input[type="text"]').first();
  await searchInput.fill(searchTerm);
  await page.getByTestId("single-search-btn").click();
  await page.locator('input[type="checkbox"]').first().waitFor({
    state: "visible",
    timeout: 60000,
  });
};

const openPrepareSolutionForm = async (page) => {
  await fillSearch(page, PREPARED_FORM.searchTerm);
  await page.getByTestId("detail-btn-0").click();
  await page.getByTestId("prepare-solution-btn").waitFor({
    state: "visible",
    timeout: 15000,
  });
  await page.getByTestId("prepare-solution-btn").click();
  await page.getByTestId("prepare-solution-modal").waitFor({
    state: "visible",
    timeout: 15000,
  });
};

const fillPreparedRecipe = async (page, form = PREPARED_FORM) => {
  await page.getByTestId("prepared-concentration-input").fill(form.concentration || "");
  await page.getByTestId("prepared-solvent-input").fill(form.solvent || "");
};

const fillPreparedOperational = async (page, form = PREPARED_FORM) => {
  await page.getByTestId("prepared-prepared-by-input").fill(form.preparedBy || "");
  await page.getByTestId("prepared-prepared-date-input").fill(form.preparedDate || "");
  await page.getByTestId("prepared-expiry-date-input").fill(form.expiryDate || "");
};

const submitPreparedForm = async (page) => {
  await page.getByTestId("prepare-solution-submit-btn").click();
  await page.getByTestId("print-label-action").waitFor({
    state: "visible",
    timeout: 15000,
  });
};

const openPreparedPrintModal = async (page) => {
  await openPrepareSolutionForm(page);
  await fillPreparedRecipe(page);
  await fillPreparedOperational(page);
  await submitPreparedForm(page);
};

const closePreparedPrintModal = async (page) => {
  const footer = page.getByTestId("label-modal-footer");
  await footer.locator("button").last().click();
  await page.getByTestId("label-modal-footer").waitFor({
    state: "detached",
    timeout: 15000,
  });
};

const createPreparedRecent = async (page) => {
  await openPreparedPrintModal(page);
  await closePreparedPrintModal(page);
};

const openPreparedReprintModal = async (page) => {
  await createPreparedRecent(page);
  await page.getByTestId("prepared-toggle-btn").click();
  await page.getByTestId("prepared-recent-item-0").waitFor({
    state: "visible",
    timeout: 15000,
  });
  const recentText =
    ((await page.getByTestId("prepared-recent-item-0").textContent()) || "")
      .replace(/\s+/g, " ")
      .trim();
  await page.getByTestId("prepared-reprint-btn-0").click();
  await page.getByTestId("print-label-action").waitFor({
    state: "visible",
    timeout: 30000,
  });
  return { recentText };
};

const readPreparedFormValues = async (page) => ({
  concentration: await page.getByTestId("prepared-concentration-input").inputValue(),
  solvent: await page.getByTestId("prepared-solvent-input").inputValue(),
  preparedBy: await page.getByTestId("prepared-prepared-by-input").inputValue(),
  preparedDate: await page.getByTestId("prepared-prepared-date-input").inputValue(),
  expiryDate: await page.getByTestId("prepared-expiry-date-input").inputValue(),
  presetName: await page.getByTestId("prepared-preset-name-input").inputValue(),
});

const reopenPrepareSolutionFormFromDetail = async (page) => {
  const prepareButton = page.getByTestId("prepare-solution-btn");
  await prepareButton.waitFor({ state: "visible", timeout: 15000 }).catch(async () => {
    await page.getByTestId("detail-btn-0").click();
    await prepareButton.waitFor({ state: "visible", timeout: 15000 });
  });
  await prepareButton.click();
  await page.getByTestId("prepare-solution-modal").waitFor({
    state: "visible",
    timeout: 15000,
  });
};

const openPreparedPresetPrintModal = async (page) => {
  await openPrepareSolutionForm(page);
  await fillPreparedRecipe(page);
  await fillPreparedOperational(page, STALE_PRESET_OPERATIONAL);
  await page.getByTestId("prepared-preset-name-input").fill(PREPARED_PRESET_NAME);
  await page.getByTestId("prepare-solution-save-preset-btn").click();
  await page.getByTestId("prepare-solution-preset-item-0").waitFor({
    state: "visible",
    timeout: 15000,
  });
  const savedPresetText =
    ((await page.getByTestId("prepare-solution-preset-item-0").textContent()) || "")
      .replace(/\s+/g, " ")
      .trim();
  const printModalAfterSaveVisible = await page
    .getByTestId("print-label-action")
    .isVisible()
    .catch(() => false);
  await page.getByTestId("prepare-solution-cancel-btn").click();
  await page.getByTestId("prepare-solution-modal").waitFor({
    state: "detached",
    timeout: 15000,
  });

  await reopenPrepareSolutionFormFromDetail(page);
  await page.getByTestId("prepare-solution-preset-item-0").waitFor({
    state: "visible",
    timeout: 15000,
  });
  const reopenedPresetText =
    ((await page.getByTestId("prepare-solution-preset-item-0").textContent()) || "")
      .replace(/\s+/g, " ")
      .trim();
  await page.getByTestId("prepare-solution-preset-item-0").click();
  const prefillValues = await readPreparedFormValues(page);
  await fillPreparedOperational(page, PREPARED_FORM);
  const finalValues = await readPreparedFormValues(page);
  await submitPreparedForm(page);

  return {
    presetName: PREPARED_PRESET_NAME,
    savedPresetText,
    reopenedPresetText,
    printModalAfterSaveVisible,
    prefillValues,
    finalValues,
  };
};

const setTargetAndStock = async (page, testCase) => {
  await page.getByTestId(`label-purpose-${testCase.targetOption}`).click();
  await sleep(250);
  await ensureDetailsOpen(page, "stock-size-picker");
  await ensureDetailsOpen(page, "secondary-output-size-controls");
  await page.getByTestId(`primary-output-size-${testCase.stockPreset}`).click();
  await sleep(500);
};

const fillResponsibleProfile = async (page) => {
  await ensureDetailsOpen(page, "responsible-profile-controls");
  const profile = {
    organization: "Demo Safety Lab",
    phone: "02-1234-5678",
    address: "1 Lab Road, Taipei",
  };
  for (const [key, value] of Object.entries(profile)) {
    await page.getByTestId(`responsible-profile-field-${key}`).fill(value);
  }
  await sleep(300);
};

const inspectSelectedPreparedSummary = async (page) => {
  await ensureDetailsOpen(page, "selected-labels-controls");
  const display = page.getByTestId("selected-prepared-display-7647-01-0");
  const meta = page.getByTestId("selected-prepared-meta-7647-01-0");
  const operational = page.getByTestId("selected-prepared-operational-7647-01-0");
  return {
    displayVisible: await display.isVisible().catch(() => false),
    metaText: ((await meta.textContent().catch(() => "")) || "").trim(),
    operationalText:
      ((await operational.textContent().catch(() => "")) || "").trim(),
  };
};

const getPreviewFrame = async (page) => {
  const iframeHandle = await page
    .getByTestId("label-fragment-preview")
    .elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (!frame) throw new Error("Could not resolve prepared preview iframe.");
  return frame;
};

const waitForPreviewImagesReady = async (frame) => {
  await frame
    .waitForFunction(
      () => {
        const ghsImages = Array.from(document.querySelectorAll("img")).filter(
          (img) => /^GHS\d{2}$/i.test(img.getAttribute("alt") || img.alt || ""),
        );
        return (
          ghsImages.length > 0 &&
          ghsImages.every((img) => img.complete && img.naturalWidth > 0)
        );
      },
      { timeout: 20000 },
    )
    .catch(() => {});
};

const inspectPreviewFrame = async (page, testCase) => {
  const frame = await getPreviewFrame(page);
  await waitForPreviewImagesReady(frame);

  return frame.evaluate(
    ({ expectedPreparedTexts, expectedHasQr, expectedMinPictogramSidePx }) => {
      const round = (value) => Math.round(value * 100) / 100;
      const rectToObject = (rect) => ({
        left: round(rect.left),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        width: round(rect.width),
        height: round(rect.height),
      });
      const containsRect = (outer, inner, tolerance = 2) =>
        inner.left >= outer.left - tolerance &&
        inner.top >= outer.top - tolerance &&
        inner.right <= outer.right + tolerance &&
        inner.bottom <= outer.bottom + tolerance;
      const elementOverflows = (element, tolerance = 1) => {
        const scrollHeight = Math.ceil(element.scrollHeight || 0);
        const clientHeight = Math.ceil(element.clientHeight || 0);
        const scrollWidth = Math.ceil(element.scrollWidth || 0);
        const clientWidth = Math.ceil(element.clientWidth || 0);
        return (
          (clientHeight > 0 && scrollHeight > clientHeight + tolerance) ||
          (clientWidth > 0 && scrollWidth > clientWidth + tolerance)
        );
      };
      const visibleText = (node) =>
        (node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
      const normalized = (value) =>
        String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
      const unique = (values) => [...new Set(values)];
      const label = document.querySelector(".label");
      const labelRect = label?.getBoundingClientRect();
      const viewportRect = {
        left: 0,
        top: 0,
        right: document.documentElement.clientWidth || window.innerWidth || 0,
        bottom: document.documentElement.clientHeight || window.innerHeight || 0,
      };
      viewportRect.width = viewportRect.right;
      viewportRect.height = viewportRect.bottom;
      const bodyText = visibleText(document.body);
      const normalizedBodyText = normalized(bodyText);
      const pictograms = Array.from(document.querySelectorAll("img"))
        .map((img) => ({
          img,
          alt: img.getAttribute("alt") || img.alt || "",
          rect: img.getBoundingClientRect(),
        }))
        .filter(({ alt }) => /^GHS\d{2}$/i.test(alt));
      const qrImages = Array.from(document.querySelectorAll(".qrcode-img"));
      const contentSelectors = [
        [".label", "label"],
        [".name-section", "name-section"],
        [".meta-chip-cas", "cas-chip"],
        [".meta-chip-prepared", "prepared-chip"],
        [".meta-chip-prepared-detail", "prepared-detail-chip"],
        [".prepared-badge", "prepared-badge"],
        [".prepared-meta", "prepared-meta"],
        [".prepared-operational", "prepared-operational"],
        [".signal", "signal"],
        [".pictograms", "pictograms"],
        [".standard-grid", "standard-grid"],
        [".compliance-core", "compliance-core"],
        [".compliance-alert-panel", "compliance-alert-panel"],
        [".compliance-statements-panel", "compliance-statements-panel"],
      ];
      const clippedContentElements = unique(
        contentSelectors.flatMap(([selector, type]) =>
          Array.from(document.querySelectorAll(selector))
            .map((element, index) => {
              const rect = element.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) return null;
              const owner = element.classList?.contains("label")
                ? element
                : element.closest(".label");
              const ownerRect = owner?.getBoundingClientRect();
              const withinLabel = ownerRect ? containsRect(ownerRect, rect) : true;
              const overflow = elementOverflows(element);
              if (!overflow && withinLabel) return null;
              return JSON.stringify({
                type,
                key: `${type}-${index + 1}`,
                overflow,
                withinLabel,
                text: visibleText(element).slice(0, 120),
                rect: rectToObject(rect),
              });
            })
            .filter(Boolean),
        ),
      ).map((item) => JSON.parse(item));
      const clippedCriticalElements = unique(
        [
          ...pictograms.map(({ img, alt }) => ({ element: img, type: "pictogram", key: alt })),
          ...qrImages.map((element, index) => ({
            element,
            type: "qr",
            key: `qr-${index + 1}`,
          })),
          ...Array.from(
            document.querySelectorAll(
              ".meta-chip-cas, .signal, .prepared-badge, .meta-chip-prepared-detail",
            ),
          ).map((element, index) => ({
            element,
            type: "identity",
            key: `identity-${index + 1}`,
          })),
        ]
          .map(({ element, type, key }) => {
            const rect = element.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0;
            const withinLabel = labelRect ? containsRect(labelRect, rect) : false;
            const withinViewport = containsRect(viewportRect, rect);
            const imageReady =
              element.tagName !== "IMG" ||
              (element.complete && element.naturalWidth > 0);
            if (visible && withinLabel && withinViewport && imageReady) return null;
            return JSON.stringify({
              type,
              key,
              visible,
              withinLabel,
              withinViewport,
              imageReady,
              rect: rectToObject(rect),
            });
          })
          .filter(Boolean),
      ).map((item) => JSON.parse(item));
      const pictogramCodes = unique(
        pictograms.map(({ alt }) => alt.toUpperCase()),
      ).sort();
      const pictogramSides = pictograms.map(({ rect }) =>
        Math.min(rect.width, rect.height),
      );
      const minPictogramSidePx =
        pictogramSides.length > 0 ? Math.min(...pictogramSides) : 0;

      return {
        bodyTextSample: bodyText.slice(0, 500),
        labelKind: label?.className.includes("label-kind-complete-primary")
          ? "complete-primary"
          : label?.className.includes("label-kind-quick-id")
            ? "quick-id"
            : label?.className.includes("label-kind-supplemental")
              ? "supplemental"
              : label?.className.includes("label-kind-qr-supplement")
                ? "qr-supplement"
                : "",
        pictogramCodes,
        hasQrImage: qrImages.length > 0,
        hasPreparedTexts: expectedPreparedTexts.every((text) =>
          normalizedBodyText.includes(normalized(text)),
        ),
        hasPreparedBadge:
          document.querySelectorAll(".prepared-badge, .meta-chip-prepared")
            .length > 0,
        hasCas: normalizedBodyText.includes("7647-01-0"),
        labelVisible: Boolean(
          labelRect && labelRect.width > 0 && labelRect.height > 0,
        ),
        labelWithinViewport: labelRect
          ? containsRect(viewportRect, labelRect)
          : false,
        documentHasScrollOverflow:
          document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 2 ||
          document.documentElement.scrollHeight >
            document.documentElement.clientHeight + 2,
        clippedCriticalElements,
        clippedContentElements,
        minPictogramSidePx: round(minPictogramSidePx),
        pictogramSizeOk: minPictogramSidePx >= expectedMinPictogramSidePx,
        qrStateOk: Boolean(qrImages.length) === Boolean(expectedHasQr),
        geometry: {
          label: labelRect ? rectToObject(labelRect) : null,
          pictograms: pictograms.map(({ rect }) => rectToObject(rect)),
        },
      };
    },
    {
      expectedPreparedTexts: testCase.expectedPreparedTexts,
      expectedHasQr: Boolean(testCase.expectedHasQr),
      expectedMinPictogramSidePx:
        Number(testCase.expectedMinPictogramSidePx) || 0,
    },
  );
};

const mergePreviewEvidence = (first, second) => {
  if (!second) return first;
  const qrContinuationStateOk =
    first.labelKind === "qr-supplement" &&
    first.hasQrImage === true &&
    second.hasQrImage === false;
  return {
    ...first,
    pictogramCodes: [...new Set([
      ...(first.pictogramCodes || []),
      ...(second.pictogramCodes || []),
    ])].sort(),
    hasQrImage: first.hasQrImage || second.hasQrImage,
    hasPreparedTexts: first.hasPreparedTexts && second.hasPreparedTexts,
    hasPreparedBadge: first.hasPreparedBadge || second.hasPreparedBadge,
    hasCas: first.hasCas && second.hasCas,
    clippedCriticalElements: [
      ...(first.clippedCriticalElements || []),
      ...(second.clippedCriticalElements || []),
    ],
    clippedContentElements: [
      ...(first.clippedContentElements || []),
      ...(second.clippedContentElements || []),
    ],
    minPictogramSidePx: Math.min(
      first.minPictogramSidePx || 0,
      second.minPictogramSidePx || 0,
    ),
    pictogramSizeOk: first.pictogramSizeOk && second.pictogramSizeOk,
    qrStateOk: qrContinuationStateOk
      ? first.qrStateOk
      : first.qrStateOk && second.qrStateOk,
    nextPreview: second,
  };
};

const readPrintStatus = async (page) => {
  await page.evaluate(() => {
    document.getElementById("ghs-print-qa-status")?.remove();
  });
  const printButton = page.getByTestId("print-label-action");
  const printButtonEnabled = !(await printButton.isDisabled());
  if (!printButtonEnabled) {
    return {
      printButtonEnabled,
      attributes: Object.fromEntries(
        STATUS_ATTRIBUTES.map((attribute) => [attribute, null]),
      ),
      text: ((await printButton.textContent().catch(() => "")) || "").trim(),
    };
  }
  await printButton.click();
  const status = page.locator("#ghs-print-qa-status");
  await status.waitFor({ state: "attached", timeout: 15000 });
  await page.waitForFunction(
    () => {
      const element = document.getElementById("ghs-print-qa-status");
      return ["qa_handoff", "blocked"].includes(element?.dataset?.status || "");
    },
    { timeout: 15000 },
  );
  return {
    printButtonEnabled,
    attributes: await getAttributeMap(status, STATUS_ATTRIBUTES),
    text: (await status.textContent()) || "",
  };
};

const evaluateCase = ({
  testCase,
  selectedSummary,
  preview,
  status,
  entryEvidence = {},
}) => {
  const failures = [];
  const assert = (name, passed) => {
    if (!passed) failures.push(name);
  };
  const attrs = status.attributes || {};
  const handoffPictograms = (attrs["data-pictograms"] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();
  const recentText = normalizeText(entryEvidence.recentText || "");

  if (testCase.entryMode === "reprint") {
    assert("reprint-recent-concentration", recentText.includes("1 m"));
    assert("reprint-recent-solvent", recentText.includes("water"));
    assert("reprint-recent-prepared-by", recentText.includes("qa analyst"));
    assert(
      "reprint-recent-prepared-date",
      recentText.includes(PREPARED_FORM.preparedDate),
    );
    assert(
      "reprint-recent-expiry-date",
      recentText.includes(PREPARED_FORM.expiryDate),
    );
  }
  if (testCase.entryMode === "preset") {
    const savedPresetText = normalizeText(entryEvidence.savedPresetText || "");
    const reopenedPresetText = normalizeText(entryEvidence.reopenedPresetText || "");
    const prefillValues = entryEvidence.prefillValues || {};
    const finalValues = entryEvidence.finalValues || {};
    assert("preset-save-does-not-open-print", !entryEvidence.printModalAfterSaveVisible);
    assert("preset-saved-name", savedPresetText.includes(normalizeText(PREPARED_PRESET_NAME)));
    assert("preset-saved-concentration", savedPresetText.includes("1 m"));
    assert("preset-saved-solvent", savedPresetText.includes("water"));
    assert("preset-saved-no-stale-operator", !savedPresetText.includes("stale operator"));
    assert("preset-saved-no-stale-date", !savedPresetText.includes("2020-01-01"));
    assert("preset-reopened-name", reopenedPresetText.includes(normalizeText(PREPARED_PRESET_NAME)));
    assert("preset-prefill-concentration", prefillValues.concentration === PREPARED_FORM.concentration);
    assert("preset-prefill-solvent", prefillValues.solvent === PREPARED_FORM.solvent);
    assert("preset-prefill-name", prefillValues.presetName === PREPARED_PRESET_NAME);
    assert("preset-prefill-clears-prepared-by", prefillValues.preparedBy === "");
    assert("preset-prefill-clears-expiry", prefillValues.expiryDate === "");
    assert(
      "preset-prefill-resets-prepared-date",
      Boolean(prefillValues.preparedDate) &&
        prefillValues.preparedDate !== STALE_PRESET_OPERATIONAL.preparedDate,
    );
    assert("preset-final-prepared-by", finalValues.preparedBy === PREPARED_FORM.preparedBy);
    assert("preset-final-prepared-date", finalValues.preparedDate === PREPARED_FORM.preparedDate);
    assert("preset-final-expiry-date", finalValues.expiryDate === PREPARED_FORM.expiryDate);
  }
  assert("selected-prepared-display-visible", selectedSummary.displayVisible);
  assert(
    "selected-prepared-meta",
    normalizeText(selectedSummary.metaText).includes("1 m") &&
      normalizeText(selectedSummary.metaText).includes("water"),
  );
  assert(
    "selected-prepared-operational",
    normalizeText(selectedSummary.operationalText).includes("qa analyst") &&
      normalizeText(selectedSummary.operationalText).includes(
        PREPARED_FORM.preparedDate,
      ) &&
      normalizeText(selectedSummary.operationalText).includes(
        PREPARED_FORM.expiryDate,
      ),
  );
  assert("preview-label-kind", preview.labelKind === testCase.expectedLabelKind);
  assert("preview-label-visible", preview.labelVisible);
  assert("preview-label-within-viewport", preview.labelWithinViewport);
  assert("preview-no-scroll-overflow", !preview.documentHasScrollOverflow);
  assert(
    "preview-has-prepared-badge",
    preview.hasPreparedBadge === (testCase.expectedHasPreparedBadge !== false),
  );
  assert("preview-has-prepared-texts", preview.hasPreparedTexts);
  assert("preview-has-cas", preview.hasCas);
  assert("preview-qr-state", preview.qrStateOk);
  assert("preview-pictograms", sameMembers(preview.pictogramCodes, EXPECTED_PICTOGRAMS));
  assert("preview-pictogram-size", preview.pictogramSizeOk);
  assert(
    "preview-critical-elements-visible",
    preview.clippedCriticalElements.length === 0,
  );
  assert(
    "preview-content-not-clipped",
    preview.clippedContentElements.length === 0,
  );
  assert("print-button-enabled", status.printButtonEnabled);
  assert("status", attrs["data-status"] === "qa_handoff");
  assert("label-kind", attrs["data-label-kind"] === testCase.expectedLabelKind);
  assert("stock-preset", attrs["data-stock-preset"] === testCase.stockPreset);
  assert("template", attrs["data-template"] === testCase.expectedTemplate);
  assert("has-qr", attrs["data-has-qr"] === String(Boolean(testCase.expectedHasQr)));
  assert("has-cas", attrs["data-has-cas"] === "true");
  assert("cas-number", (attrs["data-cas-numbers"] || "").includes("7647-01-0"));
  assert("pictograms", sameMembers(handoffPictograms, EXPECTED_PICTOGRAMS));
  assert("issue-types", !(attrs["data-issue-types"] || ""));

  return {
    id: testCase.id,
    label: testCase.label,
    passed: failures.length === 0,
    failures,
    entryMode: testCase.entryMode || "create",
    entryEvidence,
    selectedSummary,
    preview,
    status: attrs,
    statusText: status.text || "",
  };
};

const runCase = async ({ browser, testCase }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  try {
    await page.addInitScript(() => {
      localStorage.removeItem("ghs_prepared_recents");
      localStorage.removeItem("ghs_prepared_presets");
    });
    await page.goto(withQaParam(productionUrl), { waitUntil: "domcontentloaded" });
    let entryEvidence = {};
    if (testCase.entryMode === "reprint") {
      entryEvidence = await openPreparedReprintModal(page);
    } else if (testCase.entryMode === "preset") {
      entryEvidence = await openPreparedPresetPrintModal(page);
    } else {
      await openPreparedPrintModal(page);
    }
    await fillResponsibleProfile(page);
    await setTargetAndStock(page, testCase);
    const selectedSummary = await inspectSelectedPreparedSummary(page);
    let preview = await inspectPreviewFrame(page, testCase);
    if (Number(testCase.expectedMinTotalLabels || 1) > 1) {
      await page.getByTestId("preview-page-next").click();
      await page.waitForTimeout(300);
      const nextPreview = await inspectPreviewFrame(page, testCase);
      preview = mergePreviewEvidence(preview, nextPreview);
    }
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${testCase.id}.png`);
    await page.getByTestId("label-fragment-preview").screenshot({
      path: screenshotPath,
    });
    preview.screenshotPath = screenshotPath;
    const status = await readPrintStatus(page);
    return evaluateCase({
      testCase,
      selectedSummary,
      preview,
      status,
      entryEvidence,
    });
  } catch (error) {
    const failure = {
      id: testCase.id,
      label: testCase.label,
      passed: false,
      failures: ["runner-error"],
      error: error?.message || String(error),
    };
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${testCase.id}-error.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    failure.screenshotPath = screenshotPath;
    return failure;
  } finally {
    await page.close().catch(() => {});
  }
};

const executablePath = resolveChromeExecutable();
const startedAt = new Date().toISOString();
const browser = await chromium.launch({
  executablePath,
  headless,
  args: ["--disable-dev-shm-usage"],
});

const results = [];
try {
  for (const testCase of ALL_PREPARED_CASES) {
    // eslint-disable-next-line no-console
    console.log(`Running production prepared print QA: ${testCase.id}`);
    results.push(await runCase({ browser, testCase }));
  }
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.passed);
const result = {
  ok: failed.length === 0,
  startedAt,
  finishedAt: new Date().toISOString(),
  productionUrl,
  executablePath,
  headless,
  reportPath: outputPath,
  screenshotDir,
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  failedCases: failed.map(({ id, failures, error, screenshotPath }) => ({
    id,
    failures,
    error,
    screenshotPath,
  })),
  results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${maybeJson(result)}${os.EOL}`);

console.log(
  maybeJson(
    verboseConsole
      ? result
      : {
          ok: result.ok,
          productionUrl: result.productionUrl,
          reportPath: result.reportPath,
          screenshotDir: result.screenshotDir,
          summary: result.summary,
          failedCases: result.failedCases,
        },
  ),
);

if (!result.ok) {
  process.exitCode = 1;
}
