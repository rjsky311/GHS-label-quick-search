import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import zhTW from "./locales/zh-TW.json";

const LANGUAGE_ZH_TW = "zh-TW";
const LANGUAGE_EN = "en";

const normalizeLanguage = (language) =>
  String(language || "").toLowerCase().startsWith("en")
    ? LANGUAGE_EN
    : LANGUAGE_ZH_TW;

const readInitialLanguage = () => {
  if (typeof window !== "undefined") {
    const storedLanguage = window.localStorage?.getItem("ghs_language");
    if (storedLanguage) return normalizeLanguage(storedLanguage);
  }
  if (typeof navigator !== "undefined") {
    return normalizeLanguage(navigator.language);
  }
  return LANGUAGE_ZH_TW;
};

const loadEnglishTranslations = async () => {
  const module = await import("./locales/en.json");
  return module.default || module;
};

const loadLanguageResources = async (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  const hasResourceBundle =
    typeof i18n.hasResourceBundle === "function"
      ? i18n.hasResourceBundle(normalizedLanguage, "translation")
      : false;
  if (
    normalizedLanguage === LANGUAGE_EN &&
    !hasResourceBundle
  ) {
    const en = await loadEnglishTranslations();
    if (typeof i18n.addResourceBundle === "function") {
      i18n.addResourceBundle(
        LANGUAGE_EN,
        "translation",
        en,
        true,
        true,
      );
    }
  }
  return normalizedLanguage;
};

const initialLanguage = readInitialLanguage();

export const i18nReady = (async () => {
  const resources = {
    [LANGUAGE_ZH_TW]: { translation: zhTW },
  };

  if (initialLanguage === LANGUAGE_EN) {
    resources[LANGUAGE_EN] = {
      translation: await loadEnglishTranslations(),
    };
  }

  await i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    supportedLngs: [LANGUAGE_ZH_TW, LANGUAGE_EN],
    fallbackLng: "zh-TW",
    partialBundledLanguages: true,
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "ghs_language",
    },
  });

  const changeLanguage = i18n.changeLanguage.bind(i18n);
  i18n.changeLanguage = async (language, ...args) => {
    const normalizedLanguage = await loadLanguageResources(language);
    return changeLanguage(normalizedLanguage, ...args);
  };

  return i18n;
})();

export default i18n;
