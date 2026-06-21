import { resolvePrintContentPolicy } from "@/utils/printContentPolicy";
import { resolveTrustedChineseName } from "@/utils/ghsText";
import { applySelectedGhsClassification } from "@/utils/selectedGhsClassification";

export const PRINT_LABEL_ELEMENT_STATUS = Object.freeze({
  PRESENT: "present",
  MISSING: "missing",
  NOT_APPLICABLE: "not_applicable",
});

export const PRINT_LABEL_ELEMENT_KEYS = Object.freeze({
  IDENTITY: "identity",
  CAS: "cas",
  SIGNAL_WORD: "signalWord",
  PICTOGRAMS: "pictograms",
  HAZARD_STATEMENTS: "hazardStatements",
  PRECAUTIONARY_STATEMENTS: "precautionaryStatements",
  RESPONSIBLE_PROFILE: "responsibleProfile",
});

const RESPONSIBLE_PROFILE_FIELDS = ["organization", "phone", "address"];

export function resolveEffectiveChemicalForPrint(
  chemical,
  customGHSSettings,
) {
  return applySelectedGhsClassification(chemical, customGHSSettings);
}

export const countResponsibleProfileFields = (profile = {}) =>
  RESPONSIBLE_PROFILE_FIELDS.reduce(
    (count, field) => count + (profile[field] ? 1 : 0),
    0,
  );

export const hasResponsibleProfile = (profile = {}) =>
  countResponsibleProfileFields(profile) === RESPONSIBLE_PROFILE_FIELDS.length;

const statusForCount = (count, { required = false } = {}) => {
  if (count > 0) return PRINT_LABEL_ELEMENT_STATUS.PRESENT;
  return required
    ? PRINT_LABEL_ELEMENT_STATUS.MISSING
    : PRINT_LABEL_ELEMENT_STATUS.NOT_APPLICABLE;
};

export function buildPrintLabelContent(chemical, options = {}) {
  const {
    customGHSSettings = {},
    resolvedLabProfile = {},
    layout = {},
    locale = "zh",
  } = options;
  const effectiveChemical = resolveEffectiveChemicalForPrint(
    chemical,
    customGHSSettings,
  );
  const pictograms = effectiveChemical.ghs_pictograms || [];
  const hazardStatements = effectiveChemical.hazard_statements || [];
  const precautionaryStatements =
    effectiveChemical.precautionary_statements || [];
  const signalWord =
    effectiveChemical.signal_word || effectiveChemical.signal_word_zh || "";
  const identity =
    effectiveChemical.name_en ||
    resolveTrustedChineseName(effectiveChemical) ||
    effectiveChemical.name ||
    effectiveChemical.cas_number ||
    "";
  const isCompletePrimary =
    layout.labelPurpose === "shipping" && layout.template === "full";
  const policy = resolvePrintContentPolicy(layout, { locale });
  const responsibleProfilePresent = hasResponsibleProfile(resolvedLabProfile);

  return {
    effectiveChemical,
    identity,
    cas: effectiveChemical.cas_number || "",
    signalWord,
    pictograms,
    hazardStatements,
    precautionaryStatements,
    counts: {
      pictograms: pictograms.length,
      hazardStatements: hazardStatements.length,
      precautionaryStatements: precautionaryStatements.length,
      statements: hazardStatements.length + precautionaryStatements.length,
    },
    elementStatus: {
      [PRINT_LABEL_ELEMENT_KEYS.IDENTITY]: identity
        ? PRINT_LABEL_ELEMENT_STATUS.PRESENT
        : PRINT_LABEL_ELEMENT_STATUS.MISSING,
      [PRINT_LABEL_ELEMENT_KEYS.CAS]: effectiveChemical.cas_number
        ? PRINT_LABEL_ELEMENT_STATUS.PRESENT
        : PRINT_LABEL_ELEMENT_STATUS.MISSING,
      [PRINT_LABEL_ELEMENT_KEYS.SIGNAL_WORD]: signalWord
        ? PRINT_LABEL_ELEMENT_STATUS.PRESENT
        : PRINT_LABEL_ELEMENT_STATUS.NOT_APPLICABLE,
      [PRINT_LABEL_ELEMENT_KEYS.PICTOGRAMS]: statusForCount(pictograms.length),
      [PRINT_LABEL_ELEMENT_KEYS.HAZARD_STATEMENTS]: statusForCount(
        hazardStatements.length,
      ),
      [PRINT_LABEL_ELEMENT_KEYS.PRECAUTIONARY_STATEMENTS]: statusForCount(
        precautionaryStatements.length,
      ),
      [PRINT_LABEL_ELEMENT_KEYS.RESPONSIBLE_PROFILE]:
        isCompletePrimary && !responsibleProfilePresent
          ? PRINT_LABEL_ELEMENT_STATUS.MISSING
          : responsibleProfilePresent
            ? PRINT_LABEL_ELEMENT_STATUS.PRESENT
            : PRINT_LABEL_ELEMENT_STATUS.NOT_APPLICABLE,
    },
    policy: {
      ...policy,
      pictogramsMustRender: pictograms.length > 0,
    },
  };
}

export function buildPrintLabelContents(chemicals = [], options = {}) {
  return chemicals.map((chemical, index) => ({
    index,
    ...buildPrintLabelContent(chemical, options),
  }));
}
