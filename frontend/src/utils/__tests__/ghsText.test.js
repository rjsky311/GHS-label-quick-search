import {
  getLocalizedNames,
  hasCjkText,
  resolveEnglishName,
  resolveTrustedChineseName,
} from "../ghsText";

describe("ghsText identity helpers", () => {
  it("keeps trusted Chinese names that contain CJK text", () => {
    expect(
      resolveTrustedChineseName({
        name_en: "4-Bromobenzophenone",
        name_zh: "4-溴二苯甲酮",
      }),
    ).toBe("4-溴二苯甲酮");
  });

  it("rejects placeholder Chinese names that are just English text", () => {
    expect(
      resolveTrustedChineseName({
        name_en: "Allyl Alcohol",
        name_zh: "Allyl Alcohol",
      }),
    ).toBe("");
    expect(
      resolveTrustedChineseName({
        name_en: "Ethanol",
        name_zh: "Ethanol ZH",
      }),
    ).toBe("");
  });

  it("can use a generic CJK name only when no dedicated Chinese field exists", () => {
    expect(
      resolveTrustedChineseName({
        name_en: "",
        name: "苯胺",
      }),
    ).toBe("苯胺");
  });

  it("keeps English identity separate from trusted Chinese identity", () => {
    const chemical = {
      cas_number: "107-18-6",
      name_en: "Allyl Alcohol",
      name_zh: "Allyl Alcohol",
    };

    expect(resolveEnglishName(chemical)).toBe("Allyl Alcohol");
    expect(getLocalizedNames(chemical, "zh")).toEqual({
      primary: "Allyl Alcohol",
      secondary: "",
    });
    expect(getLocalizedNames(chemical, "en")).toEqual({
      primary: "Allyl Alcohol",
      secondary: "",
    });
  });

  it("returns bilingual display names when Chinese is trusted", () => {
    expect(
      getLocalizedNames(
        {
          cas_number: "67-64-1",
          name_en: "Acetone",
          name_zh: "丙酮",
        },
        "en",
      ),
    ).toEqual({
      primary: "Acetone",
      secondary: "丙酮",
    });
  });

  it("exposes CJK detection for display callers", () => {
    expect(hasCjkText("4-溴二苯甲酮")).toBe(true);
    expect(hasCjkText("4-Bromobenzophenone")).toBe(false);
  });
});
