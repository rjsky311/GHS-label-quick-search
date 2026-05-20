export function resolveDisplayLocale(languageLike = "zh") {
  return String(languageLike).toLowerCase().startsWith("en") ? "en" : "zh";
}

export function resolveLabelContentLocale(nameDisplay, fallbackLanguage = "zh") {
  if (nameDisplay === "en") return "en";
  if (nameDisplay === "zh" || nameDisplay === "both") return "zh";
  return resolveDisplayLocale(fallbackLanguage);
}

export function resolveEffectiveLabelNameDisplay(
  layoutOrNameDisplay,
  fallbackLanguage = "zh",
) {
  const layout =
    layoutOrNameDisplay && typeof layoutOrNameDisplay === "object"
      ? layoutOrNameDisplay
      : null;
  const requested = layout ? layout.nameDisplay : layoutOrNameDisplay;

  if (requested === "en" || requested === "zh") return requested;
  if (requested !== "both") return resolveDisplayLocale(fallbackLanguage);
  if (!layout) return "both";

  const widthMm = Number(layout.widthMm || layout.labelWidthMm || 0);
  const heightMm = Number(layout.heightMm || layout.labelHeightMm || 0);
  const area = widthMm * heightMm;
  const isCompletePrimary =
    layout.labelPurpose === "shipping" && layout.template === "full";
  const isFullPagePrimary =
    layout.stockId === "a4-primary" ||
    layout.stockPreset === "a4-primary" ||
    layout.stockId === "letter-primary" ||
    layout.stockPreset === "letter-primary" ||
    (widthMm >= 170 && heightMm >= 200);

  if (
    isCompletePrimary &&
    (isFullPagePrimary || layout.size === "large" || area >= 9000)
  ) {
    return "both";
  }

  if (layout.template === "icon" || layout.template === "qrcode") {
    return "both";
  }

  const isCompactPhysicalLabel =
    layout.labelPurpose !== "shipping" ||
    layout.template === "icon" ||
    layout.template === "qrcode" ||
    layout.outputRole === "supplemental" ||
    layout.formFactor === "strip" ||
    layout.formFactor === "compact" ||
    layout.size === "small" ||
    area < 5200;

  return isCompactPhysicalLabel
    ? resolveDisplayLocale(fallbackLanguage)
    : "both";
}

export function resolveEffectiveLabelContentLocale(
  layoutOrNameDisplay,
  fallbackLanguage = "zh",
) {
  return resolveLabelContentLocale(
    resolveEffectiveLabelNameDisplay(layoutOrNameDisplay, fallbackLanguage),
    fallbackLanguage,
  );
}

export function shouldRenderBilingualLabelText(
  layoutOrNameDisplay,
  fallbackLanguage = "zh",
) {
  const layout =
    layoutOrNameDisplay && typeof layoutOrNameDisplay === "object"
      ? layoutOrNameDisplay
      : null;
  const effectiveNameDisplay = resolveEffectiveLabelNameDisplay(
    layoutOrNameDisplay,
    fallbackLanguage,
  );

  if (effectiveNameDisplay !== "both") return false;
  if (!layout) return true;

  return layout.labelPurpose === "shipping" && layout.template === "full";
}

export function getLocalizedStatementText(statement, languageLike = "zh") {
  const locale = resolveDisplayLocale(languageLike);
  if (locale === "en") {
    return statement?.text_en || statement?.text || statement?.text_zh || "";
  }
  return statement?.text_zh || statement?.text || statement?.text_en || "";
}

export function getLocalizedSignalWord(classification, languageLike = "zh") {
  const locale = resolveDisplayLocale(languageLike);
  if (locale === "en") {
    return classification?.signal_word || classification?.signal_word_zh || "";
  }
  return classification?.signal_word_zh || classification?.signal_word || "";
}

export function getLocalizedPictogramName(pictogram, languageLike = "zh") {
  const locale = resolveDisplayLocale(languageLike);
  if (locale === "en") {
    return pictogram?.name || pictogram?.name_zh || "";
  }
  return pictogram?.name_zh || pictogram?.name || "";
}

export const hasCjkText = (value) => /[\u3400-\u9fff]/.test(String(value || ""));

export const normalizeIdentityText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export function resolveEnglishName(chemical = {}) {
  const directEnglish = String(chemical?.name_en || "").trim();
  if (directEnglish) return directEnglish;

  const genericName = String(chemical?.name || "").trim();
  return genericName && !hasCjkText(genericName) ? genericName : "";
}

export function resolveTrustedChineseName(chemical = {}) {
  const candidates = [
    chemical?.name_zh,
    chemical?.name_zh_tw,
    chemical?.name,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (candidates.length === 0) return "";

  const englishCandidates = [chemical?.name_en, chemical?.name]
    .map(normalizeIdentityText)
    .filter((value) => value && !hasCjkText(value))
    .filter(Boolean);

  return (
    candidates.find((candidate) => {
      if (!hasCjkText(candidate)) return false;
      return !englishCandidates.includes(normalizeIdentityText(candidate));
    }) || ""
  );
}

export function getLocalizedNames(chemical, languageLike = "zh") {
  const locale = resolveDisplayLocale(languageLike);
  const englishName = resolveEnglishName(chemical);
  const chineseName = resolveTrustedChineseName(chemical);
  const fallbackName = chemical?.cas_number || "";

  if (locale === "en") {
    return {
      primary: englishName || chineseName || fallbackName,
      secondary:
        chineseName && chineseName !== englishName ? chineseName : "",
    };
  }

  return {
    primary: chineseName || englishName || fallbackName,
    secondary:
      chineseName && englishName && englishName !== chineseName
        ? englishName
        : "",
  };
}
