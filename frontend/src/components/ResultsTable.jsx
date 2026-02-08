import { Tag, FileSpreadsheet, FileText, Star, X, PenLine, Filter } from "lucide-react";
import GHSImage from "@/components/GHSImage";

export default function ResultsTable({
  results,
  totalCount,
  resultFilter,
  onSetResultFilter,
  selectedForLabel,
  expandedOtherClassifications,
  onOpenLabelModal,
  onExportToExcel,
  onExportToCSV,
  onSelectAllForLabel,
  onClearLabelSelection,
  onToggleSelectForLabel,
  isSelectedForLabel,
  onToggleFavorite,
  isFavorited,
  getEffectiveClassification,
  onToggleOtherClassifications,
  onSetCustomClassification,
  onClearCustomClassification,
  onViewDetail,
}) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
      {/* Results Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
        <div className="text-white">
          <span className="font-semibold">查詢結果</span>
          <span className="text-slate-400 ml-2">
            共 {totalCount} 筆，成功{" "}
            {results.filter((r) => r.found).length} 筆
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onOpenLabelModal}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            data-testid="print-label-btn"
          >
            <Tag className="w-4 h-4" /> 列印標籤
            {selectedForLabel.length > 0 && (
              <span className="bg-purple-800 px-2 py-0.5 rounded-full text-xs">
                {selectedForLabel.length}
              </span>
            )}
          </button>
          <button
            onClick={onExportToExcel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            data-testid="export-xlsx-btn"
          >
            <FileSpreadsheet className="w-4 h-4" /> 匯出 Excel
          </button>
          <button
            onClick={onExportToCSV}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            data-testid="export-csv-btn"
          >
            <FileText className="w-4 h-4" /> 匯出 CSV
          </button>
        </div>
      </div>

      {/* Selection controls */}
      {results.filter((r) => r.found).length > 0 && (
        <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-700 flex items-center gap-4 text-sm flex-wrap">
          <span className="text-slate-400">標籤列印選擇：</span>
          <button
            onClick={onSelectAllForLabel}
            className="text-amber-400 hover:text-amber-300"
          >
            全選
          </button>
          <button
            onClick={onClearLabelSelection}
            className="text-slate-400 hover:text-slate-300"
          >
            取消全選
          </button>
          <span className="text-slate-500">
            已選 {selectedForLabel.length} 項
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      {totalCount > 1 && (
        <div className="px-4 py-2 bg-slate-900/20 border-b border-slate-700 flex items-center gap-2 text-sm flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {[
            { value: "all", label: "全部" },
            { value: "danger", label: "危險", color: "red" },
            { value: "warning", label: "警告", color: "amber" },
            { value: "none", label: "無危害", color: "slate" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => onSetResultFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                resultFilter === f.value
                  ? f.color === "red" ? "bg-red-500/30 text-red-300 ring-1 ring-red-500/50"
                  : f.color === "amber" ? "bg-amber-500/30 text-amber-300 ring-1 ring-amber-500/50"
                  : "bg-slate-600 text-white ring-1 ring-slate-500"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
          {resultFilter !== "all" && (
            <span className="text-slate-500 ml-2">
              顯示 {results.length}/{totalCount} 筆
            </span>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]" data-testid="results-table">
          <caption className="sr-only">GHS 化學品查詢結果</caption>
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                選擇
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                收藏
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-28">
                CAS No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[200px]">
                名稱
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-48">
                GHS 標示
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20">
                警示語
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-24">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {results.map((result, idx) => (
              <tr
                key={idx}
                className={`hover:bg-slate-700/30 transition-colors ${
                  !result.found ? "opacity-60" : ""
                } ${isSelectedForLabel(result.cas_number) ? "bg-purple-900/20" : ""}`}
                data-testid={`result-row-${idx}`}
              >
                <td className="px-2 py-4 text-center">
                  {result.found && (
                    <input
                      type="checkbox"
                      checked={isSelectedForLabel(result.cas_number)}
                      onChange={() => onToggleSelectForLabel(result)}
                      aria-label={`選擇 ${result.cas_number} 用於列印標籤`}
                      className="w-4 h-4 rounded border-slate-500 text-purple-500 focus:ring-purple-500 bg-slate-700"
                    />
                  )}
                </td>
                <td className="px-2 py-4 text-center">
                  {result.found && (
                    <button
                      onClick={() => onToggleFavorite(result)}
                      className={`transition-colors ${
                        isFavorited(result.cas_number)
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-slate-600 hover:text-amber-400"
                      }`}
                      title={isFavorited(result.cas_number) ? "取消收藏" : "加入收藏"}
                      data-testid={`favorite-btn-${idx}`}
                    >
                      <Star className={`w-5 h-5 ${isFavorited(result.cas_number) ? "fill-current" : ""}`} />
                    </button>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="font-mono text-amber-400">
                    {result.cas_number}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {result.found ? (
                    <div>
                      <div className="text-white font-medium break-words">
                        {result.name_en || "（名稱載入中...）"}
                      </div>
                      {result.name_zh && (
                        <div className="text-slate-400 text-sm">
                          {result.name_zh}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-red-400">{result.error}</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {result.found && (result.ghs_pictograms?.length > 0 || result.other_classifications?.length > 0) ? (
                    <div className="space-y-2">
                      {(() => {
                        const effective = getEffectiveClassification(result);
                        const allClassifications = [
                          {
                            pictograms: result.ghs_pictograms || [],
                            hazard_statements: result.hazard_statements || [],
                            signal_word: result.signal_word,
                            signal_word_zh: result.signal_word_zh,
                          },
                          ...(result.other_classifications || [])
                        ];

                        return (
                          <>
                            <div className="flex gap-1 flex-wrap items-center">
                              {effective.isCustom ? (
                                <span className="text-xs text-purple-400 mr-1" title="您選擇的分類">★</span>
                              ) : (
                                <span className="text-xs text-emerald-400 mr-1" title="主要分類（預設）">●</span>
                              )}
                              {effective.pictograms?.map((pic, pIdx) => (
                                <GHSImage
                                  key={pIdx}
                                  code={pic.code}
                                  name={pic.name_zh}
                                  className="w-10 h-10"
                                  showTooltip
                                />
                              ))}
                              {effective.isCustom && (
                                <button
                                  onClick={() => onClearCustomClassification(result.cas_number)}
                                  className="ml-2 text-xs text-slate-500 hover:text-red-400"
                                  title="恢復預設分類"
                                >
                                  <X className="w-3 h-3 inline" />
                                </button>
                              )}
                            </div>
                            {effective.note && (
                              <div className="text-xs text-purple-300 flex items-center gap-1"><PenLine className="w-3 h-3" /> {effective.note}</div>
                            )}

                            {/* Other Classifications Toggle */}
                            {allClassifications.length > 1 && (
                              <div>
                                <button
                                  onClick={() => onToggleOtherClassifications(result.cas_number)}
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                  aria-expanded={!!expandedOtherClassifications[result.cas_number]}
                                >
                                  <span>{expandedOtherClassifications[result.cas_number] ? '▼' : '▶'}</span>
                                  {allClassifications.length - 1} 種其他分類
                                </button>

                                {/* Expanded Other Classifications */}
                                {expandedOtherClassifications[result.cas_number] && (
                                  <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-600">
                                    {allClassifications.map((cls, clsIdx) => {
                                      const isSelected = effective.customIndex === clsIdx;
                                      if (isSelected) return null;

                                      return (
                                        <div key={clsIdx} className="flex gap-1 flex-wrap items-center group/item">
                                          <span className="text-xs text-slate-500 mr-1">○</span>
                                          {cls.pictograms?.map((pic, pIdx) => (
                                            <GHSImage
                                              key={pIdx}
                                              code={pic.code}
                                              name={pic.name_zh}
                                              className="w-8 h-8 opacity-70"
                                            />
                                          ))}
                                          <button
                                            onClick={() => onSetCustomClassification(result.cas_number, clsIdx)}
                                            className="ml-2 text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                            title="設為我的主要分類"
                                          >
                                            設為主要
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : result.found ? (
                    <span className="text-slate-500">無危害標示</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-4">
                  {result.found ? (
                    (() => {
                      const effective = getEffectiveClassification(result);
                      return effective?.signal_word ? (
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            effective.signal_word === "Danger"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {effective.signal_word_zh || effective.signal_word}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      );
                    })()
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-4">
                  {result.found && (
                    <button
                      onClick={() => onViewDetail(result)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
                      data-testid={`detail-btn-${idx}`}
                    >
                      詳細資訊
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
