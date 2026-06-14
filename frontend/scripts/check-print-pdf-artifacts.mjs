import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import {
  resolveQuickIdPictogramMinSidePx,
  resolveQrMinSidePx,
} from "./print-pdf-thresholds.mjs";

const env = process.env;
const DEFAULT_PRINT_HTML_DIR = "build/print-html-artifacts";
const DEFAULT_PDF_DIR = "build/print-pdf-artifacts";
const DEFAULT_REPORT_PATH = "build/print-pdf-report.json";
const GEOMETRY_TOLERANCE_PX = 2;

const printHtmlDir = path.resolve(
  process.cwd(),
  env.PRINT_QA_PRINT_HTML_DIR || DEFAULT_PRINT_HTML_DIR,
);
const pdfDir = path.resolve(process.cwd(), env.PRINT_QA_PDF_DIR || DEFAULT_PDF_DIR);
const outputPath = path.resolve(
  process.cwd(),
  env.PRINT_QA_PDF_REPORT_PATH || DEFAULT_REPORT_PATH,
);
const headless = env.PRINT_QA_HEADLESS !== "0";

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
        "Could not find a local Chrome/Edge executable for print PDF QA.",
        "Set PLAYWRIGHT_CHROME_EXECUTABLE_PATH to the browser executable path.",
      ].join(" "),
    );
  }
  return found;
};

const readIndex = () => {
  const indexPath = path.join(printHtmlDir, "index.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      [
        `Missing print HTML artifact index: ${indexPath}`,
        "Generate it first with:",
        "PRINT_QA_PRINT_HTML_DIR=build/print-html-artifacts npm run qa:print-report",
      ].join("\n"),
    );
  }
  return JSON.parse(fs.readFileSync(indexPath, "utf8"));
};

