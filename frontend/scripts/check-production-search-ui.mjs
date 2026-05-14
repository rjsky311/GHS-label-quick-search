import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const env = process.env;
const productionUrl = env.PRINT_QA_PRODUCTION_URL || "https://ghs-frontend.zeabur.app/";
const outputPath = path.resolve(
  process.cwd(),
  env.PRODUCTION_SEARCH_UI_REPORT_PATH ||
    "build/production-search-ui-report.json",
);
const screenshotDir = path.resolve(
  process.cwd(),
  env.PRODUCTION_SEARCH_UI_SCREENSHOT_DIR ||
    "build/production-search-ui-screenshots",
);
const mobileViewport = {
  width: Number.parseInt(env.PRODUCTION_SEARCH_UI_MOBILE_WIDTH || "390", 10),
  height: Number.parseInt(env.PRODUCTION_SEARCH_UI_MOBILE_HEIGHT || "844", 10),
};
const searchTerm = env.PRODUCTION_SEARCH_UI_TERM || "7647-01-0";
const headless = env.PRINT_QA_HEADLESS !== "0";
const SEARCH_UI_ATTEMPTS = Number.parseInt(
  env.PRODUCTION_SEARCH_UI_ATTEMPTS || "3",
  10,
);
const SEARCH_UI_TIMEOUT_MS = Number.parseInt(
  env.PRODUCTION_SEARCH_UI_TIMEOUT_MS || "60000",
  10,
);
const SEARCH_UI_RETRY_DELAY_MS = Number.parseInt(
  env.PRODUCTION_SEARCH_UI_RETRY_DELAY_MS || "4000",
  10,
);
const SUPPORT_REPORT_DATA_URL =
  "https://github.com/rjsky311/GHS-label-quick-search/issues/new?labels=data-correction";
const SUPPORT_WORKFLOW_REQUEST_URL =
  "https://github.com/rjsky311/GHS-label-quick-search/issues/new?labels=workflow-request";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        "Could not find a local Chrome/Edge executable for production search UI QA.",
        "Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH to the browser executable path.",
      ].join(" "),
    );
  }
  return found;
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("productionSearchUiQa", Date.now().toString());
  return nextUrl.toString();
};

const inspectActionButton = async (page, testId) =>
  page.getByTestId(testId).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return {
      text: (node.textContent || "").replace(/\s+/g, " ").trim(),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      whiteSpace: style.whiteSpace,
    };
  });

const isVerticalTextRisk = ({ text, width, height }) =>
  text.length >= 3 && height > width * 1.8 && width < 90;

const isRectInsideViewport = (rect, viewportWidth) =>
  rect &&
  rect.x >= -1 &&
  rect.right <= viewportWidth + 1 &&
  rect.width > 0 &&
  rect.height > 0;

const inspectPictogramStrip = async (locator, label) =>
  locator.evaluate((node, stripLabel) => {
    const rect = node.getBoundingClientRect();
    const tiles = Array.from(
      node.querySelectorAll('[data-testid="ghs-pictogram-tile"]'),
    ).map((tile) => {
      const tileRect = tile.getBoundingClientRect();
      const frame = tile.querySelector('[data-testid="ghs-pictogram-frame"]');
      const frameRect = frame?.getBoundingClientRect();
      const image = tile.querySelector("img");
      const imageRect = image?.getBoundingClientRect();
      const codeLabel = tile.querySelector('[data-testid="ghs-pictogram-code"]');
      return {
        code: tile.getAttribute("data-ghs-code") || "",
        tileWidth: Math.round(tileRect.width),
        tileHeight: Math.round(tileRect.height),
        frameWidth: Math.round(frameRect?.width || 0),
        frameHeight: Math.round(frameRect?.height || 0),
        imageWidth: Math.round(imageRect?.width || 0),
        imageHeight: Math.round(imageRect?.height || 0),
        imageComplete: Boolean(image?.complete),
        naturalWidth: image?.naturalWidth || 0,
        naturalHeight: image?.naturalHeight || 0,
        codeText: (codeLabel?.textContent || "").trim(),
      };
    });
    return {
      label: stripLabel,
      size: node.getAttribute("data-size") || "",
      variant: node.getAttribute("data-variant") || "",
      count: Number.parseInt(node.getAttribute("data-count") || "", 10) ||
        tiles.length,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      tiles,
    };
  }, label);

