import i18n from "@/i18n";

const PRINT_QA_HANDOFF_PARAM = "qaPrintHandoff";

export function buildPrintLifecycleMeta(documentBundle) {
  const model = documentBundle?.model;
  if (!model) return {};
  const layout = model.layout || {};
  const casNumbers = [
    ...new Set(
      (model.selectedForLabel || model.expandedLabels || [])
        .map((chemical) => chemical?.cas_number)
        .filter(Boolean),
    ),
  ];

  return {
    template: layout.template,
    labelPurpose: layout.labelPurpose,
    stockPreset: layout.stockId || layout.stockPresetName,
    stockPresetName: layout.stockPresetName || layout.stock?.name,
    orientation: layout.orientation,
    size: layout.size,
    pageSize: layout.pageSize || layout.page?.size,
    labelWidthMm: layout.widthMm || layout.labelWidthMm,
    labelHeightMm: layout.heightMm || layout.labelHeightMm,
    colorMode: layout.colorMode,
    nameDisplay: layout.nameDisplay,
    autoFitLevel: layout.autoFitLevel || 0,
    continuationTightnessLevel: layout.continuationTightnessLevel || 0,
    casNumbers,
    totalLabels: model.expandedLabels.length,
    totalPages: model.totalPages,
    totalChemicals: model.selectedForLabel.length,
  };
}

export function getPreflightIssueCasNumbers(
  documentBundle,
  preflightIssues = [],
) {
  const labels = documentBundle?.model?.expandedLabels || [];
  return [
    ...new Set(
      preflightIssues
        .map((issue) => {
          const label = labels[issue?.index];
          const sourceChemical = label?.sourceChemical || label;
          return sourceChemical?.cas_number || "";
        })
        .filter(Boolean),
    ),
  ];
}

export function isPrintHandoffQaMode() {
  if (typeof window === "undefined") return false;
  try {
    return (
      new URLSearchParams(window.location.search).get(PRINT_QA_HANDOFF_PARAM) ===
      "1"
    );
  } catch {
    return false;
  }
}

function resolvePrintQaLabelKind(layout, helpers = {}) {
  if (helpers.isCompletePrimaryTemplate?.(layout)) {
    return "complete-primary";
  }
  if (helpers.isQrSupplementLayout?.(layout)) {
    return "qr-supplement";
  }
  if (helpers.isQuickIdLayout?.(layout)) {
    return "quick-id";
  }
  return "supplemental";
}

function upsertPrintQaStatusElement() {
  if (typeof document === "undefined") return null;

  let statusElement = document.getElementById("ghs-print-qa-status");
  if (!statusElement) {
    statusElement = document.createElement("div");
    statusElement.id = "ghs-print-qa-status";
    if (typeof statusElement.setAttribute === "function") {
      statusElement.setAttribute("data-testid", "print-qa-status");
      statusElement.setAttribute("aria-live", "polite");
    }
    if (statusElement.style) {
      statusElement.style.cssText =
        "position:fixed;left:0;bottom:0;z-index:2147483647;width:1px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;";
    }
    document.body.appendChild(statusElement);
  }

  return statusElement;
}

function publishPrintQaStatus(status, message) {
  const nextStatus = {
    ...status,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.__GHS_PRINT_QA_LAST_HANDOFF__ = nextStatus;
  }

  const statusElement = upsertPrintQaStatusElement();
  if (!statusElement) return nextStatus;

  if (statusElement.dataset) {
    statusElement.dataset.status = nextStatus.status || "";
    statusElement.dataset.labelKind = nextStatus.labelKind || "";
    statusElement.dataset.pictograms = (nextStatus.pictogramCodes || []).join(",");
    statusElement.dataset.hasQr = String(Boolean(nextStatus.hasQr));
    statusElement.dataset.casNumbers = (nextStatus.casNumbers || []).join(",");
    statusElement.dataset.hasCas = String(Boolean(nextStatus.hasCas));
    statusElement.dataset.labelWidthMm =
      nextStatus.labelWidthMm == null ? "" : String(nextStatus.labelWidthMm);
    statusElement.dataset.labelHeightMm =
      nextStatus.labelHeightMm == null ? "" : String(nextStatus.labelHeightMm);
    statusElement.dataset.pageSize = nextStatus.pageSize || "";
    statusElement.dataset.colorMode = nextStatus.colorMode || "";
    statusElement.dataset.nameDisplay = nextStatus.nameDisplay || "";
    statusElement.dataset.autoFitLevel = String(nextStatus.autoFitLevel || 0);
    statusElement.dataset.totalLabels = String(nextStatus.totalLabels || 0);
    statusElement.dataset.totalPages = String(nextStatus.totalPages || 0);
    statusElement.dataset.template = nextStatus.template || "";
    statusElement.dataset.stockPreset = nextStatus.stockPreset || "";
    statusElement.dataset.issueTypes = (nextStatus.issueTypes || []).join(",");
    statusElement.dataset.supportChips = (
      nextStatus.supportChipTexts || []
    ).join("|");
    statusElement.dataset.updatedAt = nextStatus.updatedAt;
  }
  statusElement.textContent = message;

  return nextStatus;
}

