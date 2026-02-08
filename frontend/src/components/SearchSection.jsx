import { Search, ClipboardList, Loader2, X, AlertTriangle } from "lucide-react";

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
}) {
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
          <Search className="w-4 h-4 mr-2 inline" /> 單一查詢
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
          <ClipboardList className="w-4 h-4 mr-2 inline" /> 批次查詢
        </button>
      </div>

      <div className="p-6">
        {activeTab === "single" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                輸入 CAS 號碼
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={singleCas}
                    onChange={(e) => onSetSingleCas(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearchSingle()}
                    placeholder="例如: 64-17-5"
                    className="w-full px-4 py-3 pr-10 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                    data-testid="single-cas-input"
                  />
                  {singleCas && (
                    <button
                      onClick={() => onSetSingleCas("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={onSearchSingle}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  data-testid="single-search-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> 查詢中...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> 查詢
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                輸入 CAS 號碼、英文名或中文名即可搜尋　<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400">Ctrl+K</kbd>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                批次輸入 CAS 號碼（可從 Excel 複製貼上）
              </label>
              <textarea
                value={batchCas}
                onChange={(e) => onSetBatchCas(e.target.value)}
                placeholder="支援逗號、換行、Tab 分隔&#10;例如:&#10;64-17-5&#10;67-56-1&#10;7732-18-5"
                className="w-full h-40 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono resize-none"
                data-testid="batch-cas-input"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500">
                  支援逗號、換行、Tab 分隔，最多 100 筆
                </p>
                {batchCount > 0 && (
                  <span className={`text-xs font-medium ${batchCount > 100 ? "text-red-400" : "text-amber-400"}`}>
                    已偵測 {batchCount} 個號碼{batchCount > 100 ? " ⚠ 超過上限" : ""}
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
                    <Loader2 className="w-4 h-4 animate-spin" /> 查詢中...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> 批次查詢
                  </>
                )}
              </button>
              <button
                onClick={() => onSetBatchCas("")}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
                data-testid="clear-batch-btn"
              >
                清除
              </button>
            </div>
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