const waitForImagesInLocator = async (locator, label) =>
  locator.evaluate(async (node, waitLabel) => {
    const images = Array.from(node.querySelectorAll("img"));
    const results = await Promise.all(
      images.map((image, index) => {
        if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
          return { index, ok: true };
        }
        return new Promise((resolve) => {
          const timer = window.setTimeout(
            () =>
              resolve({
                index,
                ok: false,
                src: image.currentSrc || image.src || "",
              }),
            15000,
          );
          image.addEventListener(
            "load",
            () => {
              window.clearTimeout(timer);
              resolve({ index, ok: image.naturalWidth > 0 });
            },
            { once: true },
          );
          image.addEventListener(
            "error",
            () => {
              window.clearTimeout(timer);
              resolve({
                index,
                ok: false,
                src: image.currentSrc || image.src || "",
              });
            },
            { once: true },
          );
        });
      }),
    );
    return {
      label: waitLabel,
      count: results.length,
      failed: results.filter((result) => !result.ok),
    };
  }, label);

const validatePictogramStrip = (
  metrics,
  failurePrefix,
  {
    minCount = 1,
    minFrame = 30,
    maxFrame = 80,
    maxAspectDelta = 4,
    requireImage = true,
  } = {},
) => {
  const stripFailures = [];
  if (!metrics) {
    return [`${failurePrefix}-missing`];
  }
  if (metrics.count < minCount || metrics.tiles.length < minCount) {
    stripFailures.push(`${failurePrefix}-count`);
  }
  metrics.tiles.forEach((tile) => {
    const code = tile.code || "unknown";
    if (tile.frameWidth < minFrame || tile.frameHeight < minFrame) {
      stripFailures.push(`${failurePrefix}-${code}-frame-too-small`);
    }
    if (tile.frameWidth > maxFrame || tile.frameHeight > maxFrame) {
      stripFailures.push(`${failurePrefix}-${code}-frame-too-large`);
    }
    if (Math.abs(tile.frameWidth - tile.frameHeight) > maxAspectDelta) {
      stripFailures.push(`${failurePrefix}-${code}-frame-not-square`);
    }
    if (requireImage && (tile.imageWidth < minFrame * 0.65 || tile.imageHeight < minFrame * 0.65)) {
      stripFailures.push(`${failurePrefix}-${code}-image-too-small`);
    }
    if (
      requireImage &&
      (!tile.imageComplete || tile.naturalWidth <= 0 || tile.naturalHeight <= 0)
    ) {
      stripFailures.push(`${failurePrefix}-${code}-image-not-loaded`);
    }
  });
  return stripFailures;
};

const allowedReferenceLinkTypes = new Set([
  "sds",
  "regulatory",
  "occupational",
  "reference",
]);

const inspectResultsTrustSurface = async (page) => {
  const note = page.getByTestId("authoritative-source-note-results");
  const checklist = page.getByTestId("authoritative-source-checklist-results");
  const panel = page.getByTestId("product-trust-panel-results");
  const sdsButton = page.getByTestId("sds-btn-0");
  const sdsHref = (await sdsButton.getAttribute("href").catch(() => "")) || "";
  let sdsProtocol = "";
  let sdsHost = "";
  try {
    const parsed = new URL(sdsHref);
    sdsProtocol = parsed.protocol.replace(":", "");
    sdsHost = parsed.hostname;
  } catch {
    sdsProtocol = "";
    sdsHost = "";
  }

  return {
    authoritativeNoteCount: await note.count(),
    authoritativeNoteMode: await note
      .first()
      .getAttribute("data-mode")
      .catch(() => null),
    checklistCount: await checklist
      .locator("span")
      .count()
      .catch(() => 0),
    productTrustPanelCount: await panel.count(),
    productTrustProofCount: await page
      .getByTestId("product-trust-proof-list-results")
      .locator("h3")
      .count()
      .catch(() => 0),
    productTrustReportHref:
      (await page
        .getByTestId("product-trust-report-link-results")
        .getAttribute("href")
        .catch(() => "")) || "",
    productTrustWorkflowHref:
      (await page
        .getByTestId("product-trust-workflow-link-results")
        .getAttribute("href")
        .catch(() => "")) || "",
    sourceBadges: await page
      .locator('[data-testid^="source-badge-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          testId: node.getAttribute("data-testid") || "",
          text: (node.textContent || "").replace(/\s+/g, " ").trim(),
          title: node.getAttribute("title") || "",
        })),
      ),
    sdsHref,
    sdsProtocol,
    sdsHost,
  };
};

