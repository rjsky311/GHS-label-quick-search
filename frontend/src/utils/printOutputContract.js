export const PRINT_OUTPUT_IDS = Object.freeze({
  COMPLETE: "complete",
  QR_SUPPLEMENT: "qrSupplement",
  QUICK_ID: "quickId",
});

export const SMALL_LABEL_CONTINUATION_POLICY = Object.freeze({
  [PRINT_OUTPUT_IDS.QR_SUPPLEMENT]: Object.freeze({
    outputId: PRINT_OUTPUT_IDS.QR_SUPPLEMENT,
    targetLabels: 1,
    maxLabels: 2,
    comfortablePictogramTarget: 6,
    firstLabelPictogramTarget: 9,
    continuationPictogramTarget: 9,
  }),
  [PRINT_OUTPUT_IDS.QUICK_ID]: Object.freeze({
    outputId: PRINT_OUTPUT_IDS.QUICK_ID,
    targetLabels: 1,
    maxLabels: 2,
    comfortablePictogramTarget: 6,
    firstLabelPictogramTarget: 9,
    continuationPictogramTarget: 9,
  }),
});

export const getPrintOutputIdForLayout = (layout = {}, template) => {
  const resolvedTemplate = template || layout.template;
  if (
    layout.labelPurpose === PRINT_OUTPUT_IDS.QR_SUPPLEMENT ||
    resolvedTemplate === "qrcode"
  ) {
    return PRINT_OUTPUT_IDS.QR_SUPPLEMENT;
  }
  if (
    layout.labelPurpose === PRINT_OUTPUT_IDS.QUICK_ID ||
    resolvedTemplate === "icon"
  ) {
    return PRINT_OUTPUT_IDS.QUICK_ID;
  }
  return PRINT_OUTPUT_IDS.COMPLETE;
};

export const getSmallLabelContinuationPolicy = (outputId) =>
  SMALL_LABEL_CONTINUATION_POLICY[outputId] || null;

export const getCompactPictogramCapacity = (
  layout = {},
  template,
  pageIndex = 0,
) => {
  const outputId = getPrintOutputIdForLayout(layout, template);
  const policy = getSmallLabelContinuationPolicy(outputId);
  if (!policy) return 6;
  return pageIndex === 0
    ? policy.firstLabelPictogramTarget
    : policy.continuationPictogramTarget;
};

export const getQrSmallLabelPictogramGrid = (pictogramCount = 0) => {
  const count = Math.max(0, Number(pictogramCount) || 0);
  if (count <= 0) return { columns: 0, rows: 0, pressure: false };
  if (count <= 3) return { columns: count, rows: 1, pressure: false };
  if (count === 4) return { columns: 2, rows: 2, pressure: false };
  if (count <= 6) return { columns: 3, rows: 2, pressure: false };
  if (count <= 8) return { columns: 4, rows: 2, pressure: false };
  return { columns: 3, rows: 3, pressure: true };
};

export const requiresSmallLabelRecovery = (outputId, pageCount) => {
  const policy = getSmallLabelContinuationPolicy(outputId);
  return Boolean(policy && Number(pageCount || 0) > policy.maxLabels);
};

const getPictogramCode = (pictogram) => String(pictogram?.code || "").trim();

export const validateSmallLabelContinuationSet = ({
  outputId,
  sourcePictograms = [],
  pages = [],
} = {}) => {
  const requiredCodes = sourcePictograms.map(getPictogramCode).filter(Boolean);
  const renderedCodes = pages.flat().map(getPictogramCode).filter(Boolean);
  const missingCodes = requiredCodes.filter(
    (code) => !renderedCodes.includes(code),
  );
  const pageCount = pages.length;
  const overLimit = requiresSmallLabelRecovery(outputId, pageCount);

  return {
    ok: missingCodes.length === 0 && !overLimit,
    pageCount,
    missingCodes,
    overLimit,
  };
};
