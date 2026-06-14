import { Search, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { BATCH_SEARCH_LIMIT } from "@/constants/ghs";

export default function SearchSection({
  activeTab,
  singleCas,
  batchCas,
  loading,
  error,
  batchCount,
  batchSummary,
  searchInputRef,
  onSetActiveTab,
  onSetSingleCas,
  onSetBatchCas,
  onSearchSingle,
  onSearchBatch,
  history,
  favorites,
  batchProgress,
}) {
  const { t } = useTranslation();
  const hasBatchDiagnostics =
    batchSummary &&
    batchSummary.inputCount > 0 &&
    (batchSummary.duplicateCount > 0 ||
      batchSummary.invalidCount > 0 ||
      batchSummary.rehyphenatedCount > 0);
  const invalidPreview = (batchSummary?.invalidItems || [])
    .slice(0, 3)
    .map((item) => item.raw)
    .join(", ");
  const rehyphenatedPreview = (batchSummary?.rehyphenatedItems || [])
    .slice(0, 3)
    .map((item) => `${item.raw} -> ${item.normalized}`)
    .join(", ");
  const progressPercent =
    batchProgress && batchProgress.total > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((batchProgress.current / batchProgress.total) * 100)
          )
        )
      : 0;

  return (
    <div
      className="search-workbench-control notebook-surface mb-4 overflow-hidden rounded-md"
      data-testid="search-workbench"
    >
      <div
        className="search-workbench-tabs flex border-b border-[hsl(var(--notebook-border)/0.72)]"
        data-testid="search-workbench-tabs"
      >
        <button
          onClick={() => onSetActiveTab("single")}
          className={`notebook-control notebook-control-tab inline-flex flex-1 items-center justify-center gap-2 rounded-b-none px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === "single"
              ? "border-b-2 border-[hsl(var(--notebook-action-border))] bg-[hsl(var(--notebook-action-soft))] text-[hsl(var(--notebook-action))]"
              : "text-[hsl(var(--notebook-muted-ink))] hover:text-[hsl(var(--notebook-ink))]"
          }`}
          data-testid="single-search-tab"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>{t("search.singleTab")}</span>
        </button>
        <button
          onClick={() => onSetActiveTab("batch")}
          className={`notebook-control notebook-control-tab inline-flex flex-1 items-center justify-center gap-2 rounded-b-none px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === "batch"
              ? "border-b-2 border-[hsl(var(--notebook-action-border))] bg-[hsl(var(--notebook-action-soft))] text-[hsl(var(--notebook-action))]"
              : "text-[hsl(var(--notebook-muted-ink))] hover:text-[hsl(var(--notebook-ink))]"
          }`}
          data-testid="batch-search-tab"
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          <span>{t("search.batchTab")}</span>
        </button>
      </div>

      <div className="search-workbench-body p-5 md:p-6" data-testid="search-workbench-body">
        {activeTab === "single" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--notebook-ink))]">
                {t("search.inputLabel")}
              </label>
              <div
                className="flex flex-col gap-3 sm:flex-row"
                data-testid="single-search-controls"
              >
                <SearchAutocomplete
                  value={singleCas}
                  onChange={onSetSingleCas}
                  onSearch={onSearchSingle}
                  history={history}
                  favorites={favorites}
                  searchInputRef={searchInputRef}
                  loading={loading}
                />
                <Button
                  onClick={() => onSearchSingle()}
                  disabled={loading}
                  variant="notebookPrimary"
                  size="notebook"
                  className="w-full sm:w-32 sm:shrink-0"
                  data-testid="single-search-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      <span className="truncate">{t("search.searching")}</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t("search.searchBtn")}</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-[hsl(var(--notebook-muted-ink))]">
                {t("search.inputHint")}{" "}
                <kbd className="rounded border border-[hsl(var(--notebook-border)/0.82)] bg-[hsl(var(--notebook-surface-raised))] px-1.5 py-0.5 text-xs text-[hsl(var(--notebook-muted-ink))]">/</kbd>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--notebook-ink))]">
                {t("search.batchInputLabel")}
              </label>
              <textarea
                value={batchCas}
                onChange={(e) => onSetBatchCas(e.target.value)}
                placeholder={t("search.batchPlaceholder")}
                className="notebook-field h-40 w-full resize-none rounded-md px-4 py-3 font-mono"
                data-testid="batch-cas-input"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-[hsl(var(--notebook-muted-ink))]">
                  {t("search.batchHint")}
                </p>
                {batchCount > 0 && (
                  <span className={`text-xs font-medium ${batchCount > BATCH_SEARCH_LIMIT ? "text-red-600" : "text-[hsl(var(--notebook-action))]"}`}>
                    {batchCount > BATCH_SEARCH_LIMIT
                      ? t("search.batchOverLimit", { count: batchCount, limit: BATCH_SEARCH_LIMIT })
                      : t("search.batchDetected", { count: batchCount })}
                  </span>
                )}
              </div>
              {hasBatchDiagnostics && (
                <div
                  className="notebook-note mt-3 grid gap-2 rounded-md p-3 text-sm sm:grid-cols-2"
                  data-testid="batch-input-diagnostics"
                  role="status"
                  aria-live="polite"
                >
                  {batchSummary.duplicateCount > 0 && (
                    <p data-testid="batch-duplicate-summary">
                      {t("search.batchDuplicateSummary", {
                        count: batchSummary.duplicateCount,
                      })}
                    </p>
                  )}
                  {batchSummary.invalidCount > 0 && (
                    <p data-testid="batch-invalid-summary">
                      {t("search.batchInvalidSummary", {
                        count: batchSummary.invalidCount,
                        examples: invalidPreview,
                      })}
                    </p>
                  )}
                  {batchSummary.rehyphenatedCount > 0 && (
                    <p data-testid="batch-rehyphenated-summary">
                      {t("search.batchRehyphenatedSummary", {
                        count: batchSummary.rehyphenatedCount,
                        examples: rehyphenatedPreview,
                      })}
                    </p>
                  )}
                </div>
              )}
              {batchSummary?.inputCount > 0 && (
                <div
                  className="notebook-status-card mt-3 rounded-md px-3 py-2 text-sm"
                  data-testid="batch-ready-summary"
                  role="status"
                  aria-live="polite"
                >
                  {t("search.batchReadySummary", {
                    count: batchSummary.acceptedCount,
                    inputCount: batchSummary.inputCount,
                  })}
                </div>
              )}
              {batchCount > BATCH_SEARCH_LIMIT && (
                <div
                  className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-700"
                  role="alert"
                  data-testid="batch-over-limit-alert"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {t("search.batchOverLimitDetail", {
                      count: batchCount,
                      limit: BATCH_SEARCH_LIMIT,
                      excess: batchCount - BATCH_SEARCH_LIMIT,
                    })}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onSearchBatch}
                disabled={
                  loading ||
                  batchCount > BATCH_SEARCH_LIMIT ||
                  (batchSummary?.inputCount > 0 && batchCount === 0)
                }
                variant="notebookPrimary"
                size="notebookWide"
                className="flex-1"
                data-testid="batch-search-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    <span>{t("search.searching")}</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 shrink-0" />
                    <span>{t("search.batchSearchBtn")}</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => onSetBatchCas("")}
                variant="notebookSecondary"
                size="notebookWide"
                data-testid="clear-batch-btn"
              >
                {t("search.clear")}
              </Button>
            </div>

            {/* Batch Progress Bar */}
            {batchProgress && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{t("search.progress")}</span>
                  <span>{batchProgress.current === batchProgress.total ? t("search.progressDone") : t("search.progressProcessing")} ({batchProgress.current}/{batchProgress.total})</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      batchProgress.current === batchProgress.total
                        ? "bg-emerald-500"
                        : "bg-blue-600 progress-bar-animated"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={batchProgress.current}
                    aria-valuemin={0}
                    aria-valuemax={batchProgress.total}
                    aria-valuetext={`${progressPercent}%`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
            data-testid="error-message"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
