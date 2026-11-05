/**
 * Solvent hazards for prepared-solution labels.
 *
 * A prepared solution ("compound X, 10 mM in methanol") carries the hazards of
 * the solvent as well as the parent. This module decides whether the solvent
 * is water, looks the solvent up through the normal single-search path (done
 * by the caller), and merges the solvent's GHS data into the parent's.
 *
 * Rules (safety boundary):
 * - Union only. Pictograms, H statements, and P statements are combined by
 *   code; the stronger signal word wins (Danger over Warning). Nothing is
 *   reduced or removed for dilution or concentration; there is no mixture
 *   threshold calculation.
 * - Water needs no lookup and adds nothing.
 * - Any other solvent that cannot be confirmed (not found, upstream error,
 *   no GHS data, or GHS text without pictograms) is NOT treated as harmless:
 *   the label prints "Solvent hazards not included" instead.
 */
import { hasGhsData } from "@/utils/ghsAvailability";
import {
  getGhsClassificationFingerprint,
  listGhsClassifications,
} from "@/utils/selectedGhsClassification";

export const SOLVENT_HAZARD_STATUS = Object.freeze({
  WATER: "water",
  INCLUDED: "included",
  NOT_INCLUDED: "not_included",
});

const WATER_SOLVENT_NAMES = new Set([
  "water",
  "h2o",
  "h₂o",
  "水",
  "diwater",
  "deionizedwater",
  "deionisedwater",
  "distilledwater",
  "ultrapurewater",
  "milliqwater",
  "milliq",
  "mqwater",
  "ddh2o",
  "dh2o",
  "dih2o",
  "purewater",
  "rowater",
  "去離子水",
  "蒸餾水",
  "二次水",
  "純水",
  "超純水",
]);

const normalizeSolventName = (solvent) =>
  String(solvent || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.()（）]/g, "");

/** True only for plain water (and common lab spellings of it). */
export function isWaterSolvent(solvent) {
  const normalized = normalizeSolventName(solvent);
  if (!normalized) return false;
  if (WATER_SOLVENT_NAMES.has(normalized)) return true;
  // Keep the CAS check hyphen-insensitive: "7732185" also means water.
  return normalized === "7732185";
}

/**
 * Query string for the solvent lookup, or "" when no lookup is needed
 * (blank or water).
 */
export function getSolventLookupQuery(solvent) {
  const query = String(solvent || "").trim();
  if (!query || isWaterSolvent(query)) return "";
  return query;
}

const SIGNAL_WORD_RANK = { danger: 2, warning: 1, 危險: 2, 警告: 1 };
const SIGNAL_WORD_ZH = {
  danger: "危險",
  warning: "警告",
  危險: "危險",
  警告: "警告",
};

const signalRank = (signalWord) =>
  SIGNAL_WORD_RANK[String(signalWord || "").trim().toLowerCase()] || 0;

/** The stronger of two signal words: Danger > Warning > none. */
export function strongerSignalWord(first, second) {
  return signalRank(second) > signalRank(first) ? second : first;
}

