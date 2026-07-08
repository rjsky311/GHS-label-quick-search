import {
  Activity,
  AlertTriangle,
  Star,
  ClipboardList,
  Globe,
  FlaskConical,
  LockKeyhole,
  Moon,
  Sun,
} from "@/components/icons";
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
  themeMode = "comfort-dim",
  onTogglePilotDashboard,
  onToggleFavorites,
  onToggleHistory,
  onTogglePrepared,
  onToggleThemeMode,
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
  const isDarkBench = themeMode === "dark-bench";
  const themeToggleVisibleLabel = isDarkBench
    ? t("header.themeDarkShort")
    : t("header.themeComfortShort");
  const themeToggleActionLabel = isDarkBench
    ? t("header.switchToComfortDim")
    : t("header.switchToDarkBench");
  const themeToggleTitle = `${themeToggleVisibleLabel}. ${themeToggleActionLabel}`;
  const ThemeIcon = isDarkBench ? Sun : Moon;

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
              <AlertTriangle className="h-5 w-5 notebook-tone-danger" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-[var(--font-display)] text-2xl font-black text-[hsl(var(--notebook-ink))]">{t("header.title")}</h1>
              <p className="truncate font-[var(--font-mono)] text-xs text-[hsl(var(--notebook-muted-ink))]">{t("header.subtitle")}</p>
            </div>
          </a>
          <div className="flex flex-nowrap gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:py-0">
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
                  <span className="notebook-count-badge notebook-count-badge-action absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ring-1 ring-[hsl(var(--notebook-action-border)/0.45)]">
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
              onClick={onToggleThemeMode}
              variant="notebookUtility"
              size="notebookIcon"
              className={headerButtonBase}
              title={themeToggleTitle}
              aria-label={themeToggleTitle}
              aria-pressed={isDarkBench}
              data-testid="theme-toggle-btn"
            >
              <ThemeIcon className="h-4 w-4 shrink-0" />
              <span className={headerButtonLabelClass}>
                {themeToggleVisibleLabel}
              </span>
            </Button>
            <Button
              onClick={onToggleFavorites}
              variant="notebookUtility"
              size="notebookIcon"
              className={headerButtonBase}
              data-testid="favorites-toggle-btn"
            >
              <Star className="h-4 w-4 shrink-0 notebook-tone-warning" />
              <span className={headerButtonLabelClass}>
                {t("header.favorites")}
              </span>
              {favorites.length > 0 ? (
                <span className="notebook-count-badge notebook-count-badge-danger absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
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
              <FlaskConical className="h-4 w-4 shrink-0 notebook-tone-action" />
              <span className={headerButtonLabelClass}>
                {t("header.prepared")}
              </span>
              {preparedCount > 0 ? (
                <span className="notebook-count-badge notebook-count-badge-action absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
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
              <ClipboardList className="h-4 w-4 shrink-0 notebook-tone-muted" />
              <span className={headerButtonLabelClass}>
                {t("header.history")}
              </span>
              {history.length > 0 ? (
                <span className="notebook-count-badge notebook-count-badge-warning absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
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
