const elementOverflows = (element, tolerancePx = 1) => {
  if (!element) return false;
  const scrollHeight = Math.ceil(element.scrollHeight || 0);
  const clientHeight = Math.ceil(element.clientHeight || 0);
  const scrollWidth = Math.ceil(element.scrollWidth || 0);
  const clientWidth = Math.ceil(element.clientWidth || 0);

  if (clientHeight > 0 && scrollHeight > clientHeight + tolerancePx) {
    return true;
  }

  return clientWidth > 0 && scrollWidth > clientWidth + tolerancePx;
};

const elementVerticallyOverflows = (element, tolerancePx = 1) => {
  if (!element) return false;
  const scrollHeight = Math.ceil(element.scrollHeight || 0);
  const clientHeight = Math.ceil(element.clientHeight || 0);

  return clientHeight > 0 && scrollHeight > clientHeight + tolerancePx;
};

const elementHorizontallyOverflows = (element, tolerancePx = 1) => {
  if (!element) return false;
  const scrollWidth = Math.ceil(element.scrollWidth || 0);
  const clientWidth = Math.ceil(element.clientWidth || 0);

  return clientWidth > 0 && scrollWidth > clientWidth + tolerancePx;
};

const getElementStyle = (element) => {
  const view = element?.ownerDocument?.defaultView;
  if (view?.getComputedStyle) return view.getComputedStyle(element);
  if (typeof window !== "undefined" && window.getComputedStyle) {
    return window.getComputedStyle(element);
  }
  return element?.style || {};
};

const isHiddenOverflow = (value = "") =>
  ["hidden", "clip"].includes(String(value || "").toLowerCase());

const hasLineClamp = (style) => {
  const rawClamp =
    style?.webkitLineClamp ||
    style?.WebkitLineClamp ||
    style?.lineClamp ||
    "";
  return rawClamp && rawClamp !== "none" && rawClamp !== "unset";
};

const parseCssPx = (value) => {
  const number = Number.parseFloat(String(value || ""));
  return Number.isFinite(number) ? number : 0;
};

const getLineClampOverflowTolerance = (style, fallbackTolerancePx = 1) => {
  const lineHeightPx = parseCssPx(style?.lineHeight);
  return Math.max(fallbackTolerancePx, 3, Math.ceil(lineHeightPx * 0.15));
};

const requiredTextIsVisuallyClipped = (element, tolerancePx = 1) => {
  if (!element?.textContent?.trim()) return false;
  const style = getElementStyle(element);
  const overflowX = style.overflowX || style.overflow || "";
  const overflowY = style.overflowY || style.overflow || "";
  const textOverflow = String(style.textOverflow || "").toLowerCase();
  const whiteSpace = String(style.whiteSpace || "").toLowerCase();

  if (
    textOverflow === "ellipsis" &&
    isHiddenOverflow(overflowX) &&
    elementOverflows(element, tolerancePx)
  ) {
    return true;
  }

  if (
    whiteSpace === "nowrap" &&
    isHiddenOverflow(overflowX) &&
    elementOverflows(element, tolerancePx)
  ) {
    return true;
  }

  if (
    hasLineClamp(style) &&
    isHiddenOverflow(overflowY) &&
    elementVerticallyOverflows(
      element,
      getLineClampOverflowTolerance(style, tolerancePx),
    )
  ) {
    return true;
  }

  return false;
};

const REQUIRED_TEXT_CLIP_SELECTORS = [
  [".name-en", "required-name-en-clipped"],
  [".name-zh", "required-name-zh-clipped"],
  [".small-name-en", "required-small-name-en-clipped"],
  [".small-name-zh", "required-small-name-zh-clipped"],
  [".small-cas", "required-small-cas-clipped"],
  [".cas", "required-cas-clipped"],
  [".meta-chip-cas .meta-chip-value", "required-cas-value-clipped"],
];

const WRAP_TOLERANT_TEXT_SELECTORS = new Set([".name-en", ".name-zh"]);

const isWidthOnlyPrintableTextOverflow = (
  element,
  selector,
  tolerancePx = 1,
) => {
  if (!WRAP_TOLERANT_TEXT_SELECTORS.has(selector)) return false;
  if (!elementHorizontallyOverflows(element, tolerancePx)) return false;
  if (elementVerticallyOverflows(element, tolerancePx)) return false;
  if (requiredTextIsVisuallyClipped(element, tolerancePx)) return false;

  const style = getElementStyle(element);
  const textOverflow = String(style.textOverflow || "").toLowerCase();
  const whiteSpace = String(style.whiteSpace || "").toLowerCase();

  return textOverflow !== "ellipsis" && whiteSpace !== "nowrap";
};

