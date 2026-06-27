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
import { Button } from "@/components/ui/button";

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
  onGoHome,
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");
  const languageToggleTitle = isZh
    ? t("header.switchToEnglish")
    : t("header.switchToChinese");
  const headerButtonBase =
    "relative min-h-12 w-auto min-w-[4.25rem] shrink-0 flex-col gap-1 px-2 py-1.5 text-xs sm:min-w-28 sm:flex-row sm:justify-start sm:px-3 sm:py-2";
  const headerButtonLabelClass =
    "max-w-[3.75rem] truncate sm:max-w-none";
  const preparedButtonTitle =
    preparedCount > 0
      ? t("header.preparedTitleWithCount", { count: preparedCount })
      : t("header.preparedTitle");

  const handleHomeClick = (event) => {
    event.preventDefault();
    onGoHome?.();
  };

  const toggleLanguage = () => {
    const lang = isZh ? "en" : "zh-TW";
    void i18n
      .changeLanguage(lang)
      .then(() => {
        document.documentElement.lang = lang;
      })
      .catch((error) => {
        console.error("Failed to switch language", error);
      });
  };

  return (
    <header
      className="notebook-header sticky top-0 z-40 border-b backdrop-blur"
      data-testid="app-header"
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="notebook-home-link group -m-1 flex min-w-0 items-center gap-3 rounded-md p-1 text-left"
            aria-label={t("header.homeAria")}
            title={t("header.homeAria")}
            onClick={handleHomeClick}
            data-testid="header-home-link"
          >
            <div className="notebook-hazard-mark flex h-10 w-10 items-center justify-center rounded-md">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-[hsl(var(--notebook-ink))]">{t("header.title")}</h1>
              <p className="truncate text-xs text-[hsl(var(--notebook-muted-ink))]">{t("header.subtitle")}</p>
            </div>
          </a>
          <div className="flex flex-wrap gap-2">
            {showPilotDashboardButton ? (
              <Button
                onClick={onTogglePilotDashboard}
                variant={showPilotDashboard ? "notebookPrimary" : "notebookUtility"}
                size="notebookIcon"
                className={headerButtonBase}
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
                <span className={headerButtonLabelClass}>
                  {t("header.adminTools", { defaultValue: "Admin" })}
                </span>
                {pilotAdminUnlocked && (pilotAttentionCount > 0 || opsEventCount > 0) ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
                    {pilotAttentionCount > 0 ? pilotAttentionCount : opsEventCount}
                  </span>
                ) : null}
              </Button>
            ) : null}
            <Button
              onClick={toggleLanguage}
              variant="notebookUtility"
              size="notebookIcon"
              className={headerButtonBase}
              title={languageToggleTitle}
              aria-label={languageToggleTitle}
              data-testid="language-toggle-btn"
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span className={headerButtonLabelClass}>
                {t("header.langToggle")}
              </span>
            </Button>
            <Button
              onClick={onToggleFavorites}
              variant="notebookUtility"
              size="notebookIcon"
              className={headerButtonBase}
              data-testid="favorites-toggle-btn"
            >
              <Star className="h-4 w-4 shrink-0 text-amber-500" />
              <span className={headerButtonLabelClass}>
                {t("header.favorites")}
              </span>
              {favorites.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {favorites.length}
                </span>
              ) : null}
            </Button>
            <Button
              onClick={onTogglePrepared}
              variant="notebookUtility"
              size="notebookIcon"
              className={headerButtonBase}
              data-testid="prepared-toggle-btn"
              aria-label={preparedButtonTitle}
              title={preparedButtonTitle}
            >
              <FlaskConical className="h-4 w-4 shrink-0 text-blue-700" />
              <span className={headerButtonLabelClass}>
                {t("header.prepared")}
              </span>
              {preparedCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-xs font-semibold text-slate-900">
                  {preparedCount}
                </span>
              ) : null}
            </Button>
            <Button
              onClick={onToggleHistory}
              variant="notebookUtility"
              size="notebookIcon"
              className={headerButtonBase}
              data-testid="history-toggle-btn"
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-slate-600" />
              <span className={headerButtonLabelClass}>
                {t("header.history")}
              </span>
              {history.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                  {history.length}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
