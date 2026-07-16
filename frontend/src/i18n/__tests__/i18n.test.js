describe("i18n runtime resources", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("resolves bundled Traditional Chinese flat-key translations before render", async () => {
    window.localStorage.setItem("ghs_language", "zh-TW");

    const { default: i18n, i18nReady } = await import("@/i18n");
    await i18nReady;

    expect(i18n.t("header.title")).toBe("GHS 標籤快速查詢");
    expect(i18n.t("empty.title")).not.toBe("empty.title");
    expect(document.documentElement.lang).toBe("zh-TW");
  });

  test("loads English translations before render when English is selected", async () => {
    window.localStorage.setItem("ghs_language", "en");

    const { default: i18n, i18nReady } = await import("@/i18n");
    await i18nReady;

    expect(i18n.t("header.title")).toBe("GHS Label Quick Search");
    expect(i18n.t("empty.title")).not.toBe("empty.title");
    expect(document.documentElement.lang).toBe("en");

    await i18n.changeLanguage("zh-TW");
    expect(document.documentElement.lang).toBe("zh-TW");
  });

  test("pins Traditional Chinese prepared-label entry copy", async () => {
    window.localStorage.setItem("ghs_language", "zh-TW");

    const { default: i18n, i18nReady } = await import("@/i18n");
    await i18nReady;

    expect(i18n.t("header.prepared")).toBe("配製重印");
    expect(i18n.t("header.preparedTitle")).toBe("查看近期配製標籤與重印");
    expect(i18n.t("header.preparedTitleWithCount", { count: 3 })).toBe(
      "查看 3 筆近期配製標籤與重印"
    );
    expect(i18n.t("detail.prepareSolution")).toBe("用此化學品建立配製標籤");
    expect(i18n.t("prepared.title")).toBe("建立配製溶液標籤");
    expect(i18n.t("prepared.subtitle")).toContain("母化學品");
    expect(i18n.t("prepared.subtitle")).toContain("工作液、配製溶液或配製試劑");
    expect(i18n.t("prepared.subtitle")).not.toContain("稀釋液");
    expect(i18n.t("prepared.formNote")).toContain("不會重新計算");
    expect(i18n.t("prepared.formNote")).toContain("不會因濃度");
    expect(i18n.t("prepared.formNote")).toContain("稀釋比例");
    expect(i18n.t("prepared.formNote")).toContain("降低、弱化或修改危害");
    expect(i18n.t("prepared.formNote")).toContain("官方安全資料表（SDS）");
    expect(i18n.t("prepared.formNote")).toContain("供應商標籤");
    expect(i18n.t("prepared.formNote")).toContain("所在地規範");
    expect(i18n.t("prepared.labelPrefix")).toBe("配製自");
    expect(i18n.t("prepared.recentHeading")).toBe(
      "最近使用的配製紀錄 — 點擊帶入，可再確認後列印"
    );
    expect(i18n.t("prepared.presetHeading")).toBe(
      "已儲存配方 — 只帶入濃度 / 溶劑"
    );
    expect(i18n.t("prepared.recentHint")).toBe(
      "最近紀錄會帶入濃度、溶劑與配製人供你確認；配製日期會重設為今天，有效期限保持空白。"
    );
    expect(i18n.t("prepared.presetHint")).toBe(
      "已儲存配方只保留濃度 / 溶劑，不帶入配製人、日期、有效期限，也不保存危害資料。"
    );
    expect(i18n.t("prepared.presetBadge")).toBe("配方");
    expect(i18n.t("prepared.saveAsPreset")).toBe("儲存為配方");
    expect(i18n.t("prepared.presetName")).toBe("配方名稱（選填）");
    expect(i18n.t("prepared.sidebarHint")).toBe(
      "重印會重新取得母化學品資料並開啟列印確認；列印前請再確認濃度、溶劑與日期資訊。"
    );
    expect(i18n.t("prepared.sidebarEmpty")).toBe("還沒有近期配製標籤");
    expect(i18n.t("prepared.sidebarEmptyHint")).toBe(
      "先搜尋母化學品，從詳細資料建立配製溶液標籤；完成後可在這裡用最新的母化學品危害資料重印。"
    );
    expect(i18n.t("prepared.closeSidebar")).toBe("關閉近期配製標籤");
    expect(i18n.t("prepared.reprint")).toBe("重印");
  });

  test("pins English prepared-label entry copy", async () => {
    window.localStorage.setItem("ghs_language", "en");

    const { default: i18n, i18nReady } = await import("@/i18n");
    await i18nReady;

    expect(i18n.t("header.prepared")).toBe("Reprint");
    expect(i18n.t("header.preparedTitle")).toBe(
      "View recent prepared labels and reprint"
    );
    expect(i18n.t("header.preparedTitleWithCount", { count: 3 })).toBe(
      "View 3 recent prepared labels and reprint"
    );
    expect(i18n.t("detail.prepareSolution")).toBe(
      "Create prepared label from this chemical"
    );
    expect(i18n.t("prepared.title")).toBe("Create prepared solution label");
    expect(i18n.t("prepared.subtitle")).toContain("selected parent chemical");
    expect(i18n.t("prepared.subtitle")).toContain("working solution");
    expect(i18n.t("prepared.subtitle")).not.toContain("dilution");
    expect(i18n.t("prepared.formNote")).toContain("does not re-classify");
    expect(i18n.t("prepared.formNote")).toContain(
      "does not infer, reduce, weaken, or modify hazards"
    );
    expect(i18n.t("prepared.formNote")).toContain("dilution");
    expect(i18n.t("prepared.formNote")).toContain("official SDS");
    expect(i18n.t("prepared.formNote")).toContain("supplier label");
    expect(i18n.t("prepared.formNote")).toContain("local rules");
    expect(i18n.t("prepared.labelPrefix")).toBe("Prepared from");
    expect(i18n.t("prepared.recentHeading")).toBe(
      "Recent prepared records — click to prefill, then review before printing"
    );
    expect(i18n.t("prepared.presetHeading")).toBe(
      "Saved recipes — reuse concentration / solvent only"
    );
    expect(i18n.t("prepared.recentHint")).toBe(
      "Recent records prefill concentration, solvent, and operator for review; the prepared date resets to today and expiry stays blank."
    );
    expect(i18n.t("prepared.presetHint")).toBe(
      "Saved recipes keep only concentration / solvent. They do not carry operator, dates, expiry, or hazard data."
    );
    expect(i18n.t("prepared.presetBadge")).toBe("Recipe");
    expect(i18n.t("prepared.saveAsPreset")).toBe("Save as recipe");
    expect(i18n.t("prepared.presetName")).toBe("Recipe name (optional)");
    expect(i18n.t("prepared.sidebarHint")).toBe(
      "Reprint refreshes the parent chemical data and opens print review; confirm concentration, solvent, and dates before printing."
    );
    expect(i18n.t("prepared.sidebarEmpty")).toBe("No recent prepared labels yet");
    expect(i18n.t("prepared.sidebarEmptyHint")).toBe(
      "Search for a parent chemical first, then create a prepared-solution label from its detail view. After that, reprint here with fresh parent hazard data."
    );
    expect(i18n.t("prepared.closeSidebar")).toBe("Close recent prepared labels");
    expect(i18n.t("prepared.reprint")).toBe("Reprint");
  });
});