const elementHasBlockingOverflow = (element, selector, tolerancePx = 1) => {
  if (!elementOverflows(element, tolerancePx)) return false;
  return !isWidthOnlyPrintableTextOverflow(element, selector, tolerancePx);
};

export function inspectPrintLayoutDocument(documentLike) {
  const root = documentLike?.body || documentLike;
  if (!root?.querySelectorAll) return [];

  const issues = [];
  const labels = Array.from(
    root.querySelectorAll(".label:not(.label-placeholder)"),
  ).filter((element) => typeof element.querySelector === "function");

  labels.forEach((label, index) => {
    const issueMeta = {
      index,
    };
    if (elementVerticallyOverflows(label, 2)) {
      issues.push({ type: "label-overflow", ...issueMeta });
    }

    [
      [".compliance-core", "compliance-core-overflow"],
      [".compliance-alert-panel", "compliance-alert-overflow"],
      [".compliance-statements-panel", "compliance-statements-overflow"],
      [".compliance-hazard-panel", "compliance-hazards-overflow"],
      [".compliance-precaution-panel", "compliance-precautions-overflow"],
      [".pictograms.compliance-pictograms", "compliance-pictograms-overflow"],
      [".cas", "cas-overflow"],
      [".meta-chip-cas", "cas-chip-overflow"],
      [".meta-chip-cas .meta-chip-value", "cas-value-overflow"],
      [".meta-chip-batch", "case-chip-overflow"],
      [".meta-chip-batch .meta-chip-value", "case-value-overflow"],
      [".support-chip", "support-chip-overflow"],
      [".custom-fields", "custom-fields-overflow"],
      [".name-section", "name-section-overflow"],
      [".name-en", "name-en-overflow"],
      [".name-zh", "name-zh-overflow"],
      [".small-name-en", "small-name-en-overflow"],
      [".small-name-zh", "small-name-zh-overflow"],
      [".small-cas", "small-cas-overflow"],
      [".standard-rail", "standard-rail-overflow"],
      [".standard-main", "standard-main-overflow"],
      [".standard-hazard-board", "standard-hazard-board-overflow"],
      [".hazard-primary-list", "hazard-list-overflow"],
      [".hazard-summary-item", "hazard-summary-overflow"],
      [".hazard-code-list", "hazard-code-list-overflow"],
      [".signal", "signal-overflow"],
      [".qrcode-panel", "qr-panel-overflow"],
      [".qrcode-caption", "qr-caption-overflow"],
    ].forEach(([selector, type]) => {
      const elements =
        typeof label.querySelectorAll === "function"
          ? Array.from(label.querySelectorAll(selector))
          : [label.querySelector?.(selector)].filter(Boolean);
      elements.forEach((element, elementIndex) => {
        if (elementHasBlockingOverflow(element, selector, 2)) {
          issues.push({ type, ...issueMeta, selector, elementIndex });
        }
      });
    });

    REQUIRED_TEXT_CLIP_SELECTORS.forEach(([selector, type]) => {
      const elements =
        typeof label.querySelectorAll === "function"
          ? Array.from(label.querySelectorAll(selector))
          : [label.querySelector?.(selector)].filter(Boolean);
      elements.forEach((element, elementIndex) => {
        if (requiredTextIsVisuallyClipped(element, 1)) {
          issues.push({ type, ...issueMeta, selector, elementIndex });
        }
      });
    });

    const footer = label.querySelector(".compliance-footer");
    if (
      footer &&
      label.clientHeight > 0 &&
      footer.offsetTop + footer.offsetHeight > label.clientHeight + 2
    ) {
      issues.push({ type: "compliance-footer-clipped", ...issueMeta });
    }
  });

  Array.from(root.querySelectorAll(".statement-code"))
    .filter((element) => "scrollWidth" in element || "scrollHeight" in element)
    .forEach((code, index) => {
      if (elementOverflows(code, 1)) {
        issues.push({ type: "statement-code-overflow", index });
      }
    });

  return issues;
}
