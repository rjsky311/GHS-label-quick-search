import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_PRODUCTION_URL = "https://ghs-frontend.zeabur.app";
const SEARCH_TIMEOUT_MS = Number.parseInt(
  process.env.BATCH_PRINT_QA_SEARCH_TIMEOUT_MS || "120000",
  10,
);
const MODAL_TIMEOUT_MS = Number.parseInt(
  process.env.BATCH_PRINT_QA_MODAL_TIMEOUT_MS || "30000",
  10,
);

const args = process.argv.slice(2);

const cliOption = (name) => {
  const flag = `--${name}`;
  const assignment = `${flag}=`;
  const assigned = args.find((arg) => arg.startsWith(assignment));
  if (assigned) return assigned.slice(assignment.length);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] || "" : "";
};

const actionNamesStockAndExclusion = (text = "") =>
  (text.includes("labels on") || text.includes("列印")) &&
  (text.includes("excluded") || text.includes("排除"));

const actionNamesReadyScope = (text = "") =>
  actionNamesStockAndExclusion(text) &&
  (text.includes("ready") || text.includes("可直接輸出"));

const actionNamesSelectedScope = (text = "") =>
  actionNamesStockAndExclusion(text) &&
  (text.includes("selected") || text.includes("已確認"));

const DEFAULT_BATCH_CAS = [
  "64-17-5",
  "7647-01-0",
  "90-41-5",
  "67-56-1",
  "7664-93-9",
  "1310-73-2",
  "7722-84-1",
  "50-00-0",
  "75-07-0",
  "108-88-3",
  "67-64-1",
  "71-43-2",
  "109-99-9",
  "110-54-3",
  "75-05-8",
  "7782-50-5",
  "7664-41-7",
  "7697-37-2",
  "7783-06-4",
  "100-41-4",
  "1330-20-7",
  "108-95-2",
  "75-09-2",
  "79-01-6",
  "107-06-2",
  "127-18-4",
  "7782-44-7",
  "7727-37-9",
  "124-38-9",
  "7775-09-9",
  "1313-99-1",
  "7440-43-9",
  "7439-97-6",
  "7440-38-2",
  "7440-66-6",
  "7778-50-9",
  "7758-99-8",
  "12125-02-9",
  "10043-35-3",
  "7446-70-0",
  "10025-87-3",
  "10026-13-8",
  "7790-94-5",
  "108-24-7",
  "64-19-7",
  "107-21-1",
  "100-42-5",
  "75-21-8",
  "75-15-0",
  "7440-02-0",
  "7439-92-1",
];

const LAB_READY_BATCH_CAS = [
  "90-41-5",
  "84-65-1",
  "462-08-8",
  "123-30-8",
  "635-12-1",
  "455-14-1",
  "67-64-1",
  "78-67-1",
  "62-53-3",
  "107-18-6",
  "504-24-5",
  "586-78-7",
  "90-90-4",
  "1122-91-4",
  "135999-16-5",
  "443-81-2",
  "2040-89-3",
  "28165-49-3",
  "576-83-0",
  "99-90-1",
  "24596-19-8",
  "43192-33-2",
  "106-40-1",
  "623-00-7",
  "90-90-4",
  "106-41-2",
  "106-41-2",
  "106-41-2",
  "106-41-2",
  "110046-60-1",
  "34598-49-7",
  "103966-66-1",
  "31181-90-5",
  "95-14-7",
  "111-25-1",
  "111-25-1",
  "583-69-7",
  "74-96-4",
  "3132-99-8",
  "25013-16-5",
  "458-50-4",
  "104-92-7",
  "29504-81-2",
  "589-87-7",
  "119-61-9",
  "2357-52-0",
  "104-95-0",
  "1003-09-4",
  "19524-06-2",
  "1878-68-8",
  "69249-61-2",
  "586-76-5",
  "106-38-7",
  "73870-24-3",
  "20469-65-2",
  "591-20-8",
  "112-89-0",
  "111-83-1",
  "143-15-7",
  "366-18-7",
  "626-55-1",
  "589-15-1",
  "492-97-7",
  "693-58-3",
  "23703-22-2",
  "4482-03-5",
  "556-96-7",
  "109-63-7",
  "73183-34-3",
  "73183-34-3",
  "872-31-1",
  "4701-17-1",
  "203302-95-8",
  "100-39-0",
  "3163-76-6",
  "344-04-07",
  "110-53-2",
  "112-29-8",
  "112-29-8",
  "106-94-5",
  "3511-90-8",
  "138526-69-9",
  "160976-02-3",
  "112-82-3",
  "104-92-7",
  "2857-97-8",
  "2857-97-8",
  "5467-74-3",
  "4224-70-8",
  "2398-37-0",
];

