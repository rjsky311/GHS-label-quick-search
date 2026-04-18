export function resolveDisplayLocale(languageLike = "zh") {
  return String(languageLike).toLowerCase().startsWith("en") ? "en" : "zh";
}

export function resolveLabelContentLocale(nameDisplay, fallbackLanguage = "zh") {
  if (nameDisplay === "en") return "en";
  if (nameDisplay === "zh" || nameDisplay === "both") return "zh";
  return resolveDisplayLocale(fallbackLanguage);
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