const inspectPrintDom = async (page, testCase) =>
  page.evaluate(
    ({
      expectedLabelKind,
      expectedPictograms,
      expectedHasQr,
      expectedStockPreset,
      expectedBatchCategories,
      expectedMinTotalLabels,
      expectedPrintMinPictogramSidePx,
      expectedPrintMinQrSidePx,
      quickIdPictogramMinSidePx,
      qrMinSidePx,
      expectedRequiredIdentityText,
      expectedRequiredIdentityTexts,
      expectedForbiddenIdentityTexts,
      tolerance,
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
      const elementOverflows = (element, tolerancePx = 1) => {
        if (!element) return false;
        const scrollHeight = Math.ceil(element.scrollHeight || 0);
        const clientHeight = Math.ceil(element.clientHeight || 0);
        const scrollWidth = Math.ceil(element.scrollWidth || 0);
        const clientWidth = Math.ceil(element.clientWidth || 0);
        return (
          (clientHeight > 0 && scrollHeight > clientHeight + tolerancePx) ||
          (clientWidth > 0 && scrollWidth > clientWidth + tolerancePx)
        );
      };
      const containsRect = (outer, inner, tolerancePx = 0) =>
        inner.left >= outer.left - tolerancePx &&
        inner.top >= outer.top - tolerancePx &&
        inner.right <= outer.right + tolerancePx &&
        inner.bottom <= outer.bottom + tolerancePx;
      const rectsOverlap = (left, right, tolerancePx = 0) =>
        left &&
        right &&
        left.right > right.left + tolerancePx &&
        left.left < right.right - tolerancePx &&
        left.bottom > right.top + tolerancePx &&
        left.top < right.bottom - tolerancePx;
      const unique = (values) => [...new Set(values)];
      const text = (element) =>
        (element?.innerText || element?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
      const normalizedText = (value) =>
        String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
      const labels = Array.from(
        document.querySelectorAll(".label:not(.label-placeholder)"),
      );
      const documentText = text(document.body);
      const normalizedDocumentText = normalizedText(documentText);
      const pictogramImages = Array.from(document.querySelectorAll("img"))
        .map((img) => ({
          img,
          alt: img.getAttribute("alt") || img.alt || "",
        }))
        .filter(({ alt }) => /^GHS\d{2}$/i.test(alt));
      const qrImages = Array.from(document.querySelectorAll(".qrcode-img"));
      const imageFailures = [...pictogramImages.map(({ img }) => img), ...qrImages]
        .filter((img) => !(img.complete && img.naturalWidth > 0))
        .map((img) => img.getAttribute("alt") || img.alt || img.src || "image");
      const contentSelectors = [
        [".label", "label"],
        [".page-grid", "page-grid"],
        [".name-section", "name-section"],
        [".cas", "cas"],
        [".meta-chip-cas", "cas-chip"],
        [".meta-chip-batch", "case-chip"],
        [".signal", "signal"],
        [".pictograms", "pictograms"],
        [".standard-rail", "standard-rail"],
        [".standard-main", "standard-main"],
        [".standard-hazard-board", "standard-hazard-board"],
        [".hazard-primary-list", "hazard-list"],
        [".hazard-summary-item", "hazard-summary"],
        [".hazard-code-list", "hazard-code-list"],
        [".qrcode-panel", "qr-panel"],
        [".qrcode-caption", "qr-caption"],
        [".compliance-core", "compliance-core"],
        [".compliance-alert-panel", "compliance-alert-panel"],
        [".compliance-statements-panel", "compliance-statements-panel"],
        [".compliance-hazard-panel", "compliance-hazard-panel"],
        [".compliance-precaution-panel", "compliance-precaution-panel"],
        [".statement-code", "statement-code"],
        [".statement-text", "statement-text"],
        [".compliance-footer", "compliance-footer"],
      ];
      const clippedElements = contentSelectors.flatMap(([selector, type]) =>
        Array.from(document.querySelectorAll(selector)).flatMap((element, index) => {
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return [];
          const label =
            element.classList?.contains("label") ? element : element.closest(".label");
          const labelRect = label?.getBoundingClientRect();
          const overflow = elementOverflows(element, tolerance);
          const withinLabel = labelRect ? containsRect(labelRect, rect, tolerance) : true;
          if (!overflow && withinLabel) return [];
          return [
            {
              type,
              key: `${type}-${index + 1}`,
              overflow,
              withinLabel,
              text: text(element).slice(0, 120),
              rect: rectToObject(rect),
            },
          ];
        }),
      );
      const visualIssues = labels.flatMap((label, labelIndex) => {
        const labelRect = label.getBoundingClientRect();
        const labelClass = label.className || "";
        const labelKind = labelClass.includes("label-kind-complete-primary")
          ? "complete-primary"
          : labelClass.includes("label-kind-qr-supplement")
            ? "qr-supplement"
            : labelClass.includes("label-kind-quick-id")
              ? "quick-id"
              : labelClass.includes("label-kind-supplemental")
                ? "supplemental"
                : "";
        const pictograms = Array.from(
          label.querySelectorAll('img[data-required-print-image="ghs-pictogram"]'),
        ).map((img, index) => ({
          index,
          rect: img.getBoundingClientRect(),
          alt: img.getAttribute("alt") || img.alt || "",
        }));
        const qr = label.querySelector(".qrcode-img")?.getBoundingClientRect();
        const cas = label
          .querySelector(".meta-chip-cas, .cas")
          ?.getBoundingClientRect();
        const signal = label
          .querySelector(".signal:not(.signal-placeholder)")
          ?.getBoundingClientRect();
        const nameSection = label
          .querySelector(".name-section")
          ?.getBoundingClientRect();
        const supportChips = Array.from(label.querySelectorAll(".support-chip"));
        const expectedSupportChip = expectedRequiredIdentityText
          ? supportChips.find((chip) =>
              normalizedText(text(chip)).includes(
                normalizedText(expectedRequiredIdentityText),
              ),
            )
          : null;

        const issues = [];
        const addIssue = (type, rect, extra = {}) => {
          issues.push({
            type,
            labelIndex,
            rect: rect ? rectToObject(rect) : null,
            ...extra,
          });
        };

        if (expectedLabelKind && labelKind !== expectedLabelKind) {
          addIssue("label-kind-mismatch", labelRect, {
            expected: expectedLabelKind,
            actual: labelKind,
          });
        }

        pictograms.forEach(({ index, rect, alt }) => {
          if (!containsRect(labelRect, rect, tolerance)) {
            addIssue("pictogram-outside-label", rect, { index, alt });
          }
          if (
            Number(expectedPrintMinPictogramSidePx) > 0 &&
            Math.min(rect.width, rect.height) <
              Number(expectedPrintMinPictogramSidePx)
          ) {
            addIssue("pictogram-too-small", rect, {
              index,
              alt,
              expectedMin: Number(expectedPrintMinPictogramSidePx),
            });
          }
        });
        if (qr && !containsRect(labelRect, qr, tolerance)) {
          addIssue("qr-outside-label", qr);
        }
        if (
          qr &&
          Number(expectedPrintMinQrSidePx) > 0 &&
          Math.min(qr.width, qr.height) < Number(expectedPrintMinQrSidePx)
        ) {
          addIssue("qr-too-small", qr, {
            expectedMin: Number(expectedPrintMinQrSidePx),
          });
        }
        if (cas && !containsRect(labelRect, cas, tolerance)) {
          addIssue("cas-outside-label", cas);
        }
        if (signal && !containsRect(labelRect, signal, tolerance)) {
          addIssue("signal-outside-label", signal);
        }
        if (expectedRequiredIdentityText && !expectedSupportChip) {
          addIssue("required-support-chip-missing", labelRect, {
            text: expectedRequiredIdentityText,
          });
        }
        if (expectedSupportChip) {
          const supportRect = expectedSupportChip.getBoundingClientRect();
          if (!containsRect(labelRect, supportRect, tolerance)) {
            addIssue("required-support-chip-outside-label", supportRect, {
              text: expectedRequiredIdentityText,
            });
          }
          pictograms.forEach(({ rect, alt, index }) => {
            if (rectsOverlap(supportRect, rect, -1)) {
              addIssue("support-chip-overlaps-pictogram", supportRect, {
                text: expectedRequiredIdentityText,
                alt,
                index,
              });
            }
          });
          if (qr && rectsOverlap(supportRect, qr, -1)) {
            addIssue("support-chip-overlaps-qr", supportRect, {
              text: expectedRequiredIdentityText,
            });
          }
          if (signal && rectsOverlap(supportRect, signal, -1)) {
            addIssue("support-chip-overlaps-signal", supportRect, {
              text: expectedRequiredIdentityText,
            });
          }
        }

        if (labelClass.includes("label-kind-quick-id")) {
          pictograms.forEach(({ index, rect, alt }) => {
            if (cas && rectsOverlap(rect, cas, -1)) {
              addIssue("pictogram-overlaps-cas", rect, { index, alt });
            }
            if (signal && rectsOverlap(rect, signal, -1)) {
              addIssue("pictogram-overlaps-signal", rect, { index, alt });
            }
            if (nameSection && rectsOverlap(rect, nameSection, -1)) {
              addIssue("pictogram-overlaps-name", rect, { index, alt });
            }
            if (
              Math.min(rect.width, rect.height) <
              quickIdPictogramMinSidePx
            ) {
              addIssue("pictogram-too-small", rect, { index, alt });
            }
          });
        }

        if (labelClass.includes("label-kind-qr-supplement")) {
          pictograms.forEach(({ index, rect, alt }) => {
            if (qr && rectsOverlap(rect, qr, -1)) {
              addIssue("pictogram-overlaps-qr", rect, { index, alt });
            }
          });
          if (
            qr &&
            Math.min(qr.width, qr.height) < qrMinSidePx
          ) {
            addIssue("qr-too-small", qr);
          }
        }

        return issues;
      });
      const pictogramCodes = unique(
        pictogramImages.map(({ alt }) => alt.toUpperCase()),
      ).sort();
      const labelStocks = labels.map((label) =>
        label.getAttribute("data-print-stock") || "",
      );
      const stockPresets = unique(labelStocks.filter(Boolean)).sort();
      const batchCategories = unique(
        labels
          .map((label) => label.getAttribute("data-batch-category") || "")
          .filter(Boolean),
      ).sort();
      const missingBatchCategoryCount = (expectedBatchCategories || []).length
        ? labels.filter((label) => !label.getAttribute("data-batch-category"))
            .length
        : 0;
      const expectedSet = new Set(expectedPictograms || []);
      const actualSet = new Set(pictogramCodes);
      const expectedPictogramsPresent =
        expectedSet.size === 0 ||
        [...expectedSet].every((code) => actualSet.has(code));
      const exactPictograms =
        expectedSet.size === 0 ||
        (expectedSet.size === actualSet.size &&
          [...expectedSet].every((code) => actualSet.has(code)));

      return {
        labelCount: labels.length,
        pictogramCodes,
        expectedPictogramsPresent,
        exactPictograms,
        hasQr: qrImages.length > 0,
        expectedHasQr: Boolean(expectedHasQr),
        labelKinds: unique(
          labels
            .map((label) => {
              const labelClass = label.className || "";
              if (labelClass.includes("label-kind-complete-primary")) {
                return "complete-primary";
              }
              if (labelClass.includes("label-kind-qr-supplement")) {
                return "qr-supplement";
              }
              if (labelClass.includes("label-kind-quick-id")) {
                return "quick-id";
              }
              if (labelClass.includes("label-kind-supplemental")) {
                return "supplemental";
              }
              return "";
            })
            .filter(Boolean),
        ),
        stockPresets,
        expectedStockPreset: expectedStockPreset || "",
        stockPresetMatches:
          !expectedStockPreset ||
          (stockPresets.length === 1 && stockPresets[0] === expectedStockPreset),
        batchCategories,
        expectedBatchCategories: expectedBatchCategories || [],
        expectedBatchCategoriesPresent: (expectedBatchCategories || []).every(
          (category) => batchCategories.includes(category),
        ),
        missingBatchCategoryCount,
        allLabelsHaveBatchCategory:
          !(expectedBatchCategories || []).length ||
          missingBatchCategoryCount === 0,
        hasMorePics: document.body.textContent.includes("more-pics"),
        imageFailures,
        clippedElements,
        visualIssues,
        requiredIdentityTextVisible:
          !expectedRequiredIdentityText ||
          normalizedDocumentText.includes(
            normalizedText(expectedRequiredIdentityText),
          ),
        requiredIdentityTextsVisible: (expectedRequiredIdentityTexts || []).every(
          (candidate) =>
            normalizedDocumentText.includes(normalizedText(candidate)),
        ),
        forbiddenIdentityTextsAbsent: (expectedForbiddenIdentityTexts || []).every(
          (candidate) =>
            !normalizedDocumentText.includes(normalizedText(candidate)),
        ),
        hasMinimumLabels: labels.length >= Number(expectedMinTotalLabels || 1),
      };
    },
    {
      expectedLabelKind: testCase.expectedLabelKind || "",
      expectedLabelKinds: testCase.expectedLabelKinds || [],
      expectedPictograms: testCase.expectedPictograms || [],
      expectedHasQr: Boolean(testCase.expectedHasQr),
      expectedStockPreset: testCase.expectedStockPreset || "",
      expectedBatchCategories: testCase.expectedBatchCategories || [],
      expectedMinTotalLabels: testCase.expectedMinTotalLabels || 1,
      expectedPrintMinPictogramSidePx:
        testCase.expectedPrintMinPictogramSidePx || 0,
      expectedPrintMinQrSidePx: testCase.expectedPrintMinQrSidePx || 0,
      quickIdPictogramMinSidePx: resolveQuickIdPictogramMinSidePx(
        testCase.expectedPrintMinPictogramSidePx,
      ),
      qrMinSidePx: resolveQrMinSidePx(testCase.expectedPrintMinQrSidePx),
      expectedRequiredIdentityText: testCase.expectedRequiredIdentityText || "",
      expectedRequiredIdentityTexts: testCase.expectedRequiredIdentityTexts || [],
      expectedForbiddenIdentityTexts:
        testCase.expectedForbiddenIdentityTexts || [],
      tolerance: GEOMETRY_TOLERANCE_PX,
    },
  );

const assertPdf = (pdfPath) => {
  const bytes = fs.readFileSync(pdfPath);
  const header = bytes.subarray(0, 5).toString("utf8");
  return {
    path: pdfPath,
    bytes: bytes.length,
    hasPdfHeader: header === "%PDF-",
  };
};

const runCase = async ({ page, testCase }) => {
  const htmlPath = path.join(printHtmlDir, testCase.file);
  const pdfPath = path.join(pdfDir, `${testCase.id}.pdf`);
  const failures = [];
  const assert = (name, passed) => {
    if (!passed) failures.push(name);
  };

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  await page
    .waitForFunction(() =>
      Array.from(document.images).every(
        (img) => img.complete && img.naturalWidth > 0,
      ),
    )
    .catch(() => {});

  const dom = await inspectPrintDom(page, testCase);
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  const pdf = assertPdf(pdfPath);

  assert("pdf-header", pdf.hasPdfHeader);
  assert("pdf-size", pdf.bytes > 4000);
  assert("labels-rendered", dom.hasMinimumLabels);
  const expectedLabelKinds =
    testCase.expectedLabelKinds ||
    (testCase.expectedLabelKind ? [testCase.expectedLabelKind] : []);
  assert(
    "label-kind",
    expectedLabelKinds.length === 0 ||
      dom.labelKinds.every((labelKind) => expectedLabelKinds.includes(labelKind)),
  );
  assert("stock-preset", dom.stockPresetMatches);
  assert("batch-categories", dom.expectedBatchCategoriesPresent);
  assert("batch-category-on-every-label", dom.allLabelsHaveBatchCategory);
  assert("pictograms-present", dom.expectedPictogramsPresent);
  assert("pictograms-exact", dom.exactPictograms);
  assert("qr-state", dom.hasQr === dom.expectedHasQr);
  assert("required-identity-text", dom.requiredIdentityTextVisible);
  assert("required-identity-texts", dom.requiredIdentityTextsVisible);
  assert("forbidden-identity-texts", dom.forbiddenIdentityTextsAbsent);
  assert("images-loaded", dom.imageFailures.length === 0);
  assert("no-more-pics", dom.hasMorePics === false);
  assert("no-clipped-elements", dom.clippedElements.length === 0);
  assert("no-visual-overlaps", dom.visualIssues.length === 0);

  return {
    id: testCase.id,
    passed: failures.length === 0,
    failures,
    dom,
    pdf,
  };
};

const index = readIndex();
fs.mkdirSync(pdfDir, { recursive: true });
const executablePath = resolveChromeExecutable();
const browser = await chromium.launch({
  executablePath,
  headless,
  args: ["--disable-dev-shm-usage"],
});
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  for (const testCase of index) {
    // Keep progress visible because PDF generation can take a while.

    console.log(`Rendering print PDF QA: ${testCase.id}`);
    results.push(await runCase({ page, testCase }));
  }
  await page.close();
} finally {
  await browser.close();
}

const failed = results.filter((result) => !result.passed);
const report = {
  ok: failed.length === 0,
  generatedAt: new Date().toISOString(),
  printHtmlDir,
  pdfDir,
  executablePath,
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  failedCases: failed.map(({ id, failures, dom, pdf }) => ({
    id,
    failures,
    clippedElements: dom.clippedElements,
    visualIssues: dom.visualIssues,
    imageFailures: dom.imageFailures,
    pdf,
  })),
  results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      ok: report.ok,
      printHtmlDir,
      pdfDir,
      reportPath: outputPath,
      summary: report.summary,
      failedCases: report.failedCases,
    },
    null,
    2,
  ),
);

if (!report.ok) {
  process.exitCode = 1;
}
