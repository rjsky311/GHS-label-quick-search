// Ordering basis: hazard severity. Category-1 chronic health hazards
// (carcinogenicity, mutagenicity, reproductive toxicity, STOT, respiratory
// sensitisation) rank with acute lethal and corrosive hazards, so a space
// budget never pushes them behind irritation statements. Ties keep the
// original upstream order, so the result stays deterministic.

// Combined statements may join codes with "+", "/" or ",", and a later part
// may drop its prefix ("H300+310"), so that part inherits the first prefix.
const getStatementCodes = (statement) => {
  const parts = String(statement?.code || "")
    .split(/[+/,]/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  const prefix = /^[A-Z]+/.exec(parts[0] || "")?.[0] || "";
  return parts.map((code) => (/^\d/.test(code) ? `${prefix}${code}` : code));
};

const scoreStatementCodes = (statement, scoreCode) => {
  const codes = getStatementCodes(statement);
  if (codes.length === 0) return 0;
  return Math.max(...codes.map(scoreCode));
};

// Reads the three-digit number of an H/P code and ignores GHS/CLP suffixes
// such as H350i, H360FD, or H361fd so variants keep their parent's rank.
const parseCodeNumber = (code, prefix) => {
  const match = new RegExp(`^${prefix}(\\d{3})(?![0-9])`).exec(code);
  return match ? Number(match[1]) : null;
};

export const HAZARD_PRIORITY_TIER = Object.freeze({
  SEVERE: 100,
  SUSPECTED_CHRONIC: 90,
  PHYSICAL: 85,
  PRESSURE_OR_METAL_CORROSION: 80,
  IRRITANT_OR_HARMFUL: 50,
  ENVIRONMENTAL: 40,
  OTHER: 10,
});

// Explosives, self-reactive/organic-peroxide type A/B, pyrophoric and
// water-reactive solids/liquids, acute fatal/toxic, aspiration, corrosive and
// serious eye damage, category-1 CMR, STOT category 1, and respiratory
// sensitisation.
const SEVERE_HAZARD_CODES = new Set([
  200, 201, 202, 203, 204, 205, 240, 241, 250, 260, 261, 300, 301, 304, 310,
  311, 314, 318, 330, 331, 334, 340, 350, 360, 370, 372,
]);

// Suspected (category 2) CMR, lactation effects, and STOT category 2.
const SUSPECTED_CHRONIC_HAZARD_CODES = new Set([341, 351, 361, 362, 371, 373]);

// Remaining physical hazards: desensitised explosives, flammables, aerosols,
// unstable gases, self-reactive/peroxide types C-G, self-heating, oxidisers,
// and flammable chemicals under pressure.
const PHYSICAL_HAZARD_CODES = new Set([
  206, 207, 208, 209, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230,
  231, 232, 242, 251, 252, 270, 271, 272, 282, 283,
]);

const PRESSURE_OR_METAL_CORROSION_CODES = new Set([280, 281, 284, 290]);

// Irritation, skin sensitisation, drowsiness/dizziness, acute toxicity
// categories 4 and 5, aspiration category 2, and mild skin or eye irritation.
const IRRITANT_OR_HARMFUL_CODES = new Set([
  302, 303, 305, 312, 313, 315, 316, 317, 319, 320, 332, 333, 335, 336, 337,
]);

// Aquatic and ozone hazards. They rank below health hazards but stay ahead of
// any code this file does not recognise.
const ENVIRONMENTAL_HAZARD_CODES = new Set([
  400, 401, 402, 410, 411, 412, 413, 420,
]);

const scoreHazardCode = (code) => {
  const number = parseCodeNumber(code, "H");
  if (number == null) return HAZARD_PRIORITY_TIER.OTHER;
  if (SEVERE_HAZARD_CODES.has(number)) return HAZARD_PRIORITY_TIER.SEVERE;
  if (SUSPECTED_CHRONIC_HAZARD_CODES.has(number)) {
    return HAZARD_PRIORITY_TIER.SUSPECTED_CHRONIC;
  }
  if (PHYSICAL_HAZARD_CODES.has(number)) return HAZARD_PRIORITY_TIER.PHYSICAL;
  if (PRESSURE_OR_METAL_CORROSION_CODES.has(number)) {
    return HAZARD_PRIORITY_TIER.PRESSURE_OR_METAL_CORROSION;
  }
  if (IRRITANT_OR_HARMFUL_CODES.has(number)) {
    return HAZARD_PRIORITY_TIER.IRRITANT_OR_HARMFUL;
  }
  if (ENVIRONMENTAL_HAZARD_CODES.has(number)) {
    return HAZARD_PRIORITY_TIER.ENVIRONMENTAL;
  }
  return HAZARD_PRIORITY_TIER.OTHER;
};

// P201/P202 (obtain special instructions before use) and P210 (keep away from
// heat, sparks, open flames) join the leading prevention statements.
const LEADING_PREVENTION_CODES = new Set([
  201, 202, 210, 260, 261, 264, 271, 280, 284,
]);

const LEADING_RESPONSE_CODES = new Set([
  301, 302, 303, 304, 305, 306, 308, 310, 311, 312, 313, 314, 315, 320, 321,
  330, 331,
]);

const scorePrecautionCode = (code) => {
  const number = parseCodeNumber(code, "P");
  if (number == null) return 10;
  if (LEADING_RESPONSE_CODES.has(number)) return 100;
  if (LEADING_PREVENTION_CODES.has(number)) return 90;
  if (number >= 300 && number < 400) return 80;
  if (number >= 400 && number < 500) return 50;
  if (number >= 500 && number < 600) return 30;
  return 10;
};

const prioritizeStatements = (statements, scoreCode) =>
  [...(Array.isArray(statements) ? statements : [])]
    .map((statement, index) => ({
      statement,
      index,
      score: scoreStatementCodes(statement, scoreCode),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ statement }) => statement);

export const getHazardStatementPriority = (statement) =>
  scoreStatementCodes(statement, scoreHazardCode);

export const getPrecautionaryStatementPriority = (statement) =>
  scoreStatementCodes(statement, scorePrecautionCode);

export const prioritizeHazardStatements = (statements) =>
  prioritizeStatements(statements, scoreHazardCode);

export const prioritizePrecautionaryStatements = (statements) =>
  prioritizeStatements(statements, scorePrecautionCode);

/**
 * Split hazard statements for a label with a limited text budget.
 *
 * - `fullText`: printed with code and wording (most severe first).
 * - `codeOnly`: printed as H codes without wording.
 * - `omitted`: not printed at all; only allowed when `retainAllCodes` is
 *   false, and callers must show a visible count for it.
 *
 * Container hazard labels pass `retainAllCodes: true`, so nothing lands in
 * `omitted`: statements beyond the text budget fall back to codes only.
 */
export const planHazardStatementsForBudget = (
  statements,
  { fullTextBudget = 0, codesOnly = false, retainAllCodes = false } = {},
) => {
  const prioritized = prioritizeHazardStatements(statements);
  const budget = Math.max(0, Math.trunc(Number(fullTextBudget) || 0));

  if (codesOnly) {
    return retainAllCodes
      ? { fullText: [], codeOnly: prioritized, omitted: [] }
      : {
          fullText: [],
          codeOnly: prioritized.slice(0, budget),
          omitted: prioritized.slice(budget),
        };
  }

  const fullText = prioritized.slice(0, budget);
  const remainder = prioritized.slice(budget);
  return retainAllCodes
    ? { fullText, codeOnly: remainder, omitted: [] }
    : { fullText, codeOnly: [], omitted: remainder };
};
