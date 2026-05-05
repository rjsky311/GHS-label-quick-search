import { Search, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { BATCH_SEARCH_LIMIT } from "@/constants/ghs";

export default function SearchSection({
  activeTab,
  singleCas,
  batchCas,
  loading,
  error,
  batchCount,
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
    <div className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => onSetActiveTab("single")}
          className={`inline-flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === "single"
              ? "border-b-2 border-blue-700 bg-blue-50 text-blue-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`}
          data-testid="single-search-tab"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>{t("search.singleTab")}</span>
        </button>
        <button
          onClick={() => onSetActiveTab("batch")}
          className={`inline-flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === "batch"
              ? "border-b-2 border-blue-700 bg-blue-50 text-blue-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          }`}
          data-testid="batch-search-tab"
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          <span>{t("search.batchTab")}</span>
        </button>
      </div>

      <div className="p-6">
        {activeTab === "single" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("search.inputLabel")}
              </label>
              <div className="flex gap-3">
                <SearchAutocomplete
                  value={singleCas}
                  onChange={onSetSingleCas}
                  onSearch={onSearchSingle}
                  history={history}
                  favorites={favorites}
                  searchInputRef={searchInputRef}
                  loading={loading}
                />
                <button
                  onClick={() => onSearchSingle()}
                  disabled={loading}
                  className="inline-flex w-28 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-32"
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
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t("search.inputHint")}{" "}
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600">/</kbd>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("search.batchInputLabel")}
              </label>
              <textarea
                value={batchCas}
                onChange={(e) => onSetBatchCas(e.target.value)}
                placeholder={t("search.batchPlaceholder")}
                className="h-40 w-full resize-none rounded-md border border-slate-300 bg-white px-4 py-3 font-mono text-slate-950 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                data-testid="batch-cas-input"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500">
                  {t("search.batchHint")}
                </p>
                {batchCount > 0 && (
                  <span className={`text-xs font-medium ${batchCount > BATCH_SEARCH_LIMIT ? "text-red-600" : "text-blue-700"}`}>
                    {batchCount > BATCH_SEARCH_LIMIT
                      ? t("search.batchOverLimit", { count: batchCount, limit: BATCH_SEARCH_LIMIT })
                      : t("search.batchDetected", { count: batchCount })}
                  </span>
                )}
              </div>
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
              <button
                onClick={onSearchBatch}
                disabled={loading || batchCount > BATCH_SEARCH_LIMIT}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
              </button>
              <button
                onClick={() => onSetBatchCas("")}
                className="rounded-md border border-slate-300 bg-white px-6 py-3 text-slate-700 transition-colors hover:bg-slate-50"
                data-testid="clear-batch-btn"
              >
                {t("search.clear")}
              </button>
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
