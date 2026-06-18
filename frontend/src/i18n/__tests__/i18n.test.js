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
  });

  test("loads English translations before render when English is selected", async () => {
    window.localStorage.setItem("ghs_language", "en");

    const { default: i18n, i18nReady } = await import("@/i18n");
    await i18nReady;

    expect(i18n.t("header.title")).toBe("GHS Label Quick Search");
    expect(i18n.t("empty.title")).not.toBe("empty.title");
  });
});
