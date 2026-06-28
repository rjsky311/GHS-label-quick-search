import {
  THEME_MODE_STORAGE_KEY,
  THEME_MODES,
  getNextThemeMode,
  getThemeModeClassName,
  loadThemeMode,
  persistThemeMode,
} from "../themeMode";

describe("themeMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to comfort dim without a saved preference", () => {
    expect(loadThemeMode()).toBe(THEME_MODES.COMFORT_DIM);
  });

  it("falls back to comfort dim for invalid saved values", () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, "warm-light");
    expect(loadThemeMode()).toBe(THEME_MODES.COMFORT_DIM);
  });

  it("persists only supported theme modes", () => {
    persistThemeMode(THEME_MODES.DARK_BENCH);
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe(
      THEME_MODES.DARK_BENCH,
    );

    persistThemeMode("warm-light");
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe(
      THEME_MODES.COMFORT_DIM,
    );
  });

  it("falls back to comfort dim when storage reads fail", () => {
    const blockedStorage = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };

    expect(loadThemeMode(blockedStorage)).toBe(THEME_MODES.COMFORT_DIM);
  });

  it("does not throw when storage writes fail", () => {
    const blockedStorage = {
      setItem: () => {
        throw new Error("storage blocked");
      },
    };

    expect(persistThemeMode(THEME_MODES.DARK_BENCH, blockedStorage)).toBe(
      THEME_MODES.DARK_BENCH,
    );
  });

  it("maps modes to app root class names", () => {
    expect(getThemeModeClassName(THEME_MODES.COMFORT_DIM)).toBe(
      "theme-comfort-dim",
    );
    expect(getThemeModeClassName(THEME_MODES.DARK_BENCH)).toBe(
      "theme-dark-bench",
    );
    expect(getThemeModeClassName("warm-light")).toBe("theme-comfort-dim");
  });

  it("toggles between the two selected product themes", () => {
    expect(getNextThemeMode(THEME_MODES.COMFORT_DIM)).toBe(
      THEME_MODES.DARK_BENCH,
    );
    expect(getNextThemeMode(THEME_MODES.DARK_BENCH)).toBe(
      THEME_MODES.COMFORT_DIM,
    );
    expect(getNextThemeMode("warm-light")).toBe(THEME_MODES.DARK_BENCH);
  });
});
