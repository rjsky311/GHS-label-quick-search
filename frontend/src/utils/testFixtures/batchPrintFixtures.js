const pictograms = (...codes) => codes.map((code) => ({ code }));

const statements = (prefix, count, text) =>
  Array.from({ length: count }, (_, index) => ({
    code: `${prefix}${300 + index}`,
    text_en: `${text} ${index + 1}.`,
  }));

const makeChemical = ({
  cas,
  name,
  zh,
  signal = "Danger",
  pictogramCodes = ["GHS07"],
  hazardCount = 1,
  precautionCount = 0,
  hazardText = "Hazard statement for routine laboratory handling.",
  precautionText = "Follow the official SDS and local workplace procedure.",
  upstreamError = false,
  noGhs = false,
} = {}) => ({
  cas_number: cas,
  name_en: name,
  name_zh: zh || "",
  ghs_pictograms: noGhs ? [] : pictograms(...pictogramCodes),
  hazard_statements: noGhs ? [] : statements("H", hazardCount, hazardText),
  precautionary_statements: noGhs
    ? []
    : statements("P", precautionCount, precautionText),
  signal_word: noGhs ? "" : signal,
  upstream_error: upstreamError,
});

const sparseChemicals = Array.from({ length: 39 }, (_, index) =>
  makeChemical({
    cas: `9000-00-${index + 10}`,
    name: `Routine Reagent ${index + 1}`,
    pictogramCodes: index % 3 === 0 ? ["GHS02"] : ["GHS07"],
    hazardCount: 1,
    precautionCount: index % 4 === 0 ? 1 : 0,
    signal: index % 5 === 0 ? "Warning" : "Danger",
  }),
);

export const batchPrintMixedFixture50 = [
  makeChemical({
    cas: "7647-01-0",
    name: "Hydrochloric Acid",
    zh: "Hydrochloric Acid ZH",
    pictogramCodes: ["GHS04", "GHS05", "GHS06", "GHS07"],
    hazardCount: 6,
    precautionCount: 22,
    hazardText:
      "Contains dense bilingual hazard wording that should not force unrelated batch items to A4.",
    precautionText:
      "Use appropriate protective controls and follow official SDS handling instructions.",
  }),
  makeChemical({
    cas: "64-17-5",
    name: "Ethanol",
    pictogramCodes: ["GHS02", "GHS07"],
    hazardCount: 2,
    precautionCount: 2,
    signal: "Warning",
  }),
  makeChemical({
    cas: "57-13-6",
    name: "Urea",
    noGhs: true,
  }),
  makeChemical({
    cas: "9999-99-9",
    name: "Temporary Upstream Failure Reagent",
    upstreamError: true,
    noGhs: true,
  }),
  makeChemical({
    cas: "7782-44-7",
    name: "Text Only Oxygen Classification",
    pictogramCodes: [],
    hazardCount: 2,
    precautionCount: 0,
    signal: "Danger",
  }),
  makeChemical({
    cas: "1111-11-1",
    name: "Five Pictogram Stress Chemical",
    pictogramCodes: ["GHS01", "GHS02", "GHS03", "GHS04", "GHS05"],
    hazardCount: 2,
    precautionCount: 1,
  }),
  makeChemical({
    cas: "50-00-0",
    name:
      "Formaldehyde Extremely Long Internal Batch Container Name With Location And Owner",
    pictogramCodes: ["GHS05", "GHS06", "GHS07", "GHS08"],
    hazardCount: 12,
    precautionCount: 24,
    hazardText:
      "Long complete-primary hazard text with exposure, chronic toxicity, emergency, storage, and handling detail.",
    precautionText:
      "Long complete-primary precaution text retained for continuation pages and official review.",
  }),
  makeChemical({
    cas: "7664-93-9",
    name: "Sulfuric Acid Dense",
    pictogramCodes: ["GHS03", "GHS05", "GHS07", "GHS08"],
    hazardCount: 18,
    precautionCount: 18,
    hazardText:
      "Long hazard summary that is intentionally dense for small supplemental labels.",
  }),
  makeChemical({
    cas: "75-07-0",
    name: "Acetaldehyde",
    pictogramCodes: ["GHS02", "GHS07", "GHS08"],
    hazardCount: 4,
    precautionCount: 4,
  }),
  makeChemical({
    cas: "7722-84-1",
    name: "Hydrogen Peroxide",
    pictogramCodes: ["GHS03", "GHS05", "GHS07"],
    hazardCount: 4,
    precautionCount: 4,
  }),
  makeChemical({
    cas: "67-56-1",
    name: "Methanol",
    pictogramCodes: ["GHS02", "GHS06", "GHS08"],
    hazardCount: 4,
    precautionCount: 4,
  }),
  ...sparseChemicals,
];
