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
const browserLocale = env.PRODUCTION_SEARCH_UI_LOCALE || "en-US";
const searchTerm = env.PRODUCTION_SEARCH_UI_TERM || "7647-01-0";
const noGhsSearchTerm = env.PRODUCTION_SEARCH_UI_NO_GHS_TERM || "57-13-6";
const unresolvedSearchTerm =
  env.PRODUCTION_SEARCH_UI_UNRESOLVED_TERM || "999-99-9";
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
const PAGE_NAVIGATION_TIMEOUT_MS = Number.parseInt(
  env.PRODUCTION_SEARCH_UI_NAVIGATION_TIMEOUT_MS || "60000",
  10,
);
const APP_SHELL_TIMEOUT_MS = Number.parseInt(
  env.PRODUCTION_SEARCH_UI_APP_SHELL_TIMEOUT_MS || "60000",
  10,
);
const SUPPORT_REPORT_DATA_URL =
  "https://github.com/rjsky311/GHS-label-quick-search/issues/new?template=data-correction.yml&labels=data-correction";

const findRepoRoot = (startDir) => {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, ".github", "ISSUE_TEMPLATE"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not find repository root from ${path.resolve(startDir)}`,
      );
    }
    current = parent;
  }
};

const repoRoot = findRepoRoot(process.cwd());

const readIssueTemplate = (name) =>
  fs.readFileSync(
    path.join(repoRoot, ".github", "ISSUE_TEMPLATE", name),
    "utf8",
  );

const extractDropdownOptions = (templateText, fieldId) => {
  const idIndex = templateText.indexOf(`id: ${fieldId}`);
  if (idIndex < 0) {
    throw new Error(`Could not find issue-template field: ${fieldId}`);
  }
  const fieldBlock = templateText.slice(idIndex);
  const optionsIndex = fieldBlock.indexOf("options:");
  if (optionsIndex < 0) {
    throw new Error(`Could not find dropdown options for: ${fieldId}`);
  }
  const optionsBlock = fieldBlock.slice(optionsIndex);
  const nextFieldIndex = optionsBlock.search(/\n\s{2}- type:|\n\s+validations:/);
  const boundedOptionsBlock =
    nextFieldIndex >= 0 ? optionsBlock.slice(0, nextFieldIndex) : optionsBlock;
  return new Set(
    [...boundedOptionsBlock.matchAll(/^\s+-\s+(.+?)\s*$/gm)].map((match) =>
      match[1].replace(/^["']|["']$/g, "").trim(),
    ),
  );
};

const extractFieldIds = (templateText) =>
  new Set(
    [...templateText.matchAll(/^\s+id:\s+([A-Za-z0-9_-]+)\s*$/gm)].map(
      (match) => match[1].trim(),
    ),
  );

const dataCorrectionTemplate = readIssueTemplate("data-correction.yml");
const workflowRequestTemplate = readIssueTemplate("workflow-request.yml");
const DATA_CORRECTION_FORM_ISSUE_TYPES = extractDropdownOptions(
  dataCorrectionTemplate,
  "issue_type",
);
const DATA_CORRECTION_FORM_EVIDENCE_TYPES = extractDropdownOptions(
  dataCorrectionTemplate,
  "evidence_type",
);
const WORKFLOW_FORM_AREAS = extractDropdownOptions(
  workflowRequestTemplate,
  "workflow_area",
);
const DATA_CORRECTION_FORM_FIELD_IDS = extractFieldIds(dataCorrectionTemplate);
const WORKFLOW_FORM_FIELD_IDS = extractFieldIds(workflowRequestTemplate);
const GENERIC_ISSUE_QUERY_FIELDS = new Set([
  "template",
  "labels",
  "title",
  "body",
]);
const missingChineseNameFixture = {
  cas_number: "107-18-6",
  cid: 7858,
  name_en: "Allyl Alcohol",
  name_zh: "Allyl Alcohol",
  found: true,
  upstream_error: false,
  ghs_pictograms: [
    {
      code: "GHS02",
      name: "Flammable",
      image: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg",
    },
    {
      code: "GHS06",
      name: "Toxic",
      image: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS06.svg",
    },
  ],
  signal_word: "Danger",
  signal_word_zh: "危險",
  hazard_statements: [
    {
      code: "H225",
      text_en: "Highly flammable liquid and vapor.",
      text_zh: "高度易燃液體和蒸氣。",
    },
  ],
  precautionary_statements: [
    {
      code: "P210",
      text_en: "Keep away from heat.",
      text_zh: "遠離熱源。",
    },
  ],
  reference_links: [],
};
const unresolvedSearchFixture = {
  cas_number: unresolvedSearchTerm,
  found: false,
  upstream_error: false,
  error: "CAS number not found in PubChem",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseIssueUrl = (href) => {
  try {
    const url = href ? new URL(href) : null;
    const field = (key) => url?.searchParams.get(key) || "";
    return {
      href: href || "",
      template: field("template"),
      labels: field("labels"),
      title: field("title"),
      body: field("body"),
      casNumber: field("cas_number"),
      chemicalName: field("chemical_name"),
      issueType: field("issue_type"),
      currentOutput: field("current_output"),
      expectedOutput: field("expected_output"),
      evidenceUrl: field("evidence_url"),
      evidenceType: field("evidence_type"),
      localContext: field("local_context"),
      workflowArea: field("workflow_area"),
      goal: field("goal"),
      currentProblem: field("current_problem"),
      desiredBehavior: field("desired_behavior"),
      examples: field("examples"),
    };
  } catch {
    return {
      href: href || "",
      template: "",
      labels: "",
      title: "",
      body: "",
      casNumber: "",
      chemicalName: "",
      issueType: "",
      currentOutput: "",
      expectedOutput: "",
      evidenceUrl: "",
      evidenceType: "",
      localContext: "",
      workflowArea: "",
      goal: "",
      currentProblem: "",
      desiredBehavior: "",
      examples: "",
    };
  }
};

const inspectIssueLink = async (locator) => {
  const count = await locator.count().catch(() => 0);
  const href =
    count > 0
      ? (await locator.first().getAttribute("href").catch(() => "")) || ""
      : "";
  return {
    count,
    href,
    ...parseIssueUrl(href),
  };
};

const hasOnlyIssueTemplateFields = (href, templateFieldIds) => {
  try {
    const url = new URL(href);
    return [...url.searchParams.keys()].every(
      (key) =>
        GENERIC_ISSUE_QUERY_FIELDS.has(key) || templateFieldIds.has(key),
    );
  } catch {
    return false;
  }
};

const hasStructuredCorrectionContext = (
  issue,
  {
    formIssueType,
    issueKey,
    currentOutputIncludes,
    expectedOutputIncludes,
    casNumber,
    evidenceType,
    evidencePromptIncludes,
  },
) => {
  if (!issue || issue.count < 1) return false;
  if (!hasOnlyIssueTemplateFields(issue.href, DATA_CORRECTION_FORM_FIELD_IDS)) {
    return false;
  }
  if (issue.template !== "data-correction.yml") return false;
  if (issue.labels !== "data-correction") return false;
  if (!DATA_CORRECTION_FORM_ISSUE_TYPES.has(issue.issueType)) return false;
  if (formIssueType && issue.issueType !== formIssueType) return false;
  if (!DATA_CORRECTION_FORM_EVIDENCE_TYPES.has(issue.evidenceType)) {
    return false;
  }
  if (evidenceType && issue.evidenceType !== evidenceType) return false;
  if (issueKey && !issue.body.includes(`- Issue key: ${issueKey}`)) return false;
  if (
    evidencePromptIncludes &&
    !issue.body.includes(`- Evidence prompt: ${evidencePromptIncludes}`)
  ) {
    return false;
  }
  if (casNumber && issue.casNumber !== casNumber) return false;
  if (
    currentOutputIncludes &&
    !issue.currentOutput.includes(currentOutputIncludes)
  ) {
    return false;
  }
  if (
    expectedOutputIncludes &&
    !issue.expectedOutput.includes(expectedOutputIncludes)
  ) {
    return false;
  }
  return true;
};

const hasStructuredWorkflowContext = (
  issue,
  {
    workflowArea,
    currentProblemIncludes,
    desiredBehaviorIncludes,
    examplesIncludes,
  },
) => {
  if (!issue || issue.count < 1) return false;
  if (!hasOnlyIssueTemplateFields(issue.href, WORKFLOW_FORM_FIELD_IDS)) {
    return false;
  }
  if (issue.template !== "workflow-request.yml") return false;
  if (issue.labels !== "workflow-request") return false;
  if (!WORKFLOW_FORM_AREAS.has(issue.workflowArea)) return false;
  if (workflowArea && issue.workflowArea !== workflowArea) return false;
  if (
    currentProblemIncludes &&
    !issue.currentProblem.includes(currentProblemIncludes)
  ) {
    return false;
  }
  if (
    desiredBehaviorIncludes &&
    !issue.desiredBehavior.includes(desiredBehaviorIncludes)
  ) {
    return false;
  }
  if (examplesIncludes && !issue.examples.includes(examplesIncludes)) {
    return false;
  }
  return true;
};

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

const withQaParams = (url, params = {}) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("productionSearchUiQa", Date.now().toString());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      nextUrl.searchParams.set(key, String(value));
    }
  });
  return nextUrl.toString();
};

const withQaParam = (url) => withQaParams(url);

const waitForAppShell = async (page) => {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.getByTestId("single-cas-input").waitFor({
    state: "visible",
    timeout: APP_SHELL_TIMEOUT_MS,
  });
};

const gotoApp = async (page, url) => {
  let lastError = null;
  for (let attempt = 1; attempt <= SEARCH_UI_ATTEMPTS; attempt += 1) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_NAVIGATION_TIMEOUT_MS,
      });
      await waitForAppShell(page);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error || "unknown");
      lastError = new Error(`Page navigation attempt ${attempt} failed: ${errorMessage}`);
      if (attempt < SEARCH_UI_ATTEMPTS) {
        await sleep(SEARCH_UI_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError || new Error(`Page navigation failed: ${url}`);
};

const reloadApp = async (page) => {
  let lastError = null;
  for (let attempt = 1; attempt <= SEARCH_UI_ATTEMPTS; attempt += 1) {
    try {
      if (attempt === 1) {
        await page.reload({
          waitUntil: "domcontentloaded",
          timeout: PAGE_NAVIGATION_TIMEOUT_MS,
        });
      } else {
        await page.goto(page.url(), {
          waitUntil: "domcontentloaded",
          timeout: PAGE_NAVIGATION_TIMEOUT_MS,
        });
      }
      await waitForAppShell(page);
      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error || "unknown");
      lastError = new Error(`Page reload attempt ${attempt} failed: ${errorMessage}`);
      if (attempt < SEARCH_UI_ATTEMPTS) {
        await sleep(SEARCH_UI_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError || new Error("Page reload failed.");
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
const referenceLinkTypeRank = new Map(
  ["sds", "regulatory", "occupational", "reference"].map((linkType, index) => [
    linkType,
    index,
  ]),
);

const inspectResultsTrustSurface = async (page) => {
  const note = page.getByTestId("authoritative-source-note-results");
  const checklist = page.getByTestId("authoritative-source-checklist-results");
  const panel = page.getByTestId("product-trust-panel-results");
  const decisionGuide = page.getByTestId("results-decision-guide");
  const sdsButton = page.getByTestId("sds-btn-0");
  const sourceConflictCorrection = await inspectIssueLink(
    page.locator('[data-testid^="data-quality-link-source-conflict-"]'),
  );
  const multipleClassificationReviewActions = await page
    .locator('[data-testid^="data-quality-action-multiple-classifications-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        testId: node.getAttribute("data-testid") || "",
        text: (node.textContent || "").replace(/\s+/g, " ").trim(),
      })),
    )
    .catch(() => []);
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
  const productTrustReportHref =
    (await page
      .getByTestId("product-trust-report-link-results")
      .getAttribute("href")
      .catch(() => "")) || "";
  const productTrustWorkflowHref =
    (await page
      .getByTestId("product-trust-workflow-link-results")
      .getAttribute("href")
      .catch(() => "")) || "";

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
    decisionGuideCount: await decisionGuide.count(),
    decisionStepCount: await page
      .locator('[data-testid^="results-decision-step-"]')
      .count()
      .catch(() => 0),
    productTrustReportHref,
    productTrustReport: parseIssueUrl(productTrustReportHref),
    productTrustWorkflowHref,
    productTrustWorkflow: parseIssueUrl(productTrustWorkflowHref),
    sourceConflictCorrection,
    multipleClassificationReviewActions,
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
    sourceConflictNoteCount: await detailModal
      .getByTestId("detail-source-conflict-note")
      .count(),
    sourceConflictCorrection: await inspectIssueLink(
      detailModal.getByTestId("detail-report-source-conflict-link"),
    ),
    references,
  };
};

const inspectExportPreviewSurface = async (page) => {
  await page.getByTestId("export-csv-btn").click();
  const modal = page.getByTestId("export-preview-modal");
  await modal.waitFor({ state: "visible", timeout: 10000 });
  const headers = await modal.locator("thead th").evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent || "").replace(/\s+/g, " ").trim()),
  );
  const bodyText = ((await modal.textContent()) || "").replace(/\s+/g, " ");
  const reviewActionColumns = modal.getByTestId("export-preview-review-action-columns");
  const reviewActionColumnNoteCount = await reviewActionColumns.count().catch(() => 0);
  const reviewActionColumnNoteText =
    reviewActionColumnNoteCount > 0
      ? ((await reviewActionColumns.first().textContent().catch(() => "")) || "").replace(/\s+/g, " ").trim()
      : "";
  await modal.getByTestId("export-preview-cancel").click();
  await modal.waitFor({ state: "hidden", timeout: 10000 });
  return {
    headers,
    bodyText,
    hasDataState: headers.some((header) => /Data State|資料狀態/i.test(header)),
    hasPrimarySource: headers.some((header) =>
      /Primary Source|主要來源/i.test(header),
    ),
    hasClassificationSelection: headers.some((header) =>
      /Classification Selection|分類選擇/i.test(header),
    ),
    hasRenderableState: /Found with renderable GHS pictograms|可顯示的 GHS 圖示/i.test(
      bodyText,
    ),
    hasSourceEvidence: /ECHA|PubChem/i.test(bodyText),
    hasPrintable: headers.some((header) => /Printable/i.test(header)),
    hasReviewRequired: headers.some((header) => /Needs Review/i.test(header)),
    hasReviewReasons: headers.some((header) => /Review Reasons/i.test(header)),
    hasReviewSignalCount: headers.some((header) =>
      /Review Signal Count|檢查訊號數/i.test(header),
    ),
    hasPrimaryReviewAction: headers.some((header) =>
      /Primary Review Action|第一建議動作/i.test(header),
    ),
    hasReviewActionColumnNote:
      reviewActionColumnNoteCount > 0 &&
      /Review handoff columns|檢查交接欄位/i.test(reviewActionColumnNoteText),
    reviewActionColumnNoteText,
    hasMultipleGhsStatus: headers.some((header) =>
      /Multiple GHS Status|多 GHS 狀態/i.test(header),
    ),
  };
};

const inspectModalFocusableState = async (page, modalTestId, label) =>
  page.evaluate(
    ({ modalTestId: targetTestId, label: stateLabel }) => {
      const focusableSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(",");
      const modal = document.querySelector(`[data-testid="${targetTestId}"]`);
      const panel = modal?.querySelector(":scope > div") || modal;
      const isVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      };
      const signature = (element, index = -1) => {
        if (!element) return null;
        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        return {
          index,
          tag: element.tagName.toLowerCase(),
          testId: element.getAttribute("data-testid") || "",
          id: element.getAttribute("id") || "",
          ariaLabel: element.getAttribute("aria-label") || "",
          title: element.getAttribute("title") || "",
          text: text.slice(0, 80),
          key: [
            element.tagName.toLowerCase(),
            element.getAttribute("data-testid") || "",
            element.getAttribute("id") || "",
            element.getAttribute("aria-label") || "",
            element.getAttribute("title") || "",
            text.slice(0, 80),
          ].join("|"),
        };
      };
      const focusables = panel
        ? Array.from(panel.querySelectorAll(focusableSelector)).filter(isVisible)
        : [];
      return {
        label: stateLabel,
        modalTestId: targetTestId,
        modalPresent: Boolean(modal),
        modalAriaModal: modal?.getAttribute("aria-modal") || null,
        modalAriaHidden: modal?.getAttribute("aria-hidden") || null,
        modalHasInertAttribute: Boolean(modal?.hasAttribute("inert")),
        modalInertProperty: Boolean(modal?.inert),
        count: focusables.length,
        first: signature(focusables[0], 0),
        last: signature(focusables.at(-1), focusables.length - 1),
        focusables: focusables.map((element, index) =>
          signature(element, index),
        ),
      };
    },
    { modalTestId, label },
  );

const focusModalElement = async (page, modalTestId, index) =>
  page.evaluate(
    ({ modalTestId: targetTestId, focusIndex }) => {
      const focusableSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(",");
      const modal = document.querySelector(`[data-testid="${targetTestId}"]`);
      const panel = modal?.querySelector(":scope > div") || modal;
      const isVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      };
      const focusables = panel
        ? Array.from(panel.querySelectorAll(focusableSelector)).filter(isVisible)
        : [];
      const resolvedIndex =
        focusIndex < 0 ? focusables.length + focusIndex : focusIndex;
      const element = focusables[resolvedIndex];
      element?.focus();
      return Boolean(element && document.activeElement === element);
    },
    { modalTestId, focusIndex: index },
  );

const getActiveFocusSignature = async (page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    const text = (element.textContent || "").replace(/\s+/g, " ").trim();
    return {
      tag: element.tagName.toLowerCase(),
      testId: element.getAttribute("data-testid") || "",
      id: element.getAttribute("id") || "",
      ariaLabel: element.getAttribute("aria-label") || "",
      title: element.getAttribute("title") || "",
      text: text.slice(0, 80),
      key: [
        element.tagName.toLowerCase(),
        element.getAttribute("data-testid") || "",
        element.getAttribute("id") || "",
        element.getAttribute("aria-label") || "",
        element.getAttribute("title") || "",
        text.slice(0, 80),
      ].join("|"),
    };
  });

const inspectModalFocusWrap = async (page, modalTestId, label) => {
  const state = await inspectModalFocusableState(page, modalTestId, label);
  if (state.count < 2) {
    return {
      ...state,
      ok: false,
      reason: "not-enough-focusable-elements",
      focusedLastBeforeForward: false,
      focusedFirstBeforeBackward: false,
      afterForwardTab: null,
      afterBackwardTab: null,
      forwardWrapOk: false,
      backwardWrapOk: false,
    };
  }

  const focusedLastBeforeForward = await focusModalElement(page, modalTestId, -1);
  await page.keyboard.press("Tab");
  const afterForwardTab = await getActiveFocusSignature(page);

  const focusedFirstBeforeBackward = await focusModalElement(
    page,
    modalTestId,
    0,
  );
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  const afterBackwardTab = await getActiveFocusSignature(page);

  const forwardWrapOk = afterForwardTab?.key === state.first?.key;
  const backwardWrapOk = afterBackwardTab?.key === state.last?.key;
  return {
    ...state,
    focusedLastBeforeForward,
    focusedFirstBeforeBackward,
    afterForwardTab,
    afterBackwardTab,
    forwardWrapOk,
    backwardWrapOk,
    ok:
      focusedLastBeforeForward &&
      focusedFirstBeforeBackward &&
      forwardWrapOk &&
      backwardWrapOk,
  };
};

const inspectDetailPrepareStacking = async (page) => {
  await page.getByTestId("prepare-solution-btn").click();
  const prepareModal = page.getByTestId("prepare-solution-modal");
  await prepareModal.waitFor({ state: "visible", timeout: 10000 });
  await page
    .getByTestId("prepared-concentration-input")
    .waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(() => {
    const active = document.activeElement;
    return (
      active?.getAttribute("data-testid") === "prepared-concentration-input"
    );
  });

  const stackedState = {
    detail: await inspectModalFocusableState(
      page,
      "detail-modal",
      "detail-stacked",
    ),
    prepare: await inspectModalFocusableState(
      page,
      "prepare-solution-modal",
      "prepare-stacked",
    ),
    activeAfterOpen: await getActiveFocusSignature(page),
  };

  const prepareFocusWrap = await inspectModalFocusWrap(
    page,
    "prepare-solution-modal",
    "prepare-solution-modal",
  );

  await page.getByTestId("prepared-concentration-input").focus();
  await page.keyboard.press("Escape");
  await prepareModal.waitFor({ state: "detached", timeout: 10000 });

  const restoredState = {
    detail: await inspectModalFocusableState(
      page,
      "detail-modal",
      "detail-restored",
    ),
    preparePresent:
      (await page.getByTestId("prepare-solution-modal").count()) > 0,
    activeAfterEscape: await getActiveFocusSignature(page),
  };

  return {
    stackedState,
    prepareFocusWrap,
    restoredState,
    detailSuppressedOk:
      stackedState.detail.modalPresent &&
      stackedState.detail.modalAriaModal === null &&
      stackedState.detail.modalAriaHidden === "true" &&
      (stackedState.detail.modalHasInertAttribute ||
        stackedState.detail.modalInertProperty),
    prepareOwnsModalOk:
      stackedState.prepare.modalPresent &&
      stackedState.prepare.modalAriaModal === "true" &&
      stackedState.activeAfterOpen?.testId === "prepared-concentration-input",
    escapeRestoresDetailOk:
      restoredState.detail.modalPresent &&
      restoredState.detail.modalAriaModal === "true" &&
      restoredState.detail.modalAriaHidden !== "true" &&
      !restoredState.detail.modalHasInertAttribute &&
      !restoredState.detail.modalInertProperty &&
      restoredState.preparePresent === false,
  };
};

const searchUntilUsableResult = async (page, term = searchTerm) => {
  let lastError = null;
  for (let attempt = 1; attempt <= SEARCH_UI_ATTEMPTS; attempt += 1) {
    try {
      await page.getByTestId("single-cas-input").fill(term);
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
        ((await page
          .getByTestId("result-row-0")
          .textContent()
          .catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim();
      lastError = new Error(
        `Search attempt ${attempt} did not produce a usable detail action: ${rowText}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error || "unknown");
      lastError = new Error(`Search attempt ${attempt} failed: ${errorMessage}`);
    }
    if (attempt < SEARCH_UI_ATTEMPTS) {
      await sleep(SEARCH_UI_RETRY_DELAY_MS);
      await reloadApp(page);
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
    const decisionGuide = document.querySelector(
      '[data-testid="results-decision-guide"]',
    );
    const decisionSteps = Array.from(
      document.querySelectorAll('[data-testid^="results-decision-step-"]'),
    );
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
      decisionGuideRect: serializeRect(decisionGuide),
      decisionStepRects: decisionSteps.map((step) => ({
        ...serializeRect(step),
        text: (step.textContent || "").replace(/\s+/g, " ").trim(),
      })),
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

const inspectNoGhsResultState = async (
  page,
  term,
  { screenshotPath, detailScreenshotPath } = {},
) => {
  const attempts = await searchUntilUsableResult(page, term);
  const row = page.getByTestId("result-row-0");
  const printButton = page.getByTestId("print-label-btn");
  const detailButton = page.getByTestId("detail-btn-0");
  const noGhsBanner = page.locator('[data-testid^="no-ghs-data-"]');
  const textOnlyBanner = page.locator(
    '[data-testid^="ghs-data-no-pictograms-"]',
  );
  const noGhsCorrection = await inspectIssueLink(
    row.locator('[data-testid^="data-quality-link-no-ghs-data-"]'),
  );
  const rowText = ((await row.textContent().catch(() => "")) || "")
    .replace(/\s+/g, " ")
    .trim();
  const resultState = {
    attempts,
    rowText,
    noGhsBannerCount: await noGhsBanner.count(),
    textOnlyBannerCount: await textOnlyBanner.count(),
    resultCheckboxCount: await row.locator('input[type="checkbox"]').count(),
    resultPrintButtonDisabled: await printButton.evaluate(
      (node) => Boolean(node.disabled),
    ),
    resultPrintButtonTitle: (await printButton.getAttribute("title")) || "",
    noGhsCorrection,
  };

  if (screenshotPath) {
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
    });
  }

  await detailButton.click();
  const detailModal = page.getByTestId("detail-modal");
  await detailModal.waitFor({ state: "visible", timeout: 10000 });
  const detailPrintButton = page.getByTestId("detail-print-label-btn");
  const detailState = {
    noGhsBannerCount: await detailModal
      .getByTestId("detail-no-ghs-data-banner")
      .count(),
    textOnlyBannerCount: await detailModal
      .getByTestId("detail-ghs-text-no-pictograms-banner")
      .count(),
    printButtonDisabled: await detailPrintButton.evaluate(
      (node) => Boolean(node.disabled),
    ),
    printButtonTitle: (await detailPrintButton.getAttribute("title")) || "",
    noGhsCorrection: await inspectIssueLink(
      detailModal.getByTestId("detail-report-ghs-gap-link"),
    ),
  };

  if (detailScreenshotPath) {
    await page.screenshot({
      path: detailScreenshotPath,
      fullPage: false,
    });
  }

  return {
    term,
    result: resultState,
    detail: detailState,
  };
};

