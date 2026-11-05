/**
 * PDF export of print labels: runs the same preflight as printing, then asks
 * the backend to render the document and hands the file to the user.
 *
 * Kept out of printLabels.js so the print engine chunk stays within its
 * bundle budget; the app loads this only when someone exports a PDF.
 */
import { API } from "@/constants/ghs";
import i18n from "@/i18n";
import { recordObservabilityEvent } from "@/utils/observability";
import {
  collectPrintPreflightIssues,
  resolvePrintPreflightRetry,
} from "@/utils/printHandoffPreflight";
import {
  buildPrintDocument,
  createHiddenPrintFrame,
  getPrintBlockedInfo,
  notifyPrintBlocked,
  recordPreflightBlockedEvent,
  recordSemanticBlockedEvent,
  runSemanticPrintPreflight,
  waitForRequiredPrintImagesAsync,
} from "@/utils/printLabels";
import { buildPrintLifecycleMeta } from "@/utils/printLifecycle";

const PDF_EXPORT_SVG_SRC_RE = /(src=)(["'])(\/ghs\/GHS0[1-9]\.svg)\2/g;
const GHS_SVG_DATA_URL_CACHE = new Map();

const arrayBufferToBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  const bufferCtor = globalThis.Buffer;
  if (typeof bufferCtor?.from === "function") {
    return bufferCtor.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return globalThis.btoa(binary);
};

const getFetchImplementation = (fetchImpl) => {
  if (typeof fetchImpl === "function") return fetchImpl;
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw Object.assign(new Error("PDF export fetch is unavailable"), {
    code: "pdf_export_fetch_unavailable",
  });
};

const fetchGhsSvgDataUrl = async (src, fetchImpl) => {
  if (GHS_SVG_DATA_URL_CACHE.has(src)) {
    return GHS_SVG_DATA_URL_CACHE.get(src);
  }
  const response = await getFetchImplementation(fetchImpl)(src);
  if (!response?.ok) {
    throw Object.assign(new Error(`Could not load ${src}`), {
      code: "pdf_export_pictogram_fetch_failed",
    });
  }
  const arrayBuffer =
    typeof response.arrayBuffer === "function"
      ? await response.arrayBuffer()
      : new TextEncoder().encode(await response.text()).buffer;
  const dataUrl = `data:image/svg+xml;base64,${arrayBufferToBase64(arrayBuffer)}`;
  GHS_SVG_DATA_URL_CACHE.set(src, dataUrl);
  return dataUrl;
};

export const resetPrintPdfExportCacheForTests = () => {
  GHS_SVG_DATA_URL_CACHE.clear();
};

export async function inlineGhsPictogramSvgs(html, options = {}) {
  const matches = [...String(html || "").matchAll(PDF_EXPORT_SVG_SRC_RE)];
  const uniqueSources = [...new Set(matches.map((match) => match[3]))];
  if (uniqueSources.length === 0) return html;

  const replacements = new Map();
  await Promise.all(
    uniqueSources.map(async (src) => {
      replacements.set(src, await fetchGhsSvgDataUrl(src, options.fetchImpl));
    }),
  );

  return html.replace(PDF_EXPORT_SVG_SRC_RE, (match, prefix, quote, src) => {
    return `${prefix}${quote}${replacements.get(src)}${quote}`;
  });
}

const mapPdfLabelPurpose = (layout = {}) => {
  if (layout.labelPurpose === "qrSupplement" || layout.template === "qrcode") {
    return "qr";
  }
  if (layout.labelPurpose === "quickId" || layout.template === "icon") {
    return "identification";
  }
  return "complete";
};

const buildPrintPdfPayload = async (documentBundle, options = {}) => {
  const page = documentBundle?.model?.layout?.page || {};
  const layout = documentBundle?.model?.layout || {};
  return {
    html: await inlineGhsPictogramSvgs(documentBundle.html, options),
    page: {
      width_mm: Number(page.widthMm) || 210,
      height_mm: Number(page.heightMm) || 297,
      orientation: page.orientation === "landscape" ? "landscape" : "portrait",
      margin_mm: Number(page.marginMm) || 0,
    },
    meta: {
      label_purpose: mapPdfLabelPurpose(layout),
      page_count_expected: Math.max(1, Number(documentBundle.model?.totalPages) || 1),
    },
  };
};

const getPdfErrorCode = async (response) => {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail?.code === "string") return detail.code;
  } catch {
    // Fall through to the status-derived code below.
  }
  return `pdf_export_http_${response?.status || "error"}`;
};

const pdfExportErrorMessage = (code) => {
  const keyByCode = {
    pdf_renderer_unavailable: "print.pdfExportUnavailable",
    pdf_render_busy: "print.pdfExportBusy",
    pdf_render_timeout: "print.pdfExportTimeout",
  };
  return i18n.t(keyByCode[code] || "print.pdfExportFailed", {
    defaultValue:
      "Could not generate the PDF right now. Please try again in a moment.",
  });
};

const getPdfFilename = () =>
  `ghs-labels-${new Date().toISOString().slice(0, 10)}.pdf`;

const downloadPdfBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const handoffPdfBlob = async (blob, filename, options = {}) => {
  const navigatorObj = options.navigatorObj || globalThis.navigator;
  const fileCtor = globalThis.File;
  if (
    typeof fileCtor === "function" &&
    typeof navigatorObj?.share === "function"
  ) {
    const file = new fileCtor([blob], filename, { type: "application/pdf" });
    const sharePayload = {
      files: [file],
      title: "GHS Labels",
    };
    const canShare =
      typeof navigatorObj.canShare !== "function" ||
      navigatorObj.canShare(sharePayload);
    if (canShare) {
      try {
        await navigatorObj.share(sharePayload);
        return "share";
      } catch {
        // Fall back to a normal download if the share sheet is unavailable.
      }
    }
  }
  downloadPdfBlob(blob, filename);
  return "download";
};

export async function exportLabelsPdf(
  selectedForLabel,
  labelConfig,
  customGHSSettings,
  customLabelFields = {},
  labelQuantities = {},
  labProfile = {},
  lifecycleCallbacks = {},
  options = {},
) {
  const semanticPreflight = runSemanticPrintPreflight(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
    options,
  );
  if (!semanticPreflight.documentBundle) {
    return { ok: false, status: "empty" };
  }
  if (!semanticPreflight.canPrint) {
    recordSemanticBlockedEvent(
      "pdf_export_blocked",
      semanticPreflight.blockedInfo,
    );
    notifyPrintBlocked(lifecycleCallbacks, semanticPreflight.blockedInfo);
    return {
      ok: false,
      status: "blocked",
      blockedInfo: semanticPreflight.blockedInfo,
    };
  }

  const documentBundle = buildPrintDocument(
    selectedForLabel,
    labelConfig,
    customGHSSettings,
    customLabelFields,
    labelQuantities,
    labProfile,
    options,
  );

  if (!documentBundle) return { ok: false, status: "empty" };

  const { iframe, iframeDoc, images } = createHiddenPrintFrame(documentBundle);
  const imageLoadIssues = await waitForRequiredPrintImagesAsync(images);
  const preflightIssues = collectPrintPreflightIssues(
    documentBundle,
    iframeDoc,
    imageLoadIssues,
  );

  if (preflightIssues.length > 0) {
    const retryPlan = resolvePrintPreflightRetry({
      documentBundle,
      preflightIssues,
      selectedForLabel,
      labelConfig,
    });
    iframe.remove();
    if (retryPlan) {
      return exportLabelsPdf(
        retryPlan.selectedForLabel,
        retryPlan.labelConfig,
        customGHSSettings,
        customLabelFields,
        labelQuantities,
        labProfile,
        lifecycleCallbacks,
        options,
      );
    }
    recordPreflightBlockedEvent(
      "pdf_export_blocked",
      documentBundle,
      preflightIssues,
    );
    const blockedInfo = getPrintBlockedInfo(documentBundle, preflightIssues);
    notifyPrintBlocked(lifecycleCallbacks, blockedInfo);
    return {
      ok: false,
      status: "blocked",
      blockedInfo,
    };
  }

  iframe.remove();
  const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
  try {
    const payload = await buildPrintPdfPayload(documentBundle, options);
    recordObservabilityEvent("pdf_export_start", {
      status: "started",
      count: lifecycleMeta.totalLabels || 1,
      meta: lifecycleMeta,
    });
    const response = await getFetchImplementation(options.fetchImpl)(
      `${API}/print/pdf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response?.ok) {
      const code = await getPdfErrorCode(response);
      throw Object.assign(new Error(pdfExportErrorMessage(code)), { code });
    }
    const blob = await response.blob();
    const filename = getPdfFilename();
    const handoffMethod = await handoffPdfBlob(blob, filename, options);
    recordObservabilityEvent("pdf_export_complete", {
      status: handoffMethod,
      count: lifecycleMeta.totalLabels || 1,
      meta: {
        ...lifecycleMeta,
        completionReason: handoffMethod,
      },
    });
    lifecycleCallbacks?.onPdfExportComplete?.({
      ...lifecycleMeta,
      handoffMethod,
      filename,
    });
    return {
      ok: true,
      status: handoffMethod,
      filename,
    };
  } catch (error) {
    const code = error?.code || "pdf_export_failed";
    recordObservabilityEvent("pdf_export_blocked", {
      status: "error",
      count: lifecycleMeta.totalLabels || 1,
      meta: {
        ...lifecycleMeta,
        errorCode: code,
      },
    });
    const blockedInfo = {
      imageFailure: false,
      issueCasNumbers: [],
      issueCount: 1,
      issueTypes: [code],
      lifecycleMeta,
      message: error?.message || pdfExportErrorMessage(code),
    };
    notifyPrintBlocked(lifecycleCallbacks, blockedInfo);
    lifecycleCallbacks?.onPdfExportError?.(blockedInfo);
    return {
      ok: false,
      status: "error",
      code,
      blockedInfo,
    };
  }
}
