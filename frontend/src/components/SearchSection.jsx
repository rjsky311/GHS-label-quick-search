import { Search, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import SearchAutocomplete from "@/components/SearchAutocomplete";

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

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden mb-6">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => onSetActiveTab("single")}
          className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === "single"
              ? "bg-slate-700/50 text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white hover:bg-slate-700/30"
          }`}
          data-testid="single-search-tab"
        >
          <Search className="w-4 h-4 mr-2 inline" /> {t("search.singleTab")}
        </button>
        <button
          onClick={() => onSetActiveTab("batch")}
          className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
            activeTab === "batch"
              ? "bg-slate-700/50 text-amber-400 border-b-2 border-amber-400"
              : "text-slate-400 hover:text-white hover:bg-slate-700/30"
          }`}
          data-testid="batch-search-tab"
        >
          <ClipboardList className="w-4 h-4 mr-2 inline" /> {t("search.batchTab")}
        </button>
      </div>

      <div className="p-6">
        {activeTab === "single" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
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
                  onClick={onSearchSingle}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  data-testid="single-search-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {t("search.searching")}
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> {t("search.searchBtn")}
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {t("search.inputHint")}　<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400">Ctrl+K</kbd>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {t("search.batchInputLabel")}
              </label>
              <textarea
                value={batchCas}
                onChange={(e) => onSetBatchCas(e.target.value)}
                placeholder={t("search.batchPlaceholder")}
                className="w-full h-40 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono resize-none"
                data-testid="batch-cas-input"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500">
                  {t("search.batchHint")}
                </p>
                {batchCount > 0 && (
                  <span className={`text-xs font-medium ${batchCount > 100 ? "text-red-400" : "text-amber-400"}`}>
                    {batchCount > 100
                      ? t("search.batchOverLimit", { count: batchCount })
                      : t("search.batchDetected", { count: batchCount })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onSearchBatch}
                disabled={loading || batchCount > 100}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="batch-search-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("search.searching")}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> {t("search.batchSearchBtn")}
                  </>
                )}
              </button>
              <button
                onClick={() => onSetBatchCas("")}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
                data-testid="clear-batch-btn"
              >
                {t("search.clear")}
              </button>
            </div>

            {/* Batch Progress Bar */}
            {batchProgress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{t("search.progress")}</span>
                  <span>{batchProgress.current === batchProgress.total ? t("search.progressDone") : t("search.progressProcessing")} ({batchProgress.current}/{batchProgress.total})</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      batchProgress.current === batchProgress.total
                        ? "bg-green-500"
                        : "bg-amber-500 progress-bar-animated"
                    }`}
                    style={{ width: batchProgress.current === batchProgress.total ? "100%" : "85%" }}
                    role="progressbar"
                    aria-valuenow={batchProgress.current}
                    aria-valuemin={0}
                    aria-valuemax={batchProgress.total}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2"
            data-testid="error-message"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
