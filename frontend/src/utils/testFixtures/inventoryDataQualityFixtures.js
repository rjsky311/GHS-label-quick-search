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

export const inventoryTabularPasteFixture = [
  "登入日期\tCAS No.\t英文名稱\t供應商統編",
  "20200813\t67641\tAcetone\t23282972",
  "20200814\t90-41-5\t2-Aminobiphenyl\t299250050",
  "20200815\t1003094\t2-Bromothiophene\t75989",
].join("\n");

export const inventoryChineseHeaderPasteFixture = [
  "項次\tCAS編號\t危害性化學品\t英文名稱\t中文名稱",
  "1\t7719-09-7.\tN\tThionyl chloride\t氯亞硫醯",
  "2\t73183343.0\tN\tBis(pinacolato)diboron\t雙戊醯二硼",
  "3\t#VALUE!\tY\tHydrogen bromide\t溴化氫",
  "4\t7440-05-03 00:00:00\tN\tPalladium\t鈀",
].join("\n");

export const inventoryRosterEvidenceSummary = Object.freeze([
  {
    evidence: "Chinese CAS header",
    example: "CAS編號",
    expectedBehavior: "extract only the CAS column from inventory-style sheets",
  },
  {
    evidence: "numeric Excel CAS",
    example: "73183343.0",
    expectedBehavior: "normalize to 73183-34-3 when it appears in a CAS column",
  },
  {
    evidence: "trailing punctuation",
    example: "7719-09-7.",
    expectedBehavior: "trim harmless terminal punctuation before validation",
  },
  {
    evidence: "spreadsheet formula/date errors",
    example: "#VALUE!, 7440-05-03 00:00:00",
    expectedBehavior: "keep them invalid instead of guessing a CAS number",
  },
]);

export const inventoryDataQualityFixtureResults = [
  {
    found: true,
    cas_number: "67-64-1",
    name_en: "Acetone",
    name_zh: "丙酮",
    ghs_pictograms: pictograms("GHS02", "GHS07"),
    hazard_statements: [hStatement("H225"), hStatement("H319")],
    precautionary_statements: [],
    signal_word: "Warning",
  },
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
    cas_number: "50-00-0",
    name_en: "Formaldehyde",
    name_zh: "甲醛",
    ghs_pictograms: [],
    hazard_statements: [hStatement("H350")],
    precautionary_statements: [],
    signal_word: "Danger",
  },
  {
    found: true,
    cas_number: "100-00-5",
    name_en: "4-Nitrochlorobenzene",
    name_zh: "對硝基氯苯",
    ghs_pictograms: pictograms("GHS07", "GHS08", "GHS09"),
    hazard_statements: [hStatement("H302"), hStatement("H410")],
    precautionary_statements: [],
    signal_word: "Warning",
    source_conflict: true,
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
