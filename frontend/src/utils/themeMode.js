export const THEME_MODES = Object.freeze({
  COMFORT_DIM: "comfort-dim",
  DARK_BENCH: "dark-bench",
});

export const THEME_MODE_STORAGE_KEY = "ghs-theme-mode";

const SUPPORTED_THEME_MODES = new Set(Object.values(THEME_MODES));

export function normalizeThemeMode(value) {
  return SUPPORTED_THEME_MODES.has(value) ? value : THEME_MODES.COMFORT_DIM;
}

function resolveThemeStorage(storage) {
  return storage === undefined ? globalThis.localStorage : storage;
}

export function loadThemeMode(storage) {
  try {
    return normalizeThemeMode(
      resolveThemeStorage(storage)?.getItem(THEME_MODE_STORAGE_KEY),
    );
  } catch {
    return THEME_MODES.COMFORT_DIM;
  }
}

export function persistThemeMode(mode, storage) {
  const normalized = normalizeThemeMode(mode);
  try {
    resolveThemeStorage(storage)?.setItem(THEME_MODE_STORAGE_KEY, normalized);
  } catch {
    // Storage failures should not block label lookup or printing.
  }
  return normalized;
}

export function getThemeModeClassName(mode) {
  return normalizeThemeMode(mode) === THEME_MODES.DARK_BENCH
    ? "theme-dark-bench"
    : "theme-comfort-dim";
}

export function getNextThemeMode(mode) {
  return normalizeThemeMode(mode) === THEME_MODES.DARK_BENCH
    ? THEME_MODES.COMFORT_DIM
    : THEME_MODES.DARK_BENCH;
}