const NAMED_BATCH_FIXTURES = {
  default: DEFAULT_BATCH_CAS,
  "lab-ready": LAB_READY_BATCH_CAS,
};

const CAS_LIKE_PATTERN = /^\d{1,7}-\d{2}-\d$/;

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
    process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
    process.env.CHROME_EXECUTABLE_PATH ||
    process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const candidates = explicit ? [explicit] : commonChromePaths();
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      "Could not find Chrome/Edge. Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH.",
    );
  }
  return found;
};

const clickRepresentativePreview = async (page, representative) => {
  const testId = `batch-preview-rep-${representative}`;
  const button = page.getByTestId(testId);
  if (!(await button.count())) return false;

  try {
    await button.click({ timeout: 5000 });
    return true;
  } catch (error) {
    await page.evaluate((targetTestId) => {
      const node = document.querySelector(`[data-testid="${targetTestId}"]`);
      if (!node) return;
      node.scrollIntoView({ block: "center", inline: "nearest" });
      node.click();
    }, testId);
    return true;
  }
};

const inspectBatchResultsState = async (page) =>
  page.evaluate(() => {
    const textOf = (testId) =>
      document
        .querySelector(`[data-testid="${testId}"]`)
        ?.textContent?.replace(/\s+/g, " ")
        .trim() || "";
    const workflowSummary = Array.from(
      document.querySelectorAll('[data-testid^="results-workflow-summary-"]'),
    )
      .map((node) => {
        const testId = node.getAttribute("data-testid") || "";
        if (testId.endsWith("-value")) return null;
        const key = testId.replace("results-workflow-summary-", "");
        return {
          key,
          text: (node.textContent || "").replace(/\s+/g, " ").trim(),
          value: textOf(`${testId}-value`),
        };
      })
      .filter(Boolean);
    const reviewReasons = Array.from(
      document.querySelectorAll(
        '[data-testid^="results-workflow-review-reason-"]',
      ),
    ).map((node) => ({
      type: (node.getAttribute("data-testid") || "").replace(
        "results-workflow-review-reason-",
        "",
      ),
      text: (node.textContent || "").replace(/\s+/g, " ").trim(),
    }));
    return {
      workflowSummary,
      nextAction: {
        title: textOf("results-next-action-title"),
        body: textOf("results-next-action-body"),
        cta: textOf("results-next-action-primary"),
      },
      reviewReasonText: textOf("results-workflow-review-reasons"),
      reviewReasons,
    };
  });

const inspectExportPreviewSurface = async (page) => {
  const exportButton = page.getByTestId("export-csv-btn");
  if (!(await exportButton.count())) {
    return {
      available: false,
      headers: [],
      bodyText: "",
    };
  }
  await exportButton.click();
  const modal = page.getByTestId("export-preview-modal");
  await modal.waitFor({ state: "visible", timeout: 10000 });
  const headers = await modal.locator("thead th").evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent || "").replace(/\s+/g, " ").trim()),
  );
  const bodyText = ((await modal.textContent()) || "").replace(/\s+/g, " ");
  await modal.getByTestId("export-preview-cancel").click();
  await modal.waitFor({ state: "hidden", timeout: 10000 });
  return {
    available: true,
    headers,
    bodyText,
    hasPrintable: headers.some((header) => /Printable/i.test(header)),
    hasReviewRequired: headers.some((header) => /Needs Review/i.test(header)),
    hasReviewReasons: headers.some((header) => /Review Reasons/i.test(header)),
    hasMultipleGhsStatus: headers.some((header) =>
      /Multiple GHS Status/i.test(header),
    ),
    hasClassificationSelection: headers.some((header) =>
      /Classification Selection/i.test(header),
    ),
    hasSourceEvidence: /ECHA|PubChem/i.test(bodyText),
  };
};

