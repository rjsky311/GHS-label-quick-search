import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_PRODUCTION_URL = "https://ghs-frontend.zeabur.app";
const DEFAULT_REPORT_PATH = "build/production-batch-print-report.json";
const DEFAULT_SCREENSHOT_DIR = "build/production-batch-print-screenshots";
const SEARCH_TIMEOUT_MS = Number.parseInt(
  process.env.BATCH_PRINT_QA_SEARCH_TIMEOUT_MS || "120000",
  10,
);
const MODAL_TIMEOUT_MS = Number.parseInt(
  process.env.BATCH_PRINT_QA_MODAL_TIMEOUT_MS || "30000",
  10,
);

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

const parseBatchCas = () => {
  const raw = (process.env.BATCH_PRINT_QA_CAS || "").trim();
  const list = raw
    ? raw.split(/[\s,;\t]+/).filter(Boolean)
    : DEFAULT_BATCH_CAS;
  const limit = Number.parseInt(
    process.env.BATCH_PRINT_QA_LIMIT || String(list.length),
    10,
  );
  return list.slice(0, Math.max(1, limit));
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("qaBatchPrint", "1");
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
  const reportPath = path.resolve(
    process.cwd(),
    process.env.BATCH_PRINT_QA_REPORT_PATH || DEFAULT_REPORT_PATH,
  );
  const screenshotDir = path.resolve(
    process.cwd(),
    process.env.BATCH_PRINT_QA_SCREENSHOT_DIR || DEFAULT_SCREENSHOT_DIR,
  );
  const casList = parseBatchCas();
  const browser = await chromium.launch({
    executablePath: resolveChromeExecutable(),
    headless: process.env.BATCH_PRINT_QA_HEADLESS !== "0",
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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

    const fitReport = await page.evaluate(() => {
      const textOf = (testId) =>
        document
          .querySelector(`[data-testid="${testId}"]`)
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "";
      const frame = document.querySelector(
        '[data-testid="label-fragment-preview"]',
      );
      const label = frame?.contentDocument?.querySelector(".label");
      return {
        ready: textOf("batch-fit-ready"),
        review: textOf("batch-fit-review"),
        excluded: textOf("batch-fit-excluded"),
        active: textOf("batch-active-preview-summary"),
        printAction: textOf("print-label-action"),
        labelClass: label?.className || "",
      };
    });
    if (!fitReport.ready.includes("Ready")) failures.push("missing-ready-count");
    if (!actionNamesReadyScope(fitReport.printAction)) {
      failures.push("print-action-does-not-name-ready-stock-batch");
    }
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
      if ((await page.getByTestId("batch-preview-rep-worstFit").count()) > 0) {
        await page.getByTestId("batch-preview-rep-worstFit").click();
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
    } else if (!scopeBefore.visible) {
      failures.push("missing-batch-print-scope-controls");
    }

    await page.getByTestId("batch-preview-rep-worstFit").click();
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

    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, "batch-print-modal.png"),
      fullPage: false,
    });

    const report = {
      ok: failures.length === 0,
      generatedAt: new Date().toISOString(),
      productionUrl,
      casCount: casList.length,
      casList,
      printableCount,
      fitReport,
      scopeBefore,
      scopeAfter,
      scopeExerciseStock,
      representative,
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
