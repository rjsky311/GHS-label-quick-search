export function listGhsClassifications(chemical = {}) {
  return [
    {
      pictograms: chemical.ghs_pictograms || [],
      hazard_statements: chemical.hazard_statements || [],
      precautionary_statements: chemical.precautionary_statements || [],
      signal_word: chemical.signal_word,
      signal_word_zh: chemical.signal_word_zh,
      source: chemical.primary_source,
      report_count: chemical.primary_report_count,
    },
    ...(Array.isArray(chemical.other_classifications)
      ? chemical.other_classifications
      : []),
  ];
}

export function resolveSelectedGhsClassification(
  chemical,
  customGHSSettings = {},
) {
  if (!chemical) return null;

  const classifications = listGhsClassifications(chemical);
  const setting = customGHSSettings?.[chemical.cas_number];
  const requestedIndex = Number(setting?.selectedIndex);
  const hasRequestedIndex =
    setting?.selectedIndex != null &&
    Number.isInteger(requestedIndex) &&
    requestedIndex >= 0 &&
    requestedIndex < classifications.length;
  const selectedIndex = hasRequestedIndex ? requestedIndex : 0;
  const selected = classifications[selectedIndex] || classifications[0] || {};

  return {
    pictograms: selected.pictograms || [],
    hazard_statements: selected.hazard_statements || [],
    precautionary_statements: selected.precautionary_statements || [],
    signal_word: selected.signal_word,
    signal_word_zh: selected.signal_word_zh,
    source: selected.source,
    report_count: selected.report_count,
    isCustom: Boolean(hasRequestedIndex),
    customIndex: selectedIndex,
    note: hasRequestedIndex ? setting.note : undefined,
  };
}

export function applySelectedGhsClassification(
  chemical,
  customGHSSettings = {},
) {
  const selected = resolveSelectedGhsClassification(chemical, customGHSSettings);
  if (!selected?.isCustom) return chemical;

  return {
    ...chemical,
    ghs_pictograms: selected.pictograms,
    hazard_statements: selected.hazard_statements,
    precautionary_statements: selected.precautionary_statements,
    signal_word: selected.signal_word,
    signal_word_zh: selected.signal_word_zh,
    primary_source: selected.source || chemical.primary_source,
    primary_report_count: selected.report_count || chemical.primary_report_count,
    selected_classification_index: selected.customIndex,
    customNote: selected.note,
  };
}