export function publishPrintPendingQaStatus(documentBundle, labelKindHelpers) {
  const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
  return publishPrintQaStatus(
    {
      ...lifecycleMeta,
      status: "pending",
      labelKind: resolvePrintQaLabelKind(
        documentBundle?.model?.layout,
        labelKindHelpers,
      ),
      pictogramCodes: [],
      hasQr: false,
      hasCas: false,
    },
    "Print handoff pending",
  );
}

export function publishPrintBlockedQaStatus(
  documentBundle,
  preflightIssues,
  labelKindHelpers,
) {
  const lifecycleMeta = buildPrintLifecycleMeta(documentBundle);
  const issueTypes = [
    ...new Set(preflightIssues.map((issue) => issue.type).filter(Boolean)),
  ];
  return publishPrintQaStatus(
    {
      ...lifecycleMeta,
      status: "blocked",
      labelKind: resolvePrintQaLabelKind(
        documentBundle?.model?.layout,
        labelKindHelpers,
      ),
      pictogramCodes: [],
      hasQr: false,
      hasCas: false,
      issueTypes,
    },
    `Print handoff blocked: ${issueTypes.join(",")}`,
  );
}

function getPrintQaDocumentText(documentBundle, iframeDoc) {
  return [
    iframeDoc?.body?.innerText,
    iframeDoc?.body?.textContent,
    iframeDoc?.documentElement?.textContent,
    documentBundle?.pagesHtml,
    documentBundle?.html,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildLayoutBlockedAlert(lifecycleMeta, preflightIssues) {
  const stock =
    lifecycleMeta.stockPresetName || lifecycleMeta.stockPreset || "current stock";
  const size =
    lifecycleMeta.labelWidthMm && lifecycleMeta.labelHeightMm
      ? `${lifecycleMeta.labelWidthMm} x ${lifecycleMeta.labelHeightMm} mm`
      : "";
  const issueTypes = [
    ...new Set(preflightIssues.map((issue) => issue.type).filter(Boolean)),
  ].join(", ");

  return i18n.t("print.layoutBlockedDetailed", {
    stock,
    size,
    issueTypes,
    defaultValue:
      "This label content is overflowing or clipped on {{stock}} ({{size}}). Keep GHS pictograms and CAS visible; choose A4/Letter Primary or a larger truthful stock before printing. QR supplement is not a substitute for a complete primary label. Layout check: {{issueTypes}}",
  });
}

export function publishPrintHandoffQaStatus(
  documentBundle,
  iframeDoc,
  lifecycleMeta,
  labelKindHelpers,
) {
  const imageAlts = Array.from(iframeDoc.querySelectorAll("img"))
    .map((img) => img.getAttribute?.("alt") || img.alt || "")
    .filter(Boolean);
  const pictogramCodes = [
    ...new Set(imageAlts.filter((alt) => /^GHS\d{2}$/.test(alt))),
  ];
  const documentText = getPrintQaDocumentText(documentBundle, iframeDoc);
  const supportChipTexts = Array.from(
    iframeDoc.querySelectorAll(".support-chip"),
  )
    .map((chip) => (chip.textContent || "").trim())
    .filter(Boolean);
  const casNumbers = lifecycleMeta.casNumbers || [];
  const hasCas =
    casNumbers.length === 0 ||
    casNumbers.every((casNumber) => documentText.includes(casNumber));
  const status = {
    ...lifecycleMeta,
    status: "qa_handoff",
    labelKind: resolvePrintQaLabelKind(
      documentBundle?.model?.layout,
      labelKindHelpers,
    ),
    pictogramCodes,
    supportChipTexts,
    hasQr: imageAlts.some((alt) => /qr/i.test(alt)),
    hasCas,
  };

  return publishPrintQaStatus(
    status,
    `Print handoff ready: ${status.labelKind}; ${pictogramCodes.join(",")}`,
  );
}