const parseBatchCas = () => {
  const raw = (process.env.BATCH_PRINT_QA_CAS || "").trim();
  const requestedFixture =
    process.env.BATCH_PRINT_QA_FIXTURE || cliOption("fixture") || "default";
  const fixtureName = raw ? "env" : requestedFixture;
  const baseList = raw
    ? raw.split(/[\s,;\t]+/).filter(Boolean)
    : NAMED_BATCH_FIXTURES[fixtureName];
  if (!baseList) {
    throw new Error(
      `Unknown batch-print QA fixture "${fixtureName}". Available fixtures: ${Object.keys(
        NAMED_BATCH_FIXTURES,
      ).join(", ")}`,
    );
  }
  const limit = Number.parseInt(
    cliOption("limit") ||
      process.env.BATCH_PRINT_QA_LIMIT ||
      String(baseList.length),
    10,
  );
  const list = baseList.slice(0, Math.max(1, limit));
  const uniqueCas = new Set(list);
  const invalidLike = list.filter((cas) => !CAS_LIKE_PATTERN.test(cas));
  return {
    fixtureName,
    list,
    rawCount: list.length,
    uniqueCount: uniqueCas.size,
    duplicateCount: list.length - uniqueCas.size,
    invalidLikeCount: invalidLike.length,
    invalidLike,
  };
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("qaBatchPrint", "1");
  nextUrl.searchParams.set("qaPrintHandoff", "1");
  nextUrl.searchParams.set("productionBatchPrintQa", Date.now().toString());
  return nextUrl.toString();
};

