import { isFullPagePrimaryStockId } from "@/constants/labelStocks";
import {
  resolveEffectiveLabelNameDisplay,
  shouldRenderBilingualLabelText,
} from "@/utils/ghsText";

export const PRINT_CONTENT_ROLE = Object.freeze({
  COMPLETE_PRIMARY: "complete_primary",
  CONTAINER_FRONT: "container_front",
  QUICK_ID: "quick_id",
  QR_SUPPLEMENT: "qr_supplement",
  SUPPLEMENTAL_SUMMARY: "supplemental_summary",
});

export const PRINT_POLICY_OUTPUT_KIND = Object.freeze({
  COMPLETE_PRIMARY: "complete_primary",
  SUPPLEMENTAL: "supplemental",
  QUICK_ID: "quick_id",
  QR_SUPPLEMENT: "qr_supplement",
});

export const PRINT_HAZARD_TEXT_MODE = Object.freeze({
  FULL_HP: "full_hp",
  FULL_HP_CONTINUATION: "full_hp_continuation",
  PRIORITY_H_SUMMARY: "priority_h_summary",
  SHORT_H_SUMMARY: "short_h_summary",
  H_CODES_ONLY: "h_codes_only",
  QR_REFERENCE: "qr_reference",
  OMITTED: "omitted",
});

export const PRINT_PRECAUTION_TEXT_MODE = Object.freeze({
  FULL_TEXT: "full_text",
  CODES_ONLY: "codes_only",
  OMITTED: "omitted",
});

export const PRINT_DETAIL_SOURCE = Object.freeze({
  PRINTED_LABEL: "printed_label",
  CONTINUATION_SET: "continuation_set",
  PRIMARY_OR_SDS: "primary_or_sds",
  QR_OR_SDS: "qr_or_sds",
  SDS_OR_BACK_LABEL: "sds_or_back_label",
});

export const PRINT_LANGUAGE_POLICY = Object.freeze({
  CONFIGURED: "configured",
  COMPACT_MAY_FALLBACK: "compact_may_fallback",
});

const areaMm = (layout = {}) =>
  Math.max(0, Number(layout.widthMm || 0) * Number(layout.heightMm || 0));

const shortSideMm = (layout = {}) =>
  Math.min(Number(layout.widthMm || 0), Number(layout.heightMm || 0));

export const isFullPagePrimaryLayout = (layout = {}) =>
  layout.labelPurpose === "shipping" &&
  layout.template === "full" &&
  (isFullPagePrimaryStockId(layout.stockId) ||
    isFullPagePrimaryStockId(layout.stockPreset) ||
    (layout.widthMm >= 170 && layout.heightMm >= 200));

export const isCompletePrimaryLayout = (layout = {}) =>
  layout.labelPurpose === "shipping" && layout.template === "full";

export const isQrSupplementLayout = (layout = {}) =>
  layout.labelPurpose === "qrSupplement" || layout.template === "qrcode";

export const isQuickIdLayout = (layout = {}) =>
  layout.labelPurpose === "quickId" || layout.template === "icon";

export const resolvePrintOutputKindFromLayout = (layout = {}) => {
  if (isQrSupplementLayout(layout)) return PRINT_POLICY_OUTPUT_KIND.QR_SUPPLEMENT;
  if (isQuickIdLayout(layout)) return PRINT_POLICY_OUTPUT_KIND.QUICK_ID;
  if (!isCompletePrimaryLayout(layout)) return PRINT_POLICY_OUTPUT_KIND.SUPPLEMENTAL;
  return PRINT_POLICY_OUTPUT_KIND.COMPLETE_PRIMARY;
};

export const shouldUseHazardCodesOnly = (layout = {}) => {
  if (isQuickIdLayout(layout) || isQrSupplementLayout(layout)) return false;
  if (layout.labelPurpose !== "shipping" || layout.template !== "standard") {
    return false;
  }

  if (layout.stockId === "large-primary" || layout.stockPreset === "large-primary") {
    return true;
  }

  const area = areaMm(layout);
  const shortSide = shortSideMm(layout);
  if (
    layout.formFactor === "bottle" ||
    (layout.nameDisplay === "both" &&
      layout.outputRole === "primary-candidate" &&
      area < 9500)
  ) {
    return true;
  }
  if (layout.formFactor === "roomy" || area >= 9000 || shortSide >= 80) {
    return false;
  }
  return true;
};