const inspectDetailTrustSurface = async (detailModal) => {
  const references = [];
  const referenceLinks = detailModal.locator(
    'a[data-testid^="detail-reference-link-"]',
  );
  const referenceCount = await referenceLinks.count();
  for (let index = 0; index < referenceCount; index += 1) {
    const link = referenceLinks.nth(index);
    references.push({
      testId: (await link.getAttribute("data-testid")) || "",
      href: (await link.getAttribute("href")) || "",
      linkType: (await link.getAttribute("data-link-type")) || "",
      source: (await link.getAttribute("data-reference-source")) || "",
      scheme: (await link.getAttribute("data-reference-url-scheme")) || "",
      sourceChipText:
        (await link
          .locator('[data-testid^="detail-reference-source-"]')
          .first()
          .textContent()
          .catch(() => "")) || "",
    });
  }
  return {
    trustStripCount: await detailModal.getByTestId("detail-trust-strip").count(),
    authoritativeNoteCount: await detailModal
      .getByTestId("authoritative-source-note-detail")
      .count(),
    verificationHintCount: await detailModal
      .getByTestId("detail-reference-verification-hint")
      .count(),
    references,
  };
};

const searchUntilUsableResult = async (page) => {
  let lastError = null;
  for (let attempt = 1; attempt <= SEARCH_UI_ATTEMPTS; attempt += 1) {
    await page.getByTestId("single-cas-input").fill(searchTerm);
    await page.getByTestId("single-search-btn").click();
    await page.getByTestId("result-row-0").waitFor({
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    const detailButton = page.getByTestId("detail-btn-0");
    if (
      (await detailButton
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => true)
        .catch(() => false)) === true
    ) {
      return attempt;
    }
    const rowText =
      ((await page.getByTestId("result-row-0").textContent().catch(() => "")) ||
        "")
        .replace(/\s+/g, " ")
        .trim();
    lastError = new Error(
      `Search attempt ${attempt} did not produce a usable detail action: ${rowText}`,
    );
    if (attempt < SEARCH_UI_ATTEMPTS) {
      await sleep(SEARCH_UI_RETRY_DELAY_MS);
      await page.reload({ waitUntil: "networkidle" });
    }
  }
  throw lastError || new Error("Search did not produce a usable result.");
};

const inspectMobileReadFirstResult = async (page) =>
  page.evaluate(() => {
    const serializeRect = (node) => {
      const rect = node?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      };
    };
    const table = document.querySelector('[data-testid="results-table"]');
    const wrapper = document.querySelector('[data-testid="results-table-scroll"]');
    const detailButton = document.querySelector('[data-testid="detail-btn-0"]');
    const sdsButton = document.querySelector('[data-testid="sds-btn-0"]');
    const firstRow = document.querySelector('[data-testid="result-row-0"]');
    const tableStyle = table ? window.getComputedStyle(table) : null;
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      resultsClientWidth: wrapper?.clientWidth || 0,
      resultsScrollWidth: wrapper?.scrollWidth || 0,
      tableDisplay: tableStyle?.display || "",
      tableRect: serializeRect(table),
      rowRect: serializeRect(firstRow),
      detailButton: serializeRect(detailButton),
      sdsButton: serializeRect(sdsButton),
      rowText: (firstRow?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });

const inspectMobileDetailReadFirstResult = async (page) =>
  page.evaluate(() => {
    const serializeRect = (node) => {
      const rect = node?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      };
    };
    const modal = document.querySelector('[data-testid="detail-modal"]');
    const panel = modal?.querySelector(":scope > div");
    const comparison = document.querySelector('[data-testid="comparison-table"]');
    const cards = Array.from(
      document.querySelectorAll('[data-testid^="comparison-mobile-card-"]'),
    );
    const firstCard = cards[0];
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      modalRect: serializeRect(modal),
      panelRect: serializeRect(panel),
      panelClientWidth: panel?.clientWidth || 0,
      panelScrollWidth: panel?.scrollWidth || 0,
      comparisonLayout: comparison?.getAttribute("data-layout") || "",
      comparisonRect: serializeRect(comparison),
      comparisonClientWidth: comparison?.clientWidth || 0,
      comparisonScrollWidth: comparison?.scrollWidth || 0,
      cardCount: cards.length,
      firstCardRect: serializeRect(firstCard),
      modalText: (modal?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });

const failures = [];
let browser;

try {
  const executablePath = resolveChromeExecutable();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  browser = await chromium.launch({
    executablePath,
    headless,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(withQaParam(productionUrl), { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const searchAttempts = await searchUntilUsableResult(page);

  const screenshotPath = path.join(screenshotDir, "search-results.png");

  const detailButton = await inspectActionButton(page, "detail-btn-0");
  const sdsButton = await inspectActionButton(page, "sds-btn-0");
  const actionButtons = [detailButton, sdsButton];
  const verticalRisks = actionButtons.filter(isVerticalTextRisk);
  const resultsTrustSurface = await inspectResultsTrustSurface(page);

  if (resultsTrustSurface.authoritativeNoteCount < 1) {
    failures.push("results-authoritative-note-missing");
  }
  if (resultsTrustSurface.authoritativeNoteMode !== "general") {
    failures.push("results-authoritative-note-mode-mismatch");
  }
  if (resultsTrustSurface.checklistCount < 3) {
    failures.push("results-authoritative-checklist-incomplete");
  }
  if (resultsTrustSurface.productTrustPanelCount < 1) {
    failures.push("results-product-trust-panel-missing");
  }
  if (resultsTrustSurface.productTrustProofCount < 3) {
    failures.push("results-product-trust-proof-list-incomplete");
  }
  if (resultsTrustSurface.productTrustReportHref !== SUPPORT_REPORT_DATA_URL) {
    failures.push("results-product-trust-report-link-mismatch");
  }
  if (
    resultsTrustSurface.productTrustWorkflowHref !==
    SUPPORT_WORKFLOW_REQUEST_URL
  ) {
    failures.push("results-product-trust-workflow-link-mismatch");
  }
  if (resultsTrustSurface.sourceBadges.length < 1) {
    failures.push("results-source-badge-missing");
  }
  if (
    resultsTrustSurface.sdsProtocol !== "https" ||
    resultsTrustSurface.sdsHost !== "pubchem.ncbi.nlm.nih.gov" ||
    !resultsTrustSurface.sdsHref.includes("Safety-and-Hazards")
  ) {
    failures.push("results-sds-link-not-pubchem-safety");
  }

  if (verticalRisks.length > 0) {
    failures.push("result-action-button-vertical-text");
  }
  actionButtons.forEach((button) => {
    if (button.whiteSpace !== "nowrap") {
      failures.push(`result-action-${button.text}-not-nowrap`);
    }
    if (button.height > 44) {
      failures.push(`result-action-${button.text}-too-tall`);
    }
    if (button.width < 68) {
      failures.push(`result-action-${button.text}-too-narrow`);
    }
  });

  const imageWaits = [];
  const pictogramStrip = page.getByTestId("ghs-pictogram-strip").first();
  const resultImageWait = await waitForImagesInLocator(
    pictogramStrip,
    "primary-result-row",
  );
  imageWaits.push(resultImageWait);
  if (resultImageWait.failed.length > 0) {
    failures.push("result-ghs-pictogram-image-load-timeout");
  }
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const resultPictogramMetrics = await inspectPictogramStrip(
    pictogramStrip,
    "primary-result-row",
  );
  failures.push(
    ...validatePictogramStrip(resultPictogramMetrics, "result-ghs-pictogram", {
      minCount: 4,
      minFrame: 36,
      maxFrame: 58,
    }),
  );
  const pictogramTiles = resultPictogramMetrics.tiles.length;

  const otherToggle = page.locator(
    '[data-testid^="other-classifications-toggle-"]',
  ).first();
  const expandedPictogramMetrics = [];
  let expandedClassificationCount = 0;
  let expandedScreenshotPath = null;
  if ((await otherToggle.count()) === 0) {
    failures.push("other-classifications-toggle-missing");
  } else {
    const toggleId = await otherToggle.getAttribute("data-testid");
    const casSuffix = toggleId?.replace("other-classifications-toggle-", "");
    await otherToggle.click();
    const expandedPanel = page.getByTestId(`other-classifications-${casSuffix}`);
    await expandedPanel.waitFor({ state: "visible", timeout: 10000 });
    const expandedImageWait = await waitForImagesInLocator(
      expandedPanel,
      "expanded-classifications",
    );
    imageWaits.push(expandedImageWait);
    if (expandedImageWait.failed.length > 0) {
      failures.push("other-classification-pictogram-image-load-timeout");
    }
    expandedScreenshotPath = path.join(
      screenshotDir,
      "search-results-expanded-classifications.png",
    );
    await page.screenshot({ path: expandedScreenshotPath, fullPage: false });

    const expandedCards = page.locator(
      '[data-testid^="other-classification-option-"]',
    );
    expandedClassificationCount = await expandedCards.count();
    if (expandedClassificationCount < 1) {
      failures.push("other-classifications-empty");
    }
    for (let index = 0; index < expandedClassificationCount; index += 1) {
      const strip = expandedCards.nth(index).getByTestId("ghs-pictogram-strip");
      if ((await strip.count()) === 0) {
        failures.push(`other-classification-${index}-pictogram-strip-missing`);
        continue;
      }
      const metrics = await inspectPictogramStrip(
        strip,
        `other-classification-${index}`,
      );
      expandedPictogramMetrics.push(metrics);
      failures.push(
        ...validatePictogramStrip(
          metrics,
          `other-classification-${index}-pictogram`,
          {
            minCount: 1,
            minFrame: 30,
            maxFrame: 50,
          },
        ),
      );
    }
  }

  await page.getByTestId("detail-btn-0").click();
  const detailModal = page.getByTestId("detail-modal");
  await detailModal.waitFor({ state: "visible", timeout: 10000 });
  const detailTrustSurface = await inspectDetailTrustSurface(detailModal);
  if (detailTrustSurface.trustStripCount < 1) {
    failures.push("detail-trust-strip-missing");
  }
  if (detailTrustSurface.authoritativeNoteCount < 1) {
    failures.push("detail-authoritative-note-missing");
  }
  if (detailTrustSurface.verificationHintCount < 1) {
    failures.push("detail-reference-verification-hint-missing");
  }
  if (detailTrustSurface.references.length < 3) {
    failures.push("detail-reference-links-incomplete");
  }
  const detailReferenceTypes = new Set(
    detailTrustSurface.references.map((reference) => reference.linkType),
  );
  if (!detailReferenceTypes.has("sds")) {
    failures.push("detail-reference-sds-link-missing");
  }
  if (!detailReferenceTypes.has("regulatory")) {
    failures.push("detail-reference-regulatory-link-missing");
  }
  detailTrustSurface.references.forEach((reference) => {
    const label = reference.testId || "unknown";
    if (!allowedReferenceLinkTypes.has(reference.linkType)) {
      failures.push(`${label}-invalid-link-type`);
    }
    if (!["http", "https"].includes(reference.scheme)) {
      failures.push(`${label}-unsafe-url-scheme`);
    }
    if (!reference.source) {
      failures.push(`${label}-source-missing`);
    }
    if (!reference.sourceChipText.trim()) {
      failures.push(`${label}-source-chip-missing`);
    }
  });
  const detailComparisonTable = detailModal.getByTestId("comparison-table");
  await detailComparisonTable.waitFor({ state: "visible", timeout: 10000 });
  const detailImageWait = await waitForImagesInLocator(
    detailComparisonTable,
    "detail-comparison-table",
  );
  imageWaits.push(detailImageWait);
  if (detailImageWait.failed.length > 0) {
    failures.push("detail-comparison-pictogram-image-load-timeout");
  }

  const detailScreenshotPath = path.join(
    screenshotDir,
    "detail-modal-classification-comparison.png",
  );
  await page.screenshot({ path: detailScreenshotPath, fullPage: false });

  const detailComparisonMetrics = [];
  const detailComparisonColumns = detailComparisonTable.locator(
    '[data-testid^="comparison-pictograms-"]',
  );
  const detailComparisonColumnCount = await detailComparisonColumns.count();
  if (detailComparisonColumnCount < 2) {
    failures.push("detail-comparison-columns-missing");
  }
  for (let index = 0; index < detailComparisonColumnCount; index += 1) {
    const strip = detailComparisonColumns.nth(index).getByTestId(
      "ghs-pictogram-strip",
    );
    if ((await strip.count()) === 0) {
      failures.push(`detail-comparison-${index}-pictogram-strip-missing`);
      continue;
    }
    const metrics = await inspectPictogramStrip(
      strip,
      `detail-comparison-${index}`,
    );
    detailComparisonMetrics.push(metrics);
    failures.push(
      ...validatePictogramStrip(metrics, `detail-comparison-${index}-pictogram`, {
        minCount: index === 0 ? 4 : 1,
        minFrame: 40,
        maxFrame: 60,
      }),
    );
  }
  if (detailComparisonMetrics[0]?.variant !== "selected") {
    failures.push("detail-comparison-current-variant-mismatch");
  }
  if ((detailComparisonMetrics[0]?.tiles || []).length !== pictogramTiles) {
    failures.push("detail-comparison-current-pictogram-count-mismatch");
  }

  const mobileContext = await browser.newContext({
    viewport: mobileViewport,
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(withQaParam(productionUrl), { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload({ waitUntil: "networkidle" });
  const mobileSearchAttempts = await searchUntilUsableResult(mobilePage);
  const mobileScreenshotPath = path.join(
    screenshotDir,
    "search-results-mobile-read-first.png",
  );
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });
  const mobileReadFirst = await inspectMobileReadFirstResult(mobilePage);
  await mobilePage.getByTestId("detail-btn-0").click();
  const mobileDetailModal = mobilePage.getByTestId("detail-modal");
  await mobileDetailModal.waitFor({ state: "visible", timeout: 10000 });
  const mobileDetailComparisonTable =
    mobileDetailModal.getByTestId("comparison-table");
  await mobileDetailComparisonTable.waitFor({ state: "visible", timeout: 10000 });
  const mobileDetailImageWait = await waitForImagesInLocator(
    mobileDetailComparisonTable,
    "mobile-detail-comparison",
  );
  imageWaits.push(mobileDetailImageWait);
  if (mobileDetailImageWait.failed.length > 0) {
    failures.push("mobile-detail-comparison-pictogram-image-load-timeout");
  }
  const mobileDetailScreenshotPath = path.join(
    screenshotDir,
    "search-results-mobile-detail-read-first.png",
  );
  await mobilePage.screenshot({
    path: mobileDetailScreenshotPath,
    fullPage: false,
  });
  const mobileDetailReadFirst =
    await inspectMobileDetailReadFirstResult(mobilePage);
  const mobileDetailComparisonMetrics = [];
  const mobileDetailComparisonCards = mobileDetailModal.locator(
    '[data-testid^="comparison-mobile-pictograms-"]',
  );
  const mobileDetailComparisonCardCount =
    await mobileDetailComparisonCards.count();
  if (mobileDetailComparisonCardCount < 2) {
    failures.push("mobile-detail-comparison-cards-missing");
  }
  for (let index = 0; index < mobileDetailComparisonCardCount; index += 1) {
    const strip = mobileDetailComparisonCards.nth(index).getByTestId(
      "ghs-pictogram-strip",
    );
    if ((await strip.count()) === 0) {
      failures.push(`mobile-detail-comparison-${index}-pictogram-strip-missing`);
      continue;
    }
    const metrics = await inspectPictogramStrip(
      strip,
      `mobile-detail-comparison-${index}`,
    );
    mobileDetailComparisonMetrics.push(metrics);
    failures.push(
      ...validatePictogramStrip(
        metrics,
        `mobile-detail-comparison-${index}-pictogram`,
        {
          minCount: index === 0 ? 4 : 1,
          minFrame: 40,
          maxFrame: 60,
        },
      ),
    );
  }
  await mobileContext.close();

  if (
    mobileReadFirst.documentScrollWidth > mobileReadFirst.viewportWidth + 2 ||
    mobileReadFirst.bodyScrollWidth > mobileReadFirst.viewportWidth + 2
  ) {
    failures.push("mobile-read-first-page-horizontal-overflow");
  }
  if (
    mobileReadFirst.resultsScrollWidth >
    mobileReadFirst.resultsClientWidth + 2
  ) {
    failures.push("mobile-read-first-results-horizontal-scroll");
  }
  if (
    !isRectInsideViewport(
      mobileReadFirst.detailButton,
      mobileReadFirst.viewportWidth,
    )
  ) {
    failures.push("mobile-read-first-detail-action-offscreen");
  }
  if (
    !isRectInsideViewport(mobileReadFirst.sdsButton, mobileReadFirst.viewportWidth)
  ) {
    failures.push("mobile-read-first-sds-action-offscreen");
  }
  if (!/Hydrochloric acid|鹽酸|Hydrochloric Acid/.test(mobileReadFirst.rowText)) {
    failures.push("mobile-read-first-result-identity-missing");
  }

  if (
    mobileDetailReadFirst.documentScrollWidth >
      mobileDetailReadFirst.viewportWidth + 2 ||
    mobileDetailReadFirst.bodyScrollWidth >
      mobileDetailReadFirst.viewportWidth + 2
  ) {
    failures.push("mobile-detail-page-horizontal-overflow");
  }
  if (
    mobileDetailReadFirst.panelScrollWidth >
    mobileDetailReadFirst.panelClientWidth + 2
  ) {
    failures.push("mobile-detail-panel-horizontal-scroll");
  }
  if (mobileDetailReadFirst.comparisonLayout !== "mobile-cards") {
    failures.push("mobile-detail-comparison-not-card-layout");
  }
  if (
    mobileDetailReadFirst.comparisonScrollWidth >
    mobileDetailReadFirst.comparisonClientWidth + 2
  ) {
    failures.push("mobile-detail-comparison-horizontal-scroll");
  }
  if (
    !isRectInsideViewport(
      mobileDetailReadFirst.comparisonRect,
      mobileDetailReadFirst.viewportWidth,
    )
  ) {
    failures.push("mobile-detail-comparison-offscreen");
  }
  if (
    !isRectInsideViewport(
      mobileDetailReadFirst.firstCardRect,
      mobileDetailReadFirst.viewportWidth,
    )
  ) {
    failures.push("mobile-detail-first-card-offscreen");
  }

  const report = {
    ok: failures.length === 0,
    productionUrl,
    searchTerm,
    executablePath,
    screenshotPath,
    expandedScreenshotPath,
    detailScreenshotPath,
    mobileScreenshotPath,
    mobileDetailScreenshotPath,
    failures,
    searchAttempts,
    mobileSearchAttempts,
    metrics: {
      detailButton,
      sdsButton,
      pictogramTiles,
      resultPictogramMetrics,
      expandedClassificationCount,
      expandedPictogramMetrics,
      resultsTrustSurface,
      detailTrustSurface,
      detailComparisonColumnCount,
      detailComparisonMetrics,
      imageWaits,
      verticalRisks,
      mobileReadFirst,
      mobileDetailReadFirst,
      mobileDetailComparisonCardCount,
      mobileDetailComparisonMetrics,
    },
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  const report = {
    ok: false,
    productionUrl,
    searchTerm,
    failures: ["production-search-ui-qa-error"],
    error: error?.stack || error?.message || String(error),
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
