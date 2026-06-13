import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const env = process.env;
const appUrl = env.WORKBENCH_QA_URL || "http://127.0.0.1:5173/";
const outputDir = path.resolve(
  process.cwd(),
  env.WORKBENCH_QA_OUTPUT_DIR || "build/experiment-notebook-workbench",
);
const headless = env.WORKBENCH_QA_HEADLESS !== "0";

const selectors = {
  workbench: '[data-testid="empty-workbench"]',
  grid: '[data-testid="empty-workbench-grid"]',
  primary: '[data-testid="empty-workbench-primary"]',
  support: '[data-testid="empty-workbench-support"]',
  tools: '[data-testid="empty-workbench-tools"]',
  trustSlot: '[data-testid="empty-workbench-trust-slot"]',
  trustPanel: '[data-testid="product-trust-panel-empty"]',
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
      "Could not find Chrome/Edge. Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH.",
    );
  }
  return found;
};

const withQaParam = (url) => {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("workbenchQa", Date.now().toString());
  return nextUrl.toString();
};

const roundedRect = (rect) =>
  rect
    ? {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
      }
    : null;

const inspectWorkbench = async (page) =>
  page.evaluate((selectorMap) => {
    const rectOf = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };

    const missingSelectors = Object.entries(selectorMap)
      .filter(([, selector]) => !document.querySelector(selector))
      .map(([key, selector]) => ({ key, selector }));

    const workbenchNode = document.querySelector(selectorMap.workbench);
    const overflowSelectors = [
      ...Object.values(selectorMap).filter(
        (selector) => selector !== selectorMap.workbench,
      ),
      '[data-testid="product-trust-proof-list-empty"]',
      '[data-testid^="empty-workflow-card-"]',
      '[data-testid^="empty-feature-card-"]',
      "button",
      "a",
    ].join(",");
    const overflowCandidates = workbenchNode
      ? [workbenchNode, ...workbenchNode.querySelectorAll(overflowSelectors)]
      : Array.from(document.querySelectorAll(overflowSelectors));
    const overflowNodes = Array.from(new Set(overflowCandidates))
      .map((node) => ({
        testId: node.getAttribute("data-testid") || "",
        tagName: node.tagName,
        text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }))
      .filter((item) => item.scrollWidth > item.clientWidth + 2);

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      workbench: rectOf(selectorMap.workbench),
      grid: rectOf(selectorMap.grid),
      primary: rectOf(selectorMap.primary),
      support: rectOf(selectorMap.support),
      tools: rectOf(selectorMap.tools),
      trustSlot: rectOf(selectorMap.trustSlot),
      trustPanel: rectOf(selectorMap.trustPanel),
      missingSelectors,
      overflowNodes,
    };
  }, selectors);

const alignmentDelta = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.right - b.right));
};

const maxScrollWidth = (metrics) =>
  Math.max(metrics.documentScrollWidth, metrics.bodyScrollWidth);

const inspectViewport = async (browser, viewport, screenshotName) => {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: "zh-TW",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    await page.goto(withQaParam(appUrl), {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByTestId("empty-workbench").waitFor({
      state: "visible",
      timeout: 60000,
    });
    await page.screenshot({
      path: path.join(outputDir, screenshotName),
      fullPage: false,
    });
    const rawMetrics = await inspectWorkbench(page);

    return {
      ...rawMetrics,
      workbench: roundedRect(rawMetrics.workbench),
      grid: roundedRect(rawMetrics.grid),
      primary: roundedRect(rawMetrics.primary),
      support: roundedRect(rawMetrics.support),
      tools: roundedRect(rawMetrics.tools),
      trustSlot: roundedRect(rawMetrics.trustSlot),
      trustPanel: roundedRect(rawMetrics.trustPanel),
      screenshot: path.join(outputDir, screenshotName),
    };
  } finally {
    await context.close();
  }
};

const writeReport = ({ failures, desktop = null, mobile = null }) => {
  const report = {
    ok: failures.length === 0,
    appUrl,
    outputDir,
    failures,
    desktop,
    mobile,
  };
  fs.writeFileSync(
    path.join(outputDir, "workbench-report.json"),
    JSON.stringify(report, null, 2),
  );
  const log = report.ok ? console.log : console.error;
  log(JSON.stringify(report, null, 2));
  return report;
};

fs.mkdirSync(outputDir, { recursive: true });

let browser;
const failures = [];
let desktop = null;
let mobile = null;

try {
  browser = await chromium.launch({
    executablePath: resolveChromeExecutable(),
    headless,
  });

  desktop = await inspectViewport(
    browser,
    { width: 1440, height: 900 },
    "empty-desktop-1440.png",
  );
  mobile = await inspectViewport(
    browser,
    { width: 390, height: 844 },
    "empty-mobile-390.png",
  );

  const desktopAlignmentDelta = alignmentDelta(desktop.grid, desktop.trustSlot);
  if (desktopAlignmentDelta > 4) {
    failures.push(`desktop-grid-trust-alignment-${desktopAlignmentDelta}`);
  }
  if (maxScrollWidth(desktop) > desktop.viewport.width + 2) {
    failures.push("desktop-horizontal-scroll");
  }
  if (maxScrollWidth(mobile) > mobile.viewport.width + 2) {
    failures.push("mobile-horizontal-scroll");
  }
  if (desktop.missingSelectors.length > 0) {
    failures.push("desktop-missing-selectors");
  }
  if (mobile.missingSelectors.length > 0) {
    failures.push("mobile-missing-selectors");
  }
  if (mobile.overflowNodes.length > 0) {
    failures.push("mobile-text-overflow");
  }
} catch (error) {
  failures.push(`workbench-qa-error:${error.message}`);
} finally {
  if (browser) {
    await browser.close();
  }
}

const report = writeReport({ failures, desktop, mobile });
if (!report.ok) {
  process.exitCode = 1;
}
