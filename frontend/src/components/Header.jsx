import {
  Activity,
  AlertTriangle,
  Star,
  ClipboardList,
  Globe,
  FlaskConical,
  LockKeyhole,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Header({
  favorites,
  history,
  preparedCount = 0,
  opsEventCount = 0,
  pilotAttentionCount = 0,
  showPilotDashboard = false,
  showPilotDashboardButton = false,
  pilotAdminUnlocked = false,
  onTogglePilotDashboard,
  onToggleFavorites,
  onToggleHistory,
  onTogglePrepared,
}) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const lang = i18n.language === "zh-TW" ? "en" : "zh-TW";
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-red-500">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t("header.title")}</h1>
              <p className="text-xs text-slate-400">{t("header.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {showPilotDashboardButton ? (
              <button
                onClick={onTogglePilotDashboard}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors ${
                  showPilotDashboard
                    ? "bg-emerald-600"
                    : "bg-emerald-700 hover:bg-emerald-600"
                }`}
                data-testid="pilot-dashboard-toggle-btn"
                title={t("header.adminToolsTitle", {
                  defaultValue: pilotAdminUnlocked
                    ? "Open admin tools"
                    : "Unlock admin tools",
                })}
              >
                {pilotAdminUnlocked ? (
                  <Activity className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {t("header.adminTools", { defaultValue: "Admin" })}
                </span>
                {pilotAdminUnlocked && (pilotAttentionCount > 0 || opsEventCount > 0) ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-950 px-1 text-xs font-semibold text-emerald-200">
                    {pilotAttentionCount > 0 ? pilotAttentionCount : opsEventCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-600"
              title={
                i18n.language === "zh-TW" ? "Switch to English" : "切換至中文"
              }
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t("header.langToggle")}</span>
            </button>
            <button
              onClick={onToggleFavorites}
              className="relative flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white transition-colors hover:bg-amber-700"
              data-testid="favorites-toggle-btn"
            >
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">{t("header.favorites")}</span>
              {favorites.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {favorites.length}
                </span>
              ) : null}
            </button>
            <button
              onClick={onTogglePrepared}
              className="relative flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              data-testid="prepared-toggle-btn"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">{t("header.prepared")}</span>
              {preparedCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-xs font-semibold text-slate-900">
                  {preparedCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={onToggleHistory}
              className="relative flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
              data-testid="history-toggle-btn"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">{t("header.history")}</span>
              {history.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                  {history.length}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