const inspectMissingChineseNameCorrectionPath = async (context) => {
  const page = await context.newPage();
  try {
    await page.addInitScript(() => localStorage.setItem("ghs_language", "en"));
    await page.route("**/api/search-single**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(missingChineseNameFixture),
      });
    });
    await gotoApp(page, withQaParam(productionUrl));
    await page
      .getByTestId("single-cas-input")
      .fill(missingChineseNameFixture.cas_number);
    await page.getByTestId("single-search-btn").click();
    await page.getByTestId("result-row-0").waitFor({
      state: "visible",
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    const rowCorrection = await inspectIssueLink(
      page.getByTestId(
        `data-quality-link-missing-chinese-name-${missingChineseNameFixture.cas_number}`,
      ),
    );
    await page.getByTestId("detail-btn-0").click();
    const detailModal = page.getByTestId("detail-modal");
    await detailModal.waitFor({ state: "visible", timeout: 10000 });
    const note = detailModal.getByTestId("detail-missing-chinese-name-note");
    const link = detailModal.getByTestId(
      "detail-report-missing-chinese-name-link",
    );
    const href = (await link.getAttribute("href").catch(() => "")) || "";
    const detailCorrection = parseIssueUrl(href);
    return {
      noteCount: await note.count(),
      linkCount: await link.count(),
      href,
      template: detailCorrection.template,
      labels: detailCorrection.labels,
      title: detailCorrection.title,
      body: detailCorrection.body,
      casNumber: detailCorrection.casNumber,
      issueType: detailCorrection.issueType,
      evidenceType: detailCorrection.evidenceType,
      currentOutput: detailCorrection.currentOutput,
      expectedOutput: detailCorrection.expectedOutput,
      rowLinkCount: rowCorrection.count,
      rowTemplate: rowCorrection.template,
      rowLabels: rowCorrection.labels,
      rowTitle: rowCorrection.title,
      rowBody: rowCorrection.body,
      rowCasNumber: rowCorrection.casNumber,
      rowIssueType: rowCorrection.issueType,
      rowEvidenceType: rowCorrection.evidenceType,
      rowCurrentOutput: rowCorrection.currentOutput,
      rowExpectedOutput: rowCorrection.expectedOutput,
    };
  } finally {
    await page.close();
  }
};

