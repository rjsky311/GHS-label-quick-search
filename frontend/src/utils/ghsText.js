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

export function getLocalizedNames(chemical, languageLike = "zh") {
  const locale = resolveDisplayLocale(languageLike);
  const englishName = chemical?.name_en || chemical?.name || "";
  const chineseName = chemical?.name_zh || chemical?.name_zh_tw || "";
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
    secondary: englishName && englishName !== chineseName ? englishName : "",
  };
}
