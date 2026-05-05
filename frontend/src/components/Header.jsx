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
  const isZh = i18n.language?.startsWith("zh");
  const languageToggleTitle = isZh
    ? t("header.switchToEnglish")
    : t("header.switchToChinese");
  const buttonBase =
    "relative inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-0 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-28 sm:justify-start sm:px-3";
  const activeButton =
    "relative inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-md border border-blue-700 bg-blue-700 px-0 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-28 sm:justify-start sm:px-3";

  const toggleLanguage = () => {
    const lang = isZh ? "en" : "zh-TW";
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-slate-950">{t("header.title")}</h1>
              <p className="truncate text-xs text-slate-500">{t("header.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {showPilotDashboardButton ? (
              <button
                onClick={onTogglePilotDashboard}
                className={showPilotDashboard ? activeButton : buttonBase}
                data-testid="pilot-dashboard-toggle-btn"
                title={t("header.adminToolsTitle", {
                  defaultValue: pilotAdminUnlocked
                    ? "Open admin tools"
                    : "Unlock admin tools",
                })}
              >
                {pilotAdminUnlocked ? (
                  <Activity className="h-4 w-4 shrink-0" />
                ) : (
                  <LockKeyhole className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden min-w-0 truncate sm:inline">
                  {t("header.adminTools", { defaultValue: "Admin" })}
                </span>
                {pilotAdminUnlocked && (pilotAttentionCount > 0 || opsEventCount > 0) ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
                    {pilotAttentionCount > 0 ? pilotAttentionCount : opsEventCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              onClick={toggleLanguage}
              className={buttonBase}
              title={languageToggleTitle}
              aria-label={languageToggleTitle}
              data-testid="language-toggle-btn"
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className="hidden min-w-0 truncate sm:inline">{t("header.langToggle")}</span>
            </button>
            <button
              onClick={onToggleFavorites}
              className={buttonBase}
              data-testid="favorites-toggle-btn"
            >
              <Star className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="hidden min-w-0 truncate sm:inline">{t("header.favorites")}</span>
              {favorites.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {favorites.length}
                </span>
              ) : null}
            </button>
            <button
              onClick={onTogglePrepared}
              className={buttonBase}
              data-testid="prepared-toggle-btn"
            >
              <FlaskConical className="h-4 w-4 shrink-0 text-blue-700" />
              <span className="hidden min-w-0 truncate sm:inline">{t("header.prepared")}</span>
              {preparedCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-xs font-semibold text-slate-900">
                  {preparedCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={onToggleHistory}
              className={buttonBase}
              data-testid="history-toggle-btn"
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-slate-600" />
              <span className="hidden min-w-0 truncate sm:inline">{t("header.history")}</span>
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
