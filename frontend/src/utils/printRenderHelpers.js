import i18n from "@/i18n";
import {
  resolveEffectiveLabelContentLocale,
  resolveEffectiveLabelNameDisplay,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveTrustedChineseName,
  shouldRenderBilingualLabelText,
} from "@/utils/ghsText";

const ALLOWED_TEMPLATES = new Set(["icon", "standard", "full", "qrcode"]);

export const resolvePrintableChineseName = resolveTrustedChineseName;

export const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const getCompactPictogramCapacity = (
  layout = {},
  template,
  pageIndex = 0,
) => {
  const stock = layout.stockPreset || layout.stockId;
  const isQr = template === "qrcode";
  const continuationWithoutQr = isQr && pageIndex > 0;

  if (stock === "small-strip") return continuationWithoutQr ? 6 : isQr ? 6 : 5;
  if (stock === "brother-62mm-continuous") {
    return continuationWithoutQr ? 6 : isQr ? 6 : 5;
  }
  if (stock === "small-rack") return continuationWithoutQr ? 6 : isQr ? 6 : 6;
  if (stock === "medium-rack") return continuationWithoutQr ? 8 : isQr ? 6 : 8;

  return continuationWithoutQr ? 6 : isQr ? 6 : 6;
};

export const splitCompactPictograms = (pictograms = [], layout = {}, template) => {
  const pages = [];
  let index = 0;

  while (index < pictograms.length) {
    const capacity = getCompactPictogramCapacity(layout, template, pages.length);
    pages.push(pictograms.slice(index, index + capacity));
    index += capacity;
  }

  return pages;
};

export const clampIndex = (value, maxIndex) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || maxIndex <= 0) return 0;
  return Math.max(0, Math.min(Math.trunc(numeric), maxIndex));
};

export const normalizeTemplate = (template) =>
  ALLOWED_TEMPLATES.has(template) ? template : "standard";

export const resolveModelNameDisplay = (model) =>
  resolveEffectiveLabelNameDisplay(model.layout, i18n.language);

export const resolveModelContentLocale = (model) =>
  resolveEffectiveLabelContentLocale(model.layout, i18n.language);

const approxNameWidthScore = (value) =>
  String(value || "")
    .trim()
    .split("")
    .reduce((score, char) => {
      if (!char.trim()) return score + 0.45;
      return score + (char.charCodeAt(0) > 255 ? 1.85 : 1);
    }, 0);

export const canRenderCompactBilingualName = (chemical, layout = {}) => {
  if (layout?.nameDisplay !== "both") return false;
  const englishName = chemical?.name_en || chemical?.name || "";
  const chineseName = resolvePrintableChineseName(chemical);
  if (!englishName || !chineseName || englishName === chineseName) return false;

  const area = Math.max(
    0,
    Number(layout.widthMm || 0) * Number(layout.heightMm || 0),
  );
  const score =
    approxNameWidthScore(englishName) + approxNameWidthScore(chineseName);

  if (layout.formFactor === "strip" || layout.size === "small") {
    return score <= 24;
  }
  if (layout.formFactor === "compact" || layout.outputRole === "supplemental") {
    return score <= (area >= 4500 ? 34 : 28);
  }
  return false;
};

export const resolveNameDisplayForChemical = (chemical, model) => {
  if (["full", "icon", "qrcode"].includes(model?.layout?.template)) {
    return "both";
  }

  const effectiveDisplay = resolveModelNameDisplay(model);
  if (
    effectiveDisplay !== "both" &&
    model?.layout?.nameDisplay === "both" &&
    canRenderCompactBilingualName(chemical, model.layout)
  ) {
    return "both";
  }
  return effectiveDisplay;
};

export const joinLocalizedParts = (...parts) => {
  const uniqueParts = parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, index, allParts) => allParts.indexOf(part) === index);
  return uniqueParts.join(" / ");
};

export const getIdentityDensityClass = (chemical, model) => {
  const nameDisplay = resolveNameDisplayForChemical(chemical, model);
  const names = [];
  if (nameDisplay === "en" || nameDisplay === "both") {
    names.push(chemical?.name_en || "");
  }
  if (nameDisplay === "zh") {
    names.push(resolvePrintableChineseName(chemical) || chemical?.name_en || "");
  } else if (nameDisplay === "both") {
    names.push(resolvePrintableChineseName(chemical));
  }

  const longestName = Math.max(
    0,
    ...names.map((name) => String(name || "").trim().length),
  );
  const casLoad = Math.max(0, String(chemical?.cas_number || "").length - 10);
  const bilingualLoad = nameDisplay === "both" ? 8 : 0;
  const densityScore = longestName + casLoad * 1.5 + bilingualLoad;

  if (densityScore >= 48) return " identity-density-high";
  if (densityScore >= 32) return " identity-density-medium";
  return "";
};

export const getLocalizedTextForModel = (statement, model) => {
  if (shouldRenderBilingualLabelText(model.layout, i18n.language)) {
    return joinLocalizedParts(
      getLocalizedStatementText(statement, "zh"),
      getLocalizedStatementText(statement, "en"),
    );
  }
  return getLocalizedStatementText(statement, resolveModelContentLocale(model));
};

export const getSignalWordForModel = (classification, model) => {
  if (shouldRenderBilingualLabelText(model.layout, i18n.language)) {
    return joinLocalizedParts(
      getLocalizedSignalWord(classification, "zh"),
      getLocalizedSignalWord(classification, "en"),
    );
  }
  return getLocalizedSignalWord(classification, resolveModelContentLocale(model));
};

export const truncateText = (value, maxLength) => {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};
