import { AlertTriangle, Star, ClipboardList, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Header({
  favorites,
  history,
  showFavorites,
  showHistory,
  onToggleFavorites,
  onToggleHistory,
}) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const lang = i18n.language === "zh-TW" ? "en" : "zh-TW";
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t("header.title")}
              </h1>
              <p className="text-xs text-slate-400">{t("header.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
              title={i18n.language === "zh-TW" ? "Switch to English" : "切換至中文"}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{t("header.langToggle")}</span>
            </button>
            {/* Favorites Button */}
            <button
              onClick={onToggleFavorites}
              className="relative px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
              data-testid="favorites-toggle-btn"
            >
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">{t("header.favorites")}</span>
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
            {/* History Button */}
            <button
              onClick={onToggleHistory}
              className="relative px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
              data-testid="history-toggle-btn"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">{t("header.history")}</span>
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
