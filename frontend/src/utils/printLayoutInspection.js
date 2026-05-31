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
        if (elementOverflows(element, 2)) {
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