const resolveRole = (layout = {}) => {
  if (isCompletePrimaryLayout(layout)) return PRINT_CONTENT_ROLE.COMPLETE_PRIMARY;
  if (isQrSupplementLayout(layout)) return PRINT_CONTENT_ROLE.QR_SUPPLEMENT;
  if (isQuickIdLayout(layout)) return PRINT_CONTENT_ROLE.QUICK_ID;
  if (layout.labelPurpose === "shipping") return PRINT_CONTENT_ROLE.CONTAINER_FRONT;
  return PRINT_CONTENT_ROLE.SUPPLEMENTAL_SUMMARY;
};

const resolveHazardTextMode = (layout = {}, { continuation = false } = {}) => {
  if (isCompletePrimaryLayout(layout)) {
    return continuation
      ? PRINT_HAZARD_TEXT_MODE.FULL_HP_CONTINUATION
      : PRINT_HAZARD_TEXT_MODE.FULL_HP;
  }
  if (isQrSupplementLayout(layout)) return PRINT_HAZARD_TEXT_MODE.QR_REFERENCE;
  if (isQuickIdLayout(layout)) return PRINT_HAZARD_TEXT_MODE.OMITTED;
  if (shouldUseHazardCodesOnly(layout)) {
    return PRINT_HAZARD_TEXT_MODE.H_CODES_ONLY;
  }
  if (layout.labelPurpose === "shipping") {
    return PRINT_HAZARD_TEXT_MODE.PRIORITY_H_SUMMARY;
  }
  return PRINT_HAZARD_TEXT_MODE.SHORT_H_SUMMARY;
};

const resolvePrecautionTextMode = (layout = {}) => {
  if (isCompletePrimaryLayout(layout)) return PRINT_PRECAUTION_TEXT_MODE.FULL_TEXT;
  return PRINT_PRECAUTION_TEXT_MODE.OMITTED;
};

const resolveDetailSource = (layout = {}, { continuation = false } = {}) => {
  if (isCompletePrimaryLayout(layout)) {
    return continuation
      ? PRINT_DETAIL_SOURCE.CONTINUATION_SET
      : PRINT_DETAIL_SOURCE.PRINTED_LABEL;
  }
  if (isQrSupplementLayout(layout)) return PRINT_DETAIL_SOURCE.QR_OR_SDS;
  if (isQuickIdLayout(layout)) return PRINT_DETAIL_SOURCE.PRIMARY_OR_SDS;
  return PRINT_DETAIL_SOURCE.SDS_OR_BACK_LABEL;
};

const resolveLanguagePolicy = (layout = {}, locale = "zh") => {
  const requestedNameDisplay = layout.nameDisplay || "";
  const effectiveNameDisplay = resolveEffectiveLabelNameDisplay(layout, locale);
  const rendersBilingualStatements = shouldRenderBilingualLabelText(
    layout,
    locale,
  );
  const mayFallback =
    requestedNameDisplay === "both" &&
    (effectiveNameDisplay !== "both" || !rendersBilingualStatements);

  return {
    mode: mayFallback
      ? PRINT_LANGUAGE_POLICY.COMPACT_MAY_FALLBACK
      : PRINT_LANGUAGE_POLICY.CONFIGURED,
    requestedNameDisplay,
    effectiveNameDisplay,
    rendersBilingualStatements,
  };
};

export function resolvePrintContentPolicy(
  layout = {},
  { locale = "zh", continuation = false } = {},
) {
  const outputKind = resolvePrintOutputKindFromLayout(layout);
  const role = resolveRole(layout);
  const isCompletePrimary = role === PRINT_CONTENT_ROLE.COMPLETE_PRIMARY;
  const isQrSupplement = role === PRINT_CONTENT_ROLE.QR_SUPPLEMENT;
  const isQuickId = role === PRINT_CONTENT_ROLE.QUICK_ID;

  return {
    role,
    outputKind,
    hazardTextMode: resolveHazardTextMode(layout, { continuation }),
    precautionTextMode: resolvePrecautionTextMode(layout),
    detailSource: resolveDetailSource(layout, { continuation }),
    language: resolveLanguagePolicy(layout, locale),
    isCompletePrimary,
    isSupplemental: !isCompletePrimary,
    isQrSupplement,
    isQuickId,
    pictogramsMustRender: true,
    qrCanReplaceRequiredElements: false,
    requiresResponsibleProfile: isCompletePrimary,
    permitsFullHazardText: isCompletePrimary,
    permitsFullPrecautionText: isCompletePrimary,
    permitsQrCode: isQrSupplement,
    suppressesPrecautionText: !isCompletePrimary,
  };
}