const inspectUnresolvedSearchCorrectionPath = async (
  context,
  { screenshotPath = null } = {},
) => {
  const page = await context.newPage();
  try {
    await page.addInitScript(() => localStorage.setItem("ghs_language", "en"));
    await page.route("**/api/search-single**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(unresolvedSearchFixture),
      });
    });
    await gotoApp(page, withQaParam(productionUrl));
    await page.getByTestId("single-cas-input").fill(unresolvedSearchTerm);
    await page.getByTestId("single-search-btn").click();
    const row = page.getByTestId("result-row-0");
    await row.waitFor({
      state: "visible",
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    const correction = await inspectIssueLink(
      row.getByTestId(
        `data-quality-link-unresolved-search-${unresolvedSearchTerm}`,
      ),
    );

    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }

    return {
      rowText: ((await row.textContent().catch(() => "")) || "")
        .replace(/\s+/g, " ")
        .trim(),
      correction,
      checkboxCount: await row.locator('input[type="checkbox"]').count(),
      detailButtonCount: await row.locator('[data-testid^="detail-btn-"]').count(),
    };
  } finally {
    await page.close();
  }
};

const inspectBatchInputNormalizationPath = async (
  context,
  { screenshotPath = null } = {},
) => {
  const page = await context.newPage();
  try {
    await page.addInitScript(() => localStorage.clear());
    await gotoApp(page, withQaParam(productionUrl));
    await page.getByTestId("batch-search-tab").click();
    await page.getByTestId("batch-cas-input").fill(
      [
        "90-41-5 84-65-1 CAS No. 462-08-8 CAS: 123-30-8",
        "90-41-5",
        "344-04-07",
        "67641",
        "0118-12-7",
        "CAS No. 62 - 53 - 3",
      ].join("\n"),
    );
    const readySummary = page.getByTestId("batch-ready-summary");
    await readySummary.waitFor({
      state: "visible",
      timeout: SEARCH_UI_TIMEOUT_MS,
    });
    if (screenshotPath) {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }
    const diagnostics = page.getByTestId("batch-input-diagnostics");
    const searchButton = page.getByTestId("batch-search-btn");
    const searchButtonDisabled = await searchButton.isDisabled();
    const resultSummary = {
      rowCount: 0,
      workflowSummaryVisible: false,
      foundValue: "",
      labelReadyValue: "",
      reviewValue: "",
      exportValue: "",
      filteredScopeCount: 0,
      reviewActionQueueCount: 0,
      reviewActionQueueText: "",
      nextActionTitle: "",
      nextActionBody: "",
      nextActionCta: "",
    };

    if (!searchButtonDisabled) {
      await searchButton.click();
      await page.getByTestId("result-row-0").waitFor({
        state: "visible",
        timeout: SEARCH_UI_TIMEOUT_MS,
      });
      const workflowSummary = page.getByTestId("results-workflow-summary");
      await workflowSummary.waitFor({
        state: "visible",
        timeout: SEARCH_UI_TIMEOUT_MS,
      });
      resultSummary.rowCount = await page
        .locator('[data-testid^="result-row-"]')
        .count();
      resultSummary.workflowSummaryVisible = await workflowSummary.isVisible();
      resultSummary.foundValue =
        ((await page
          .getByTestId("results-workflow-summary-found-value")
          .textContent()
          .catch(() => "")) || "").trim();
      resultSummary.labelReadyValue =
        ((await page
          .getByTestId("results-workflow-summary-label-ready-value")
          .textContent()
          .catch(() => "")) || "").trim();
      resultSummary.reviewValue =
        ((await page
          .getByTestId("results-workflow-summary-needs-review-value")
          .textContent()
          .catch(() => "")) || "").trim();
      resultSummary.exportValue =
        ((await page
          .getByTestId("results-workflow-summary-export-value")
          .textContent()
          .catch(() => "")) || "").trim();
      resultSummary.filteredScopeCount = await page
        .getByTestId("results-workflow-filtered-scope")
        .count()
        .catch(() => 0);
      const reviewActionQueue = page.getByTestId(
        "results-workflow-review-action-queue",
      );
      resultSummary.reviewActionQueueCount = await reviewActionQueue
        .count()
        .catch(() => 0);
      resultSummary.reviewActionQueueText =
        ((await reviewActionQueue.textContent().catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim();
      resultSummary.nextActionTitle =
        ((await page
          .getByTestId("results-next-action-title")
          .textContent()
          .catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim();
      resultSummary.nextActionBody =
        ((await page
          .getByTestId("results-next-action-body")
          .textContent()
          .catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim();
      resultSummary.nextActionCta =
        ((await page
          .getByTestId("results-next-action-primary")
          .textContent()
          .catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim();
    }

    return {
      readySummary:
        ((await readySummary.textContent()) || "").replace(/\s+/g, " ").trim(),
      diagnostics:
        ((await diagnostics.textContent().catch(() => "")) || "")
          .replace(/\s+/g, " ")
          .trim(),
      diagnosticSummaries: {
        duplicate:
          ((await page
            .getByTestId("batch-duplicate-summary")
            .textContent()
            .catch(() => "")) || "")
            .replace(/\s+/g, " ")
            .trim(),
        invalid:
          ((await page
            .getByTestId("batch-invalid-summary")
            .textContent()
            .catch(() => "")) || "")
            .replace(/\s+/g, " ")
            .trim(),
        rehyphenated:
          ((await page
            .getByTestId("batch-rehyphenated-summary")
            .textContent()
            .catch(() => "")) || "")
            .replace(/\s+/g, " ")
            .trim(),
      },
      searchButtonDisabled,
      overLimitAlertCount: await page
        .getByTestId("batch-over-limit-alert")
        .count()
        .catch(() => 0),
      resultSummary,
    };
  } finally {
    await page.close();
  }
};

const inspectUrlQueryHydrationPath = async (
  context,
  term,
  { screenshotPath = null } = {},
) => {
  const page = await context.newPage();
  const queryUrl = withQaParams(productionUrl, { cas: term });
  try {
    await page.addInitScript(() => localStorage.clear());
    let lastError = null;
    for (let attempt = 1; attempt <= SEARCH_UI_ATTEMPTS; attempt += 1) {
      try {
        await gotoApp(page, queryUrl);
        await page.getByTestId("result-row-0").waitFor({
          state: "visible",
          timeout: SEARCH_UI_TIMEOUT_MS,
        });
        if (screenshotPath) {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }
        break;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error || "unknown");
        lastError = new Error(
          `URL query hydration attempt ${attempt} failed: ${errorMessage}`,
        );
        if (attempt < SEARCH_UI_ATTEMPTS) {
          await sleep(SEARCH_UI_RETRY_DELAY_MS);
        }
      }
    }
    if (
      !(await page
        .getByTestId("result-row-0")
        .isVisible()
        .catch(() => false))
    ) {
      throw lastError || new Error("URL query hydration did not render a row.");
    }
    return {
      queryUrl,
      inputValue: await page.getByTestId("single-cas-input").inputValue(),
      rowText:
        ((await page.getByTestId("result-row-0").textContent()) || "")
          .replace(/\s+/g, " ")
          .trim(),
      singleTabClass: (await page.getByTestId("single-search-tab").getAttribute(
        "class",
      )) || "",
      batchReadySummaryCount: await page
        .getByTestId("batch-ready-summary")
        .count()
        .catch(() => 0),
    };
  } finally {
    await page.close();
  }
};

const summarizePictogramMetrics = (metrics) => {
  const tiles = metrics?.tiles || [];
  const minFrames = tiles.map((tile) =>
    Math.min(tile.frameWidth || 0, tile.frameHeight || 0),
  );
  const maxFrames = tiles.map((tile) =>
    Math.max(tile.frameWidth || 0, tile.frameHeight || 0),
  );
  return {
    count: metrics?.count || 0,
    codes: tiles.map((tile) => tile.code).filter(Boolean),
    framePxRange: {
      min: minFrames.length > 0 ? Math.min(...minFrames) : 0,
      max: maxFrames.length > 0 ? Math.max(...maxFrames) : 0,
    },
  };
};

const summarizeFocusWrap = (surface) => ({
  focusableCount: surface?.count || 0,
  forwardWrapOk: Boolean(surface?.forwardWrapOk),
  backwardWrapOk: Boolean(surface?.backwardWrapOk),
});

const summarizeSearchUiReportForConsole = (report) => {
  const metrics = report.metrics || {};
  const mobileReadFirst = metrics.mobileReadFirst || {};
  const mobileDetailReadFirst = metrics.mobileDetailReadFirst || {};
  const prepareStacking = metrics.prepareStackingSurface || {};
  return {
    ok: report.ok,
    productionUrl: report.productionUrl,
    searchTerm: report.searchTerm,
    noGhsSearchTerm: report.noGhsSearchTerm,
    reportPath: outputPath,
    screenshots: {
      search: report.screenshotPath,
      expandedClassifications: report.expandedScreenshotPath,
      detail: report.detailScreenshotPath,
      batchInput: report.batchInputScreenshotPath,
      urlQueryHydration: report.urlQueryHydrationScreenshotPath,
      mobileSearch: report.mobileScreenshotPath,
      mobileDetail: report.mobileDetailScreenshotPath,
      noGhsSearch: report.noGhsScreenshotPath,
      noGhsDetail: report.noGhsDetailScreenshotPath,
    },
    failures: report.failures,
    searchAttempts: report.searchAttempts,
    mobileSearchAttempts: report.mobileSearchAttempts,
    checks: {
      resultActions: {
        detailButton: metrics.detailButton,
        sdsButton: metrics.sdsButton,
        verticalTextRisks: metrics.verticalRisks?.length || 0,
      },
      pictograms: {
        result: summarizePictogramMetrics(metrics.resultPictogramMetrics),
        expandedClassificationCount:
          metrics.expandedClassificationCount || 0,
        detailComparisonColumns: metrics.detailComparisonColumnCount || 0,
        mobileDetailComparisonCards:
          metrics.mobileDetailComparisonCardCount || 0,
      },
      trust: {
        resultAuthoritativeNotes:
          metrics.resultsTrustSurface?.authoritativeNoteCount || 0,
        resultDecisionSteps:
          metrics.resultsTrustSurface?.decisionStepCount || 0,
        detailReferenceLinks:
          metrics.detailTrustSurface?.references?.length || 0,
        detailSourceConflictNotes:
          metrics.detailTrustSurface?.sourceConflictNoteCount || 0,
        detailSourceConflictReportLinks:
          metrics.detailTrustSurface?.sourceConflictCorrection?.count || 0,
        detailReferenceRoles: [
          ...new Set(
            (metrics.detailTrustSurface?.references || [])
              .map((reference) => reference.linkType)
              .filter(Boolean),
          ),
        ],
      },
      keyboard: {
        detailModal: summarizeFocusWrap(metrics.detailKeyboardSurface),
        prepareSolutionModal: summarizeFocusWrap(
          prepareStacking.prepareFocusWrap,
        ),
        detailSuppressedWhilePrepareStacked: Boolean(
          prepareStacking.detailSuppressedOk,
        ),
        escapeRestoresDetailModal: Boolean(
          prepareStacking.escapeRestoresDetailOk,
        ),
      },
      mobileReadFirst: {
        resultHorizontalOverflow:
          mobileReadFirst.documentScrollWidth >
            mobileReadFirst.viewportWidth + 2 ||
          mobileReadFirst.bodyScrollWidth > mobileReadFirst.viewportWidth + 2,
        decisionStepCount: mobileReadFirst.decisionStepRects?.length || 0,
        decisionStepVerticalRisks:
          mobileReadFirst.decisionStepRects?.filter(isVerticalTextRisk).length ||
          0,
        detailHorizontalOverflow:
          mobileDetailReadFirst.documentScrollWidth >
            mobileDetailReadFirst.viewportWidth + 2 ||
          mobileDetailReadFirst.bodyScrollWidth >
            mobileDetailReadFirst.viewportWidth + 2,
        detailComparisonLayout: mobileDetailReadFirst.comparisonLayout || "",
      },
      dataStates: {
        noGhsResultBannerCount:
          metrics.noGhsState?.result?.noGhsBannerCount || 0,
        noGhsDetailBannerCount:
          metrics.noGhsState?.detail?.noGhsBannerCount || 0,
        noGhsResultPrintDisabled: Boolean(
          metrics.noGhsState?.result?.resultPrintButtonDisabled,
        ),
        noGhsDetailPrintDisabled: Boolean(
          metrics.noGhsState?.detail?.printButtonDisabled,
        ),
        noGhsCheckboxCount:
          metrics.noGhsState?.result?.resultCheckboxCount || 0,
        noGhsResultReportLinks:
          metrics.noGhsState?.result?.noGhsCorrection?.count || 0,
        noGhsDetailReportLinks:
          metrics.noGhsState?.detail?.noGhsCorrection?.count || 0,
        exportPreviewTrustColumns:
          metrics.exportPreviewSurface?.headers?.filter((header) =>
            /Data State|Primary Source|Classification Selection|資料狀態|主要來源|分類選擇/i.test(
              header,
            ),
          ).length || 0,
        exportPreviewReviewActionColumns:
          metrics.exportPreviewSurface?.headers?.filter((header) =>
            /Review Signal Count|Primary Review Action|檢查訊號數|第一建議動作/i.test(header),
          ).length || 0,
        exportPreviewReviewActionColumnNote:
          metrics.exportPreviewSurface?.reviewActionColumnNoteText || "",
        missingChineseNameCorrection: {
          noteCount:
            metrics.missingChineseNameCorrection?.noteCount || 0,
          rowLinkCount:
            metrics.missingChineseNameCorrection?.rowLinkCount || 0,
          title: metrics.missingChineseNameCorrection?.title || "",
        },
      },
      batchInput: {
        readySummary: metrics.batchInputNormalization?.readySummary || "",
        diagnostics: metrics.batchInputNormalization?.diagnostics || "",
        searchButtonDisabled: Boolean(
          metrics.batchInputNormalization?.searchButtonDisabled,
        ),
        overLimitAlertCount:
          metrics.batchInputNormalization?.overLimitAlertCount || 0,
        resultSummary: metrics.batchInputNormalization?.resultSummary || {},
      },
      urlQueryHydration: {
        inputValue: metrics.urlQueryHydration?.inputValue || "",
        resultHasSearchTerm: Boolean(
          metrics.urlQueryHydration?.rowText?.includes(report.searchTerm),
        ),
        singleTabActive: /border-blue-700|bg-blue-50/.test(
          metrics.urlQueryHydration?.singleTabClass || "",
        ),
        batchReadySummaryCount:
          metrics.urlQueryHydration?.batchReadySummaryCount || 0,
      },
      images: {
        waitedContexts: metrics.imageWaits?.length || 0,
        failedImages:
          metrics.imageWaits?.reduce(
            (total, imageWait) => total + (imageWait.failed?.length || 0),
            0,
          ) || 0,
      },
    },
  };
};

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
    locale: browserLocale,
  });
  const page = await context.newPage();

  await gotoApp(page, withQaParam(productionUrl));
  const searchAttempts = await searchUntilUsableResult(page, searchTerm);

  const screenshotPath = path.join(screenshotDir, "search-results.png");

  const detailButton = await inspectActionButton(page, "detail-btn-0");
  const sdsButton = await inspectActionButton(page, "sds-btn-0");
  const actionButtons = [detailButton, sdsButton];
  const verticalRisks = actionButtons.filter(isVerticalTextRisk);
  const resultsTrustSurface = await inspectResultsTrustSurface(page);
  const exportPreviewSurface = await inspectExportPreviewSurface(page);

  if (resultsTrustSurface.authoritativeNoteCount < 1) {
    failures.push("results-authoritative-note-missing");
  }
  if (resultsTrustSurface.authoritativeNoteMode !== "general") {
    failures.push("results-authoritative-note-mode-mismatch");
  }
  if (resultsTrustSurface.multipleClassificationReviewActions.length < 1) {
    failures.push("results-multiple-ghs-review-action-missing");
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
  if (resultsTrustSurface.decisionGuideCount < 1) {
    failures.push("results-decision-guide-missing");
  }
  if (resultsTrustSurface.decisionStepCount < 3) {
    failures.push("results-decision-guide-incomplete");
  }
  if (resultsTrustSurface.productTrustReportHref !== SUPPORT_REPORT_DATA_URL) {
    failures.push("results-product-trust-report-link-mismatch");
  }
  if (
    !hasStructuredWorkflowContext(resultsTrustSurface.productTrustWorkflow, {
      workflowArea: "Search and results",
      currentProblemIncludes:
        "Search results, SDS review, export, or label handoff",
      desiredBehaviorIncludes: "safety-data correction",
      examplesIncludes: "batch labels",
    })
  ) {
    failures.push("results-product-trust-workflow-context-missing");
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
  if (!exportPreviewSurface.hasDataState) {
    failures.push("export-preview-data-state-column-missing");
  }
  if (!exportPreviewSurface.hasPrimarySource) {
    failures.push("export-preview-primary-source-column-missing");
  }
  if (!exportPreviewSurface.hasClassificationSelection) {
    failures.push("export-preview-classification-selection-column-missing");
  }
  if (!exportPreviewSurface.hasPrintable) {
    failures.push("export-preview-printable-column-missing");
  }
  if (!exportPreviewSurface.hasReviewRequired) {
    failures.push("export-preview-review-required-column-missing");
  }
  if (!exportPreviewSurface.hasReviewReasons) {
    failures.push("export-preview-review-reasons-column-missing");
  }
  if (!exportPreviewSurface.hasReviewSignalCount) {
    failures.push("export-preview-review-signal-count-column-missing");
  }
  if (!exportPreviewSurface.hasPrimaryReviewAction) {
    failures.push("export-preview-primary-review-action-column-missing");
  }
  if (!exportPreviewSurface.hasReviewActionColumnNote) {
    failures.push("export-preview-review-action-column-note-missing");
  }
  if (!exportPreviewSurface.hasMultipleGhsStatus) {
    failures.push("export-preview-multiple-ghs-status-column-missing");
  }
  if (!exportPreviewSurface.hasRenderableState) {
    failures.push("export-preview-renderable-state-missing");
  }
  if (!exportPreviewSurface.hasSourceEvidence) {
    failures.push("export-preview-source-evidence-missing");
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
  const detailKeyboardSurface = await inspectModalFocusWrap(
    page,
    "detail-modal",
    "detail-modal",
  );
  if (detailKeyboardSurface.count < 2) {
    failures.push("detail-focus-trap-not-enough-focusable-elements");
  }
  if (!detailKeyboardSurface.focusedLastBeforeForward) {
    failures.push("detail-focus-trap-last-focus-failed");
  }
  if (!detailKeyboardSurface.focusedFirstBeforeBackward) {
    failures.push("detail-focus-trap-first-focus-failed");
  }
  if (!detailKeyboardSurface.forwardWrapOk) {
    failures.push("detail-focus-trap-forward-wrap-broken");
  }
  if (!detailKeyboardSurface.backwardWrapOk) {
    failures.push("detail-focus-trap-backward-wrap-broken");
  }

  const prepareStackingSurface = await inspectDetailPrepareStacking(page);
  if (!prepareStackingSurface.detailSuppressedOk) {
    failures.push("prepare-stacked-detail-not-suppressed");
  }
  if (!prepareStackingSurface.prepareOwnsModalOk) {
    failures.push("prepare-stacked-modal-does-not-own-focus");
  }
  if (!prepareStackingSurface.prepareFocusWrap.focusedLastBeforeForward) {
    failures.push("prepare-focus-trap-last-focus-failed");
  }
  if (!prepareStackingSurface.prepareFocusWrap.focusedFirstBeforeBackward) {
    failures.push("prepare-focus-trap-first-focus-failed");
  }
  if (!prepareStackingSurface.prepareFocusWrap.forwardWrapOk) {
    failures.push("prepare-focus-trap-forward-wrap-broken");
  }
  if (!prepareStackingSurface.prepareFocusWrap.backwardWrapOk) {
    failures.push("prepare-focus-trap-backward-wrap-broken");
  }
  if (!prepareStackingSurface.escapeRestoresDetailOk) {
    failures.push("prepare-escape-did-not-restore-detail-modal");
  }

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
  if (detailTrustSurface.sourceConflictNoteCount < 1) {
    failures.push("detail-source-conflict-note-missing");
  }
  if (detailTrustSurface.sourceConflictCorrection.count < 1) {
    failures.push("detail-source-conflict-correction-link-missing");
  }
  if (
    detailTrustSurface.sourceConflictCorrection.count > 0 &&
    (detailTrustSurface.sourceConflictCorrection.template !==
      "data-correction.yml" ||
      detailTrustSurface.sourceConflictCorrection.labels !== "data-correction")
  ) {
    failures.push("detail-source-conflict-correction-template-mismatch");
  }
  if (
    detailTrustSurface.sourceConflictCorrection.count > 0 &&
    !detailTrustSurface.sourceConflictCorrection.body.includes(searchTerm)
  ) {
    failures.push("detail-source-conflict-correction-body-incomplete");
  }
  if (
    detailTrustSurface.sourceConflictCorrection.count > 0 &&
    !hasStructuredCorrectionContext(detailTrustSurface.sourceConflictCorrection, {
      formIssueType: "Source/provenance display",
      issueKey: "source-conflict",
      casNumber: searchTerm,
      evidenceType: "Other",
      evidencePromptIncludes: "SDS, supplier label, or local regulatory source",
      currentOutputIncludes: "multiple public GHS classifications",
      expectedOutputIncludes: "preferred classification",
    })
  ) {
    failures.push(
      "detail-source-conflict-correction-structured-context-missing",
    );
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
  const detailReferenceRanks = detailTrustSurface.references.map((reference) =>
    referenceLinkTypeRank.get(reference.linkType) ?? 99,
  );
  const detailReferencesAreRoleSorted = detailReferenceRanks.every(
    (rank, index, ranks) => index === 0 || rank >= ranks[index - 1],
  );
  if (!detailReferencesAreRoleSorted) {
    failures.push("detail-reference-link-role-order-mismatch");
  }
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
  const detailComparisonEvidencePanelCount = await detailComparisonTable
    .locator('[data-testid^="comparison-evidence-panel-"]')
    .count();
  const detailComparisonEvidenceBadgeIds = await detailComparisonTable
    .locator('[data-testid^="comparison-evidence-badge-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        testId: node.getAttribute("data-testid") || "",
        text: (node.textContent || "").replace(/\s+/g, " ").trim(),
      })),
    );
  if (detailComparisonEvidencePanelCount < detailComparisonColumnCount) {
    failures.push("detail-comparison-evidence-panels-missing");
  }
  if (
    !detailComparisonEvidenceBadgeIds.some((badge) =>
      badge.testId.startsWith("comparison-evidence-badge-selected-"),
    )
  ) {
    failures.push("detail-comparison-current-evidence-missing");
  }
  if (
    !detailComparisonEvidenceBadgeIds.some((badge) =>
      badge.testId.startsWith("comparison-evidence-badge-report-count-"),
    )
  ) {
    failures.push("detail-comparison-report-count-evidence-missing");
  }
  if (
    !detailComparisonEvidenceBadgeIds.some((badge) =>
      badge.testId.startsWith("comparison-evidence-badge-source-"),
    )
  ) {
    failures.push("detail-comparison-source-evidence-missing");
  }
  if (
    !detailComparisonEvidenceBadgeIds.some((badge) =>
      badge.testId.startsWith("comparison-evidence-badge-coverage-"),
    )
  ) {
    failures.push("detail-comparison-coverage-evidence-missing");
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
    locale: browserLocale,
  });
  const mobilePage = await mobileContext.newPage();
  await gotoApp(mobilePage, withQaParam(productionUrl));
  const mobileSearchAttempts = await searchUntilUsableResult(
    mobilePage,
    searchTerm,
  );
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
  const mobileDetailComparisonEvidencePanelCount = await mobileDetailModal
    .locator('[data-testid^="comparison-mobile-evidence-panel-"]')
    .count();
  if (mobileDetailComparisonEvidencePanelCount < mobileDetailComparisonCardCount) {
    failures.push("mobile-detail-comparison-evidence-panels-missing");
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

  const noGhsContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: browserLocale,
  });
  const noGhsPage = await noGhsContext.newPage();
  await gotoApp(noGhsPage, withQaParam(productionUrl));
  const noGhsScreenshotPath = path.join(
    screenshotDir,
    "search-results-no-ghs-state.png",
  );
  const noGhsDetailScreenshotPath = path.join(
    screenshotDir,
    "detail-modal-no-ghs-state.png",
  );
  const noGhsState = await inspectNoGhsResultState(noGhsPage, noGhsSearchTerm, {
    screenshotPath: noGhsScreenshotPath,
    detailScreenshotPath: noGhsDetailScreenshotPath,
  });
  await noGhsContext.close();

  const batchInputScreenshotPath = path.join(
    screenshotDir,
    "batch-input-normalization.png",
  );
  const urlQueryHydrationScreenshotPath = path.join(
    screenshotDir,
    "url-query-hydration.png",
  );
  const unresolvedSearchScreenshotPath = path.join(
    screenshotDir,
    "search-results-unresolved-lookup.png",
  );
  const missingChineseNameCorrection =
    await inspectMissingChineseNameCorrectionPath(context);
  const unresolvedSearchCorrection =
    await inspectUnresolvedSearchCorrectionPath(context, {
      screenshotPath: unresolvedSearchScreenshotPath,
    });
  const batchInputNormalization = await inspectBatchInputNormalizationPath(
    context,
    { screenshotPath: batchInputScreenshotPath },
  );
  const urlQueryHydration = await inspectUrlQueryHydrationPath(
    context,
    searchTerm,
    { screenshotPath: urlQueryHydrationScreenshotPath },
  );

  if (
    !noGhsState.result.rowText.includes(noGhsSearchTerm) &&
    !/Urea|尿素/i.test(noGhsState.result.rowText)
  ) {
    failures.push("no-ghs-result-identity-missing");
  }
  if (noGhsState.result.noGhsBannerCount < 1) {
    failures.push("no-ghs-result-banner-missing");
  }
  if (noGhsState.result.noGhsCorrection.count < 1) {
    failures.push("no-ghs-result-correction-link-missing");
  }
  if (
    noGhsState.result.noGhsCorrection.count > 0 &&
    (noGhsState.result.noGhsCorrection.template !== "data-correction.yml" ||
      noGhsState.result.noGhsCorrection.labels !== "data-correction")
  ) {
    failures.push("no-ghs-result-correction-template-mismatch");
  }
  if (
    noGhsState.result.noGhsCorrection.count > 0 &&
    !noGhsState.result.noGhsCorrection.body.includes(noGhsSearchTerm)
  ) {
    failures.push("no-ghs-result-correction-body-incomplete");
  }
  if (
    noGhsState.result.noGhsCorrection.count > 0 &&
    !hasStructuredCorrectionContext(noGhsState.result.noGhsCorrection, {
      formIssueType: "Other data issue",
      issueKey: "no-ghs-data",
      casNumber: noGhsSearchTerm,
      evidenceType: "Other",
      evidencePromptIncludes: "SDS, supplier label, or regulatory source",
      currentOutputIncludes: "no GHS hazard content",
      expectedOutputIncludes: "missing GHS classification",
    })
  ) {
    failures.push("no-ghs-result-correction-structured-context-missing");
  }
  if (noGhsState.result.textOnlyBannerCount > 0) {
    failures.push("no-ghs-result-misclassified-as-text-only");
  }
  if (!noGhsState.result.resultPrintButtonDisabled) {
    failures.push("no-ghs-result-print-button-enabled");
  }
  if (noGhsState.result.resultCheckboxCount > 0) {
    failures.push("no-ghs-result-label-checkbox-present");
  }
  if (noGhsState.detail.noGhsBannerCount < 1) {
    failures.push("no-ghs-detail-banner-missing");
  }
  if (noGhsState.detail.noGhsCorrection.count < 1) {
    failures.push("no-ghs-detail-correction-link-missing");
  }
  if (
    noGhsState.detail.noGhsCorrection.count > 0 &&
    (noGhsState.detail.noGhsCorrection.template !== "data-correction.yml" ||
      noGhsState.detail.noGhsCorrection.labels !== "data-correction")
  ) {
    failures.push("no-ghs-detail-correction-template-mismatch");
  }
  if (
    noGhsState.detail.noGhsCorrection.count > 0 &&
    !noGhsState.detail.noGhsCorrection.body.includes(noGhsSearchTerm)
  ) {
    failures.push("no-ghs-detail-correction-body-incomplete");
  }
  if (
    noGhsState.detail.noGhsCorrection.count > 0 &&
    !hasStructuredCorrectionContext(noGhsState.detail.noGhsCorrection, {
      formIssueType: "Other data issue",
      issueKey: "no-ghs-data",
      casNumber: noGhsSearchTerm,
      evidenceType: "Other",
      evidencePromptIncludes: "SDS, supplier label, or regulatory source",
      currentOutputIncludes: "no GHS hazard content",
      expectedOutputIncludes: "missing GHS classification",
    })
  ) {
    failures.push("no-ghs-detail-correction-structured-context-missing");
  }
  if (noGhsState.detail.textOnlyBannerCount > 0) {
    failures.push("no-ghs-detail-misclassified-as-text-only");
  }
  if (!noGhsState.detail.printButtonDisabled) {
    failures.push("no-ghs-detail-print-button-enabled");
  }
  if (missingChineseNameCorrection.noteCount < 1) {
    failures.push("missing-chinese-name-correction-note-missing");
  }
  if (missingChineseNameCorrection.linkCount < 1) {
    failures.push("missing-chinese-name-correction-link-missing");
  }
  if (missingChineseNameCorrection.rowLinkCount < 1) {
    failures.push("missing-chinese-name-row-correction-link-missing");
  }
  if (
    missingChineseNameCorrection.template !== "data-correction.yml" ||
    missingChineseNameCorrection.labels !== "data-correction" ||
    missingChineseNameCorrection.rowTemplate !== "data-correction.yml" ||
    missingChineseNameCorrection.rowLabels !== "data-correction"
  ) {
    failures.push("missing-chinese-name-correction-template-mismatch");
  }
  if (
    missingChineseNameCorrection.title !==
      `Missing trusted Chinese name: ${missingChineseNameFixture.cas_number}` ||
    missingChineseNameCorrection.rowTitle !==
      `Missing trusted Chinese name: ${missingChineseNameFixture.cas_number}`
  ) {
    failures.push("missing-chinese-name-correction-title-mismatch");
  }
  if (
    missingChineseNameCorrection.casNumber !==
      missingChineseNameFixture.cas_number ||
    missingChineseNameCorrection.issueType !== "Chemical identity or alias" ||
    missingChineseNameCorrection.evidenceType !== "Other" ||
    missingChineseNameCorrection.rowCasNumber !==
      missingChineseNameFixture.cas_number ||
    missingChineseNameCorrection.rowIssueType !== "Chemical identity or alias" ||
    missingChineseNameCorrection.rowEvidenceType !== "Other"
  ) {
    failures.push("missing-chinese-name-correction-fields-mismatch");
  }
  if (
    !missingChineseNameCorrection.currentOutput.includes(
      "does not have a trusted Chinese name",
    ) ||
    !missingChineseNameCorrection.expectedOutput.includes(
      "Traditional Chinese name",
    ) ||
    !missingChineseNameCorrection.rowCurrentOutput.includes(
      "does not have a trusted Chinese name",
    ) ||
    !missingChineseNameCorrection.rowExpectedOutput.includes(
      "Traditional Chinese name",
    ) ||
    !missingChineseNameCorrection.body.includes(
      "- Issue key: missing-chinese-name",
    ) ||
    !missingChineseNameCorrection.body.includes("- Evidence type: Other") ||
    !missingChineseNameCorrection.body.includes(
      "- Evidence prompt: SDS, supplier label, catalog, or regulatory source",
    ) ||
    !missingChineseNameCorrection.rowBody.includes(
      "- Issue key: missing-chinese-name",
    ) ||
    !missingChineseNameCorrection.rowBody.includes("- Evidence type: Other") ||
    !missingChineseNameCorrection.rowBody.includes(
      "- Evidence prompt: SDS, supplier label, catalog, or regulatory source",
    )
  ) {
    failures.push("missing-chinese-name-correction-structured-context-missing");
  }
  if (
    !missingChineseNameCorrection.body.includes(
      `- CAS: ${missingChineseNameFixture.cas_number}`,
    ) ||
    !missingChineseNameCorrection.body.includes(
      `- English name: ${missingChineseNameFixture.name_en}`,
    ) ||
    !/SDS|supplier|authoritative/i.test(missingChineseNameCorrection.body)
  ) {
    failures.push("missing-chinese-name-correction-body-incomplete");
  }
  if (
    !missingChineseNameCorrection.rowBody.includes(
      `- CAS: ${missingChineseNameFixture.cas_number}`,
    ) ||
    !missingChineseNameCorrection.rowBody.includes(
      `- English name: ${missingChineseNameFixture.name_en}`,
    ) ||
    !/SDS|supplier|authoritative/i.test(missingChineseNameCorrection.rowBody)
  ) {
    failures.push("missing-chinese-name-row-correction-body-incomplete");
  }
  if (!unresolvedSearchCorrection.rowText.includes(unresolvedSearchTerm)) {
    failures.push("unresolved-search-row-identity-missing");
  }
  if (
    !unresolvedSearchCorrection.rowText.includes(
      unresolvedSearchFixture.error,
    )
  ) {
    failures.push("unresolved-search-row-error-missing");
  }
  if (unresolvedSearchCorrection.checkboxCount > 0) {
    failures.push("unresolved-search-checkbox-present");
  }
  if (unresolvedSearchCorrection.detailButtonCount > 0) {
    failures.push("unresolved-search-detail-button-present");
  }
  if (unresolvedSearchCorrection.correction.count < 1) {
    failures.push("unresolved-search-correction-link-missing");
  }
  if (
    unresolvedSearchCorrection.correction.count > 0 &&
    (unresolvedSearchCorrection.correction.template !==
      "data-correction.yml" ||
      unresolvedSearchCorrection.correction.labels !== "data-correction")
  ) {
    failures.push("unresolved-search-correction-template-mismatch");
  }
  if (
    unresolvedSearchCorrection.correction.count > 0 &&
    !hasStructuredCorrectionContext(unresolvedSearchCorrection.correction, {
      formIssueType: "Chemical identity or alias",
      issueKey: "unresolved-search",
      casNumber: unresolvedSearchTerm,
      evidenceType: "Other",
      evidencePromptIncludes: "SDS, supplier label, catalog, or regulatory source",
      currentOutputIncludes: "could not resolve this lookup",
      expectedOutputIncludes: "reviewed CAS/name mapping",
    })
  ) {
    failures.push("unresolved-search-correction-structured-context-missing");
  }
  if (
    unresolvedSearchCorrection.correction.count > 0 &&
    !unresolvedSearchCorrection.correction.localContext.includes(
      "admin dictionary curation",
    )
  ) {
    failures.push("unresolved-search-correction-curation-context-missing");
  }
  if (
    !/\b7\b/.test(batchInputNormalization.readySummary) ||
    !/\b9\b/.test(batchInputNormalization.readySummary)
  ) {
    failures.push("batch-input-ready-summary-mismatch");
  }
  if (
    !/1 invalid CAS/.test(
      batchInputNormalization.diagnosticSummaries?.invalid || "",
    ) ||
    !/344-04-07/.test(
      batchInputNormalization.diagnosticSummaries?.invalid || "",
    ) ||
    !/2 spreadsheet CAS/.test(
      batchInputNormalization.diagnosticSummaries?.rehyphenated || "",
    ) ||
    !/67641 -> 67-64-1/.test(
      batchInputNormalization.diagnosticSummaries?.rehyphenated || "",
    ) ||
    !/0118-12-7 -> 118-12-7/.test(
      batchInputNormalization.diagnosticSummaries?.rehyphenated || "",
    )
  ) {
    failures.push("batch-input-diagnostics-missing");
  }
  if (batchInputNormalization.searchButtonDisabled) {
    failures.push("batch-input-search-button-disabled");
  }
  if (batchInputNormalization.overLimitAlertCount > 0) {
    failures.push("batch-input-overlimit-alert-unexpected");
  }
  const batchResultSummary = batchInputNormalization.resultSummary || {};
  if (!batchResultSummary.workflowSummaryVisible) {
    failures.push("batch-results-workflow-summary-missing");
  }
  if (batchResultSummary.rowCount !== 7) {
    failures.push("batch-results-row-count-mismatch");
  }
  if (!/\/\s*7\b/.test(batchResultSummary.foundValue || "")) {
    failures.push("batch-results-found-summary-total-mismatch");
  }
  if (!/\b7\b/.test(batchResultSummary.exportValue || "")) {
    failures.push("batch-results-export-summary-mismatch");
  }
  if (batchResultSummary.filteredScopeCount > 0) {
    failures.push("batch-results-filtered-scope-unexpected");
  }
  if (!batchResultSummary.nextActionTitle) {
    failures.push("batch-results-next-action-title-missing");
  }
  if (!batchResultSummary.nextActionBody) {
    failures.push("batch-results-next-action-body-missing");
  }
  if (Number(batchResultSummary.reviewValue || 0) > 0) {
    if (batchResultSummary.reviewActionQueueCount < 1) {
      failures.push("batch-results-review-action-queue-missing");
    }
    if (!/\d/.test(batchResultSummary.reviewActionQueueText || "")) {
      failures.push("batch-results-review-action-queue-count-missing");
    }
    if (!batchResultSummary.nextActionCta) {
      failures.push("batch-results-next-action-cta-missing");
    }
  }
  if (urlQueryHydration.inputValue !== searchTerm) {
    failures.push("url-query-hydration-input-mismatch");
  }
  if (!urlQueryHydration.rowText.includes(searchTerm)) {
    failures.push("url-query-hydration-result-missing");
  }
  if (!/border-blue-700|bg-blue-50/.test(urlQueryHydration.singleTabClass)) {
    failures.push("url-query-hydration-single-tab-inactive");
  }
  if (urlQueryHydration.batchReadySummaryCount > 0) {
    failures.push("url-query-hydration-batch-summary-visible");
  }

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
  if (
    !isRectInsideViewport(
      mobileReadFirst.decisionGuideRect,
      mobileReadFirst.viewportWidth,
    )
  ) {
    failures.push("mobile-read-first-decision-guide-offscreen");
  }
  if ((mobileReadFirst.decisionStepRects || []).length < 3) {
    failures.push("mobile-read-first-decision-guide-incomplete");
  }
  const mobileDecisionVerticalRisks = (
    mobileReadFirst.decisionStepRects || []
  ).filter(isVerticalTextRisk);
  if (mobileDecisionVerticalRisks.length > 0) {
    failures.push("mobile-read-first-decision-guide-vertical-text");
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
    noGhsSearchTerm,
    executablePath,
    screenshotPath,
    expandedScreenshotPath,
    detailScreenshotPath,
    mobileScreenshotPath,
    mobileDetailScreenshotPath,
    noGhsScreenshotPath,
      noGhsDetailScreenshotPath,
      batchInputScreenshotPath,
      unresolvedSearchScreenshotPath,
      urlQueryHydrationScreenshotPath,
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
      exportPreviewSurface,
      detailTrustSurface,
      detailKeyboardSurface,
      prepareStackingSurface,
      detailComparisonColumnCount,
      detailComparisonEvidencePanelCount,
      detailComparisonEvidenceBadgeIds,
      detailComparisonMetrics,
      imageWaits,
      verticalRisks,
      mobileReadFirst,
      mobileDetailReadFirst,
      noGhsState,
      missingChineseNameCorrection,
      unresolvedSearchCorrection,
      batchInputNormalization,
      urlQueryHydration,
      mobileDetailComparisonCardCount,
      mobileDetailComparisonEvidencePanelCount,
      mobileDetailComparisonMetrics,
    },
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(summarizeSearchUiReportForConsole(report), null, 2),
  );

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
