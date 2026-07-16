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

const normalizeFingerprintText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeFingerprintCodes = (items = []) =>
  [
    ...new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item?.code || item || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ].sort();

export function getGhsClassificationFingerprint(classification = {}) {
  return `ghs-classification.v1:${JSON.stringify({
    source: normalizeFingerprintText(classification.source),
    pictograms: normalizeFingerprintCodes(classification.pictograms),
    signalWord: normalizeFingerprintText(classification.signal_word),
    hazardCodes: normalizeFingerprintCodes(classification.hazard_statements),
    precautionCodes: normalizeFingerprintCodes(
      classification.precautionary_statements,
    ),
  })}`;
}

export function resolveSelectedGhsClassification(
  chemical,
  customGHSSettings = {},
) {
  if (!chemical) return null;

  const classifications = listGhsClassifications(chemical);
  const setting = customGHSSettings?.[chemical.cas_number];
  const requestedFingerprint =
    typeof setting?.classificationFingerprint === "string"
      ? setting.classificationFingerprint.trim()
      : "";
  const fingerprintIndex = requestedFingerprint
    ? classifications.findIndex(
        (classification) =>
          getGhsClassificationFingerprint(classification) ===
          requestedFingerprint,
      )
    : -1;
  const requestedIndex = Number(setting?.selectedIndex);
  const hasRequestedIndex =
    !requestedFingerprint &&
    setting?.selectedIndex != null &&
    Number.isInteger(requestedIndex) &&
    requestedIndex >= 0 &&
    requestedIndex < classifications.length;
  const hasFingerprintMatch = fingerprintIndex >= 0;
  const selectedIndex = hasFingerprintMatch
    ? fingerprintIndex
    : hasRequestedIndex
      ? requestedIndex
      : 0;
  const selected = classifications[selectedIndex] || classifications[0] || {};

  return {
    pictograms: selected.pictograms || [],
    hazard_statements: selected.hazard_statements || [],
    precautionary_statements: selected.precautionary_statements || [],
    signal_word: selected.signal_word,
    signal_word_zh: selected.signal_word_zh,
    source: selected.source,
    report_count: selected.report_count,
    isCustom: Boolean(hasFingerprintMatch || hasRequestedIndex),
    customIndex: selectedIndex,
    classificationFingerprint: getGhsClassificationFingerprint(selected),
    note:
      hasFingerprintMatch || hasRequestedIndex ? setting.note : undefined,
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
    selected_classification_fingerprint: selected.classificationFingerprint,
    customNote: selected.note,
  };
}