// A statement with no code is kept and matched on its wording: dropping it
// would silently remove a hazard from the label.
const unionByCode = (primary = [], extra = []) => {
  const seen = new Set();
  const merged = [];
  [...(primary || []), ...(extra || [])].forEach((item) => {
    const key = String(item?.code || item?.text_en || item?.text_zh || "")
      .trim()
      .toUpperCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
};

const mergeSignal = (target, solvent) => {
  const signalWord = strongerSignalWord(target.signal_word, solvent.signal_word);
  if (!signalWord) {
    return {
      signal_word: target.signal_word ?? null,
      signal_word_zh: target.signal_word_zh ?? null,
    };
  }
  const tookSolvent = signalWord !== target.signal_word;
  const key = String(signalWord).trim().toLowerCase();
  return {
    signal_word: signalWord,
    signal_word_zh:
      (tookSolvent ? solvent.signal_word_zh : target.signal_word_zh) ||
      SIGNAL_WORD_ZH[key] ||
      null,
  };
};

const solventClassification = (solventResult = {}) => ({
  pictograms: solventResult.ghs_pictograms || [],
  hazard_statements: solventResult.hazard_statements || [],
  precautionary_statements: solventResult.precautionary_statements || [],
  signal_word: solventResult.signal_word || null,
  signal_word_zh: solventResult.signal_word_zh || null,
});

/**
 * A solvent lookup result can be merged only when it is a confirmed hit with
 * renderable GHS data. Text-only GHS rows (no pictograms) need SDS review, so
 * they fall back to the "not included" warning as well.
 */
export function isUsableSolventLookupResult(solventResult) {
  if (!solventResult || !solventResult.found) return false;
  if (solventResult.upstream_error) return false;
  if (solventResult.error) return false;
  const classification = solventClassification(solventResult);
  return (
    hasGhsData(classification) && classification.pictograms.length > 0
  );
}

const mergeIntoClassification = (classification, solvent) => ({
  ...classification,
  pictograms: unionByCode(classification.pictograms, solvent.pictograms),
  hazard_statements: unionByCode(
    classification.hazard_statements,
    solvent.hazard_statements,
  ),
  precautionary_statements: unionByCode(
    classification.precautionary_statements,
    solvent.precautionary_statements,
  ),
  ...mergeSignal(classification, solvent),
});

/**
 * Merge a usable solvent result into the parent chemical's GHS data: the
 * primary classification and every alternate classification, so a user's
 * classification choice for the parent still carries the solvent hazards.
 * Identity fields (CAS, names, references) stay the parent's, and each
 * merged classification keeps its parent classification's fingerprint
 * (`solvent_base_fingerprint`), so saved choices and print history for the
 * parent CAS still match.
 */
export function mergeSolventHazardsIntoChemical(parent, solventResult) {
  const solvent = solventClassification(solventResult);
  const basePrimaryFingerprint = getGhsClassificationFingerprint(
    listGhsClassifications(parent)[0],
  );
  const primary = mergeIntoClassification(
    {
      pictograms: parent.ghs_pictograms || [],
      hazard_statements: parent.hazard_statements || [],
      precautionary_statements: parent.precautionary_statements || [],
      signal_word: parent.signal_word ?? null,
      signal_word_zh: parent.signal_word_zh ?? null,
    },
    solvent,
  );
  return {
    ...parent,
    ghs_pictograms: primary.pictograms,
    hazard_statements: primary.hazard_statements,
    precautionary_statements: primary.precautionary_statements,
    signal_word: primary.signal_word,
    signal_word_zh: primary.signal_word_zh,
    primary_solvent_base_fingerprint: basePrimaryFingerprint,
    classification_fingerprint:
      parent.classification_fingerprint || basePrimaryFingerprint,
    other_classifications: Array.isArray(parent.other_classifications)
      ? parent.other_classifications.map((classification) => ({
          ...mergeIntoClassification(classification || {}, solvent),
          solvent_base_fingerprint: getGhsClassificationFingerprint(
            classification || {},
          ),
        }))
      : parent.other_classifications,
  };
}

/**
 * Decide the solvent-hazard status for a prepared item and describe it.
 * `solventResult` is the single-search response for the solvent, or null
 * when no lookup ran or it failed.
 */
export function resolveSolventHazards(solvent, solventResult = null) {
  const solventText = String(solvent || "").trim();
  if (isWaterSolvent(solventText)) {
    return { status: SOLVENT_HAZARD_STATUS.WATER, solvent: solventText };
  }
  if (isUsableSolventLookupResult(solventResult)) {
    return {
      status: SOLVENT_HAZARD_STATUS.INCLUDED,
      solvent: solventText,
      solventCas: solventResult.cas_number || null,
      solventNameEn: solventResult.name_en || null,
      solventNameZh: solventResult.name_zh || null,
    };
  }
  return { status: SOLVENT_HAZARD_STATUS.NOT_INCLUDED, solvent: solventText };
}

/** Display name for the solvent that was merged (resolved name first). */
export function getSolventHazardDisplayName(solventHazards = {}, locale = "en") {
  const isChinese = String(locale || "").toLowerCase().startsWith("zh");
  const resolved = isChinese
    ? solventHazards.solventNameZh || solventHazards.solventNameEn
    : solventHazards.solventNameEn || solventHazards.solventNameZh;
  return String(resolved || solventHazards.solvent || "").trim();
}

/**
 * The solvent-hazard status recorded on a prepared item. Items built before
 * this field existed have no status: any solvent other than water is then
 * treated as "not included", never as harmless.
 */
export function getRecordedSolventHazards(chemical) {
  const meta = chemical?.preparedSolution || {};
  const recorded = meta.solventHazards;
  if (recorded?.status) return recorded;
  return {
    status: isWaterSolvent(meta.solvent)
      ? SOLVENT_HAZARD_STATUS.WATER
      : SOLVENT_HAZARD_STATUS.NOT_INCLUDED,
    solvent: String(meta.solvent || "").trim(),
  };
}