const writeJson = (targetPath, payload) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const run = async () => {
  const productionUrl =
    process.env.BATCH_PRINT_QA_PRODUCTION_URL ||
    process.env.PRINT_QA_PRODUCTION_URL ||
    DEFAULT_PRODUCTION_URL;
  const batchFixture = parseBatchCas();
  const fixtureSuffix =
    batchFixture.fixtureName && batchFixture.fixtureName !== "default"
      ? `-${batchFixture.fixtureName}`
      : "";
  const reportPath = path.resolve(
    process.cwd(),
    process.env.BATCH_PRINT_QA_REPORT_PATH ||
      `build/production-batch-print${fixtureSuffix}-report.json`,
  );
  const screenshotDir = path.resolve(
    process.cwd(),
    process.env.BATCH_PRINT_QA_SCREENSHOT_DIR ||
      `build/production-batch-print${fixtureSuffix}-screenshots`,
  );
  const casList = batchFixture.list;
  const browser = await chromium.launch({
    executablePath: resolveChromeExecutable(),
    headless: process.env.BATCH_PRINT_QA_HEADLESS !== "0",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const dialogMessages = [];
  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.accept();
  });
  await page.addInitScript(() => {
    window.localStorage.setItem("ghs_language", "en");
  });
  const failures = [];

  try {
    await page.goto(withQaParam(productionUrl), {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("batch-search-tab").click();
    await page.getByTestId("batch-cas-input").fill(casList.join("\n"));
    const batchInputState = await page.evaluate(() => {
      const textOf = (testId) =>
        document
          .querySelector(`[data-testid="${testId}"]`)
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "";
      return {
        readySummary: textOf("batch-ready-summary"),
        duplicateSummary: textOf("batch-duplicate-summary"),
        invalidSummary: textOf("batch-invalid-summary"),
      };
    });
    if (
      batchFixture.fixtureName === "lab-ready" &&
      batchFixture.duplicateCount > 0 &&
      !batchInputState.duplicateSummary
    ) {
      failures.push("lab-ready-duplicate-diagnostics-missing");
    }
    if (
      batchFixture.fixtureName === "lab-ready" &&
      batchFixture.invalidLikeCount > 0 &&
      !batchInputState.invalidSummary
    ) {
      failures.push("lab-ready-invalid-diagnostics-missing");
    }
    await page.getByTestId("batch-search-btn").click();
    await page.getByTestId("print-all-with-ghs-btn").waitFor({
      state: "visible",
      timeout: SEARCH_TIMEOUT_MS,
    });

    const foundText =
      (await page.locator('[data-testid="print-all-with-ghs-btn"]').innerText()) ||
      "";
    const printableMatch = foundText.match(/(\d+)/);
    const printableCount = printableMatch ? Number(printableMatch[1]) : 0;
    if (printableCount < Math.min(10, casList.length)) {
      failures.push(`too-few-printable-results:${printableCount}`);
    }
    const expectedLabReadyPrintable = Math.min(50, batchFixture.rawCount);
    if (
      batchFixture.fixtureName === "lab-ready" &&
      printableCount < expectedLabReadyPrintable
    ) {
      failures.push(`lab-ready-too-few-printable-results:${printableCount}`);
    }

    const batchResultsState = await inspectBatchResultsState(page);
    const exportPreviewSurface = await inspectExportPreviewSurface(page);
    if (batchFixture.fixtureName === "lab-ready") {
      if (batchResultsState.workflowSummary.length < 3) {
        failures.push("lab-ready-workflow-summary-missing");
      }
      if (!batchResultsState.nextAction?.title) {
        failures.push("lab-ready-next-action-title-missing");
      }
      if (!batchResultsState.nextAction?.body) {
        failures.push("lab-ready-next-action-body-missing");
      }
      if (batchResultsState.reviewReasons.length < 1) {
        failures.push("lab-ready-review-reasons-missing");
      }
      if (
        batchResultsState.reviewReasons.some(
          (reason) => !/\d/.test(reason.text || ""),
        )
      ) {
        failures.push("lab-ready-review-reason-count-missing");
      }
      if (!exportPreviewSurface.available) {
        failures.push("lab-ready-export-preview-unavailable");
      }
      if (!exportPreviewSurface.hasPrintable) {
        failures.push("lab-ready-export-printable-column-missing");
      }
      if (!exportPreviewSurface.hasReviewRequired) {
        failures.push("lab-ready-export-review-required-column-missing");
      }
      if (!exportPreviewSurface.hasReviewReasons) {
        failures.push("lab-ready-export-review-reasons-column-missing");
      }
      if (!exportPreviewSurface.hasMultipleGhsStatus) {
        failures.push("lab-ready-export-multiple-ghs-status-column-missing");
      }
      if (!exportPreviewSurface.hasClassificationSelection) {
        failures.push(
          "lab-ready-export-classification-selection-column-missing",
        );
      }
      if (!exportPreviewSurface.hasSourceEvidence) {
        failures.push("lab-ready-export-source-evidence-missing");
      }
    }

    await page.getByTestId("print-all-with-ghs-btn").click();
    await page.locator('[role="dialog"]').waitFor({
      state: "visible",
      timeout: MODAL_TIMEOUT_MS,
    });
    await page.locator('details[data-testid="print-output-plan"]').evaluate(
      (node) => {
        node.open = true;
      },
    );
    await page.getByTestId("batch-fit-report").waitFor({
      state: "visible",
      timeout: MODAL_TIMEOUT_MS,
    });
    await page.getByTestId("batch-preview-selector").waitFor({
      state: "visible",
      timeout: MODAL_TIMEOUT_MS,
    });

    const readFitReport = () => page.evaluate(() => {
      const textOf = (testId) =>
        document
          .querySelector(`[data-testid="${testId}"]`)
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "";
      const frame = document.querySelector(
        '[data-testid="label-fragment-preview"]',
      );
      const label = frame?.contentDocument?.querySelector(".label");
      const outputContract = document.querySelector(
        '[data-testid="batch-output-contract"]',
      );
      return {
        ready: textOf("batch-fit-ready"),
        review: textOf("batch-fit-review"),
        excluded: textOf("batch-fit-excluded"),
        outputContract: {
          text: textOf("batch-output-contract"),
          selectedItems: outputContract?.getAttribute("data-selected-items") || "",
          outputLabels: outputContract?.getAttribute("data-output-labels") || "",
          outputPages: outputContract?.getAttribute("data-output-pages") || "",
        },
        active: textOf("batch-active-preview-summary"),
        multipleGhsWarning: textOf("print-multiple-ghs-warning"),
        printAction: textOf("print-label-action"),
        labelClass: label?.className || "",
      };
    });
    let fitReport = await readFitReport();
    if (!fitReport.ready.includes("Ready")) failures.push("missing-ready-count");
    if (
      !/multiple GHS versions|多個 GHS 版本/i.test(
        fitReport.multipleGhsWarning || "",
      )
    ) {
      failures.push("batch-print-multiple-ghs-warning-missing");
    }
    let initialActionNamesBatch =
      actionNamesReadyScope(fitReport.printAction) ||
      /complete primary continuation set|完整|continuation/i.test(
        fitReport.printAction || "",
      );
    if (!fitReport.labelClass.includes("label")) {
      failures.push("missing-preview-label-fragment");
    }

    const readScopeState = () =>
      page.evaluate(() => {
        const textOf = (testId) =>
          document
            .querySelector(`[data-testid="${testId}"]`)
            ?.textContent?.replace(/\s+/g, " ")
            .trim() || "";
        const reducedControl = document.querySelector(
          '[data-testid="batch-include-reduced-purpose"]',
        );
        const continuationControl = document.querySelector(
          '[data-testid="batch-include-continuation"]',
        );
        return {
          visible: Boolean(
            document.querySelector('[data-testid="batch-print-scope-controls"]'),
          ),
          hasReducedControl: Boolean(reducedControl),
          hasContinuationControl: Boolean(continuationControl),
          summary: textOf("batch-print-scope-summary"),
        };
      });

    let scopeBefore = await readScopeState();
    let scopeExerciseStock = "initial";
    if (
      !scopeBefore.hasReducedControl &&
      !scopeBefore.hasContinuationControl &&
      (await page.getByTestId("primary-output-size-a4-primary").count()) > 0
    ) {
      await page.locator('[data-testid="responsible-profile-controls"]').evaluate(
        (node) => {
          node.open = true;
        },
      );
      await page.getByTestId("responsible-profile-field-organization").fill(
        "QA Lab",
      );
      await page.getByTestId("responsible-profile-field-phone").fill(
        "02-0000-0000",
      );
      await page.getByTestId("responsible-profile-field-address").fill(
        "QA Address",
      );
      await page.locator('[data-testid="stock-size-picker"]').evaluate(
        (node) => {
          node.open = true;
          node.scrollIntoView({ block: "center" });
        },
      );
      await page.getByTestId("primary-output-size-a4-primary").click();
      await page.waitForTimeout(500);
      scopeExerciseStock = "a4-primary";
      scopeBefore = await readScopeState();
    }

    fitReport = await readFitReport();
    if (!fitReport.outputContract.text) {
      failures.push("batch-output-contract-missing");
    }
    if (Number.parseInt(fitReport.outputContract.selectedItems || "0", 10) < 1) {
      failures.push("batch-output-contract-empty-selected");
    }
    if (
      Number.parseInt(fitReport.outputContract.outputLabels || "0", 10) <
      Number.parseInt(fitReport.outputContract.selectedItems || "0", 10)
    ) {
      failures.push("batch-output-contract-label-count-mismatch");
    }
    if (Number.parseInt(fitReport.outputContract.outputPages || "0", 10) < 1) {
      failures.push("batch-output-contract-empty-pages");
    }
    initialActionNamesBatch =
      actionNamesReadyScope(fitReport.printAction) ||
      /complete primary continuation set|continuation/i.test(
        fitReport.printAction || "",
      );
    if (!/labels\s*\/.*pages/i.test(fitReport.printAction || "")) {
      failures.push("batch-action-missing-physical-counts");
    }

    let scopeAfter = null;
    if (scopeBefore.hasReducedControl || scopeBefore.hasContinuationControl) {
      const controlTestId = scopeBefore.hasReducedControl
        ? "batch-include-reduced-purpose"
        : "batch-include-continuation";
      const expectedCategory = scopeBefore.hasReducedControl
        ? "reduced-purpose"
        : "same-stock-continuation";
      await page.getByTestId(controlTestId).click();
      await page.waitForTimeout(300);
      if (await clickRepresentativePreview(page, "worstFit")) {
        await page.waitForTimeout(300);
      }
      scopeAfter = await page.evaluate((category) => {
      const textOf = (testId) =>
        document
          .querySelector(`[data-testid="${testId}"]`)
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "";
        const frame = document.querySelector(
          '[data-testid="label-sheet-preview"]',
        );
        const labelFrame = document.querySelector(
          '[data-testid="label-fragment-preview"]',
        );
        const acknowledgedLabels = frame?.contentDocument?.querySelectorAll(
          `[data-batch-category="${category}"]`,
        );
        const acknowledgedPreviewLabels =
          labelFrame?.contentDocument?.querySelectorAll(
            `[data-batch-category="${category}"]`,
          );
        return {
          summary: textOf("batch-print-scope-summary"),
          printAction: textOf("print-label-action"),
          acknowledgedLabelCount:
            (acknowledgedLabels?.length || 0) +
            (acknowledgedPreviewLabels?.length || 0),
        };
      }, expectedCategory);
      if (!actionNamesSelectedScope(scopeAfter.printAction)) {
        failures.push("acknowledged-scope-action-not-selected-stock-batch");
      }
      if (scopeAfter.acknowledgedLabelCount < 1) {
        failures.push(`acknowledged-scope-preview-missing:${expectedCategory}`);
      }
    }

    await clickRepresentativePreview(page, "worstFit");
    await page.waitForTimeout(300);
    const representative = await page.evaluate(() => {
      const active = document.querySelector(
        '[data-testid="batch-active-preview-summary"]',
      );
      const frame = document.querySelector(
        '[data-testid="label-fragment-preview"]',
      );
      const labelText =
        frame?.contentDocument?.querySelector(".label")?.textContent || "";
      return {
        activeText: active?.textContent?.replace(/\s+/g, " ").trim() || "",
        labelText: labelText.replace(/\s+/g, " ").trim(),
      };
    });
    if (!representative.activeText) {
      failures.push("representative-summary-empty");
    }
    if (!representative.labelText) {
      failures.push("representative-preview-empty");
    }

    let printHandoff = null;
    const printAction = page.getByTestId("print-label-action");
    if (!(await printAction.count())) {
      failures.push("missing-batch-print-action");
    } else if (await printAction.isDisabled()) {
      failures.push("batch-print-action-disabled");
    } else {
      await page.evaluate(() => {
        document.getElementById("ghs-print-qa-status")?.remove();
      });
      await printAction.click();
      const status = page.locator("#ghs-print-qa-status");
      await status.waitFor({ state: "attached", timeout: MODAL_TIMEOUT_MS });
      await page.waitForFunction(
        () => {
          const node = document.getElementById("ghs-print-qa-status");
          return ["qa_handoff", "blocked"].includes(node?.dataset?.status || "");
        },
        null,
        { timeout: MODAL_TIMEOUT_MS },
      );
      printHandoff = await status.evaluate((node) => ({
        status: node.dataset.status || "",
        stockPreset: node.dataset.stockPreset || "",
        issueTypes: node.dataset.issueTypes || "",
        totalLabels: node.dataset.totalLabels || "",
        totalPages: node.dataset.totalPages || "",
        text: node.textContent || "",
      }));
      if (printHandoff.status !== "qa_handoff") {
        failures.push(`batch-print-handoff-${printHandoff.status || "missing"}`);
      }
      if (!printHandoff.stockPreset) {
        failures.push("batch-print-handoff-missing-stock");
      }
      if (Number.parseInt(printHandoff.totalLabels || "0", 10) < 1) {
        failures.push("batch-print-handoff-empty");
      }
    }

    if (dialogMessages.length > 0) {
      failures.push("unexpected-browser-dialog");
    }

    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, "batch-print-modal.png"),
      fullPage: false,
    });

    const report = {
      ok: failures.length === 0,
      generatedAt: new Date().toISOString(),
      productionUrl,
      fixtureName: batchFixture.fixtureName,
      fixture: {
        rawCount: batchFixture.rawCount,
        uniqueCount: batchFixture.uniqueCount,
        duplicateCount: batchFixture.duplicateCount,
        invalidLikeCount: batchFixture.invalidLikeCount,
        invalidLike: batchFixture.invalidLike,
      },
      casCount: casList.length,
      casList,
      batchInputState,
      printableCount,
      batchResultsState,
      exportPreviewSurface,
      fitReport,
      initialActionNamesBatch,
      scopeBefore,
      scopeAfter,
      scopeExerciseStock,
      representative,
      printHandoff,
      dialogMessages,
      screenshotDir,
      failures,
    };
    writeJson(reportPath, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
};

await run();
