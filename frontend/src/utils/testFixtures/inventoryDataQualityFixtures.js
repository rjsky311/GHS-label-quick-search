const pictograms = (...codes) => codes.map((code) => ({ code }));

const hStatement = (code, text = `${code} hazard text`) => ({
  code,
  text,
  text_en: text,
});

export const inventoryBatchPasteFixture = [
  "67641",
  "90-41-5",
  "90-41-5",
  "344-04-07",
  "67-64-2",
].join("\n");

export const inventoryDataQualityFixtureResults = [
  {
    found: true,
    cas_number: "90-41-5",
    name_en: "2-Aminobiphenyl",
    name_zh: "2-胺基聯苯",
    ghs_pictograms: pictograms("GHS07", "GHS08"),
    hazard_statements: [hStatement("H350")],
    precautionary_statements: [],
    signal_word: "Danger",
    has_multiple_classifications: true,
    other_classifications: [
      {
        pictograms: pictograms("GHS07"),
        hazard_statements: [hStatement("H317")],
        signal_word: "Warning",
      },
    ],
  },
  {
    found: true,
    cas_number: "84-65-1",
    name_en: "Anthraquinone",
    name_zh: "",
    ghs_pictograms: pictograms("GHS07", "GHS08"),
    hazard_statements: [hStatement("H317"), hStatement("H350")],
    precautionary_statements: [],
    signal_word: "Warning",
  },
  {
    found: true,
    cas_number: "57-13-6",
    name_en: "Urea",
    name_zh: "尿素",
    ghs_pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: "",
  },
  {
    found: false,
    cas_number: "75-21-8",
    query: "75-21-8",
    upstream_error: true,
    error: "CID lookup failed after upstream timeout.",
  },
  {
    found: false,
    cas_number: "9999-99-9",
    query: "9999-99-9",
  },
];
