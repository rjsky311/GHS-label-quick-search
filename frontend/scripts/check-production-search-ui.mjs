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
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const detailButton = await inspectActionButton(page, "detail-btn-0");
  const sdsButton = await inspectActionButton(page, "sds-btn-0");
  const actionButtons = [detailButton, sdsButton];
  const verticalRisks = actionButtons.filter(isVerticalTextRisk);

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

  const pictogramStrip = page.getByTestId("ghs-pictogram-strip").first();
  const pictogramTiles = await pictogramStrip
    .getByTestId("ghs-pictogram-tile")
    .count();
  if (pictogramTiles < 4) {
    failures.push("result-ghs-pictogram-count");
  }

  const report = {
    ok: failures.length === 0,
    productionUrl,
    searchTerm,
    executablePath,
    screenshotPath,
    failures,
    searchAttempts,
    metrics: {
      detailButton,
      sdsButton,
      pictogramTiles,
      verticalRisks,
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
