import { Tag, FileSpreadsheet, FileText, Star, X, PenLine, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldCheck, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import GHSImage from "@/components/GHSImage";
import { getPubChemSDSUrl } from "@/utils/sdsLinks";

export default function ResultsTable({
  results,
  totalCount,
  resultFilter,
  onSetResultFilter,
  advancedFilter,
  onSetAdvancedFilter,
  sortConfig,
  onRequestSort,
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
  onOpenComparison,
}) {
  const { t } = useTranslation();

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-500 ml-1 inline" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp className="w-3 h-3 text-amber-400 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 text-amber-400 ml-1 inline" />;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
      {/* Results Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
        <div className="text-white">
          <span className="font-semibold">{t("results.title")}</span>
          <span className="text-slate-400 ml-2">
            {t("results.summary", { total: totalCount, found: results.filter((r) => r.found).length })}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onOpenLabelModal}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            data-testid="print-label-btn"
          >
            <Tag className="w-4 h-4" /> {t("results.printLabel")}
            {selectedForLabel.length > 0 && (
              <span className="bg-purple-800 px-2 py-0.5 rounded-full text-xs">
                {selectedForLabel.length}
              </span>
            )}
          </button>
          {(() => {
            const comparableCount = selectedForLabel.filter(
              (r) => r.found && r.ghs_pictograms?.length > 0
            ).length;
            return comparableCount >= 2 ? (
              <button
                onClick={onOpenComparison}
                disabled={comparableCount > 5}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                data-testid="compare-btn"
                title={
                  comparableCount > 5
                    ? t("compare.maxReached")
                    : t("compare.btnTooltip")
                }
              >
                <LayoutGrid className="w-4 h-4" /> {t("compare.btn")}
                <span className="bg-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {comparableCount}
                </span>
              </button>
            ) : null;
          })()}
          <button
            onClick={onExportToExcel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            data-testid="export-xlsx-btn"
          >
            <FileSpreadsheet className="w-4 h-4" /> {t("results.exportExcel")}
          </button>
          <button
            onClick={onExportToCSV}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            data-testid="export-csv-btn"
          >
            <FileText className="w-4 h-4" /> {t("results.exportCSV")}
          </button>
        </div>
      </div>

      {/* Selection controls */}
      {results.filter((r) => r.found).length > 0 && (
        <div className="px-4 py-2 bg-slate-900/30 border-b border-slate-700 flex items-center gap-4 text-sm flex-wrap">
          <span className="text-slate-400">{t("results.labelSelect")}</span>
          <button
            onClick={onSelectAllForLabel}
            className="text-amber-400 hover:text-amber-300"
          >
            {t("results.selectAll")}
          </button>
          <button
            onClick={onClearLabelSelection}
            className="text-slate-400 hover:text-slate-300"
          >
            {t("results.deselectAll")}
          </button>
          <span className="text-slate-500">
            {t("results.selectedCount", { count: selectedForLabel.length })}
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      {totalCount > 1 && (
        <div className="px-4 py-2 bg-slate-900/20 border-b border-slate-700 flex items-center gap-2 text-sm flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {[
            { value: "all", labelKey: "filter.all" },
            { value: "danger", labelKey: "filter.danger", color: "red" },
            { value: "warning", labelKey: "filter.warning", color: "amber" },
            { value: "none", labelKey: "filter.none", color: "slate" },
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
              {t(f.labelKey)}
            </button>
          ))}
          {/* Advanced Filters */}
          <span className="text-slate-600 mx-1">|</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onSetAdvancedFilter({ ...advancedFilter, minPictograms: advancedFilter.minPictograms === n ? 0 : n })}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                advancedFilter.minPictograms === n
                  ? "bg-blue-500/30 text-blue-300 ring-1 ring-blue-500/50"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("filter.pictogramCount", { count: n })}
            </button>
          ))}
          <div className="relative ml-1">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={advancedFilter.hCodeSearch}
              onChange={(e) => onSetAdvancedFilter({ ...advancedFilter, hCodeSearch: e.target.value })}
              placeholder={t("filter.hCodePlaceholder")}
              className="w-24 pl-6 pr-2 py-1 bg-slate-800 border border-slate-600 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          {(resultFilter !== "all" || advancedFilter.minPictograms > 0 || advancedFilter.hCodeSearch) && (
            <span className="text-slate-500 ml-2">
              {t("filter.showing", { shown: results.length, total: totalCount })}
            </span>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]" data-testid="results-table">
          <caption className="sr-only">{t("results.tableCaption")}</caption>
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                {t("results.colSelect")}
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                {t("results.colFavorite")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-28 cursor-pointer hover:text-white select-none"
                onClick={() => onRequestSort("cas_number")}
                title={t("sort.tooltip")}
              >
                {t("results.colCAS")} <SortIcon columnKey="cas_number" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[200px] cursor-pointer hover:text-white select-none"
                onClick={() => onRequestSort("name")}
                title={t("sort.tooltip")}
              >
                {t("results.colName")} <SortIcon columnKey="name" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-48">
                {t("results.colGHS")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20 cursor-pointer hover:text-white select-none"
                onClick={() => onRequestSort("signal_word")}
                title={t("sort.tooltip")}
              >
                {t("results.colSignalWord")} <SortIcon columnKey="signal_word" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-24">
                {t("results.colAction")}
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
                      aria-label={t("results.selectForLabel", { cas: result.cas_number })}
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
                      title={isFavorited(result.cas_number) ? t("favorites.removeFavorite") : t("favorites.addFavorite")}
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
                        {result.name_en || t("results.loadingName")}
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
                                <span className="text-xs text-purple-400 mr-1" title={t("results.customMarker")}>★</span>
                              ) : (
                                <span className="text-xs text-emerald-400 mr-1" title={t("results.defaultMarker")}>●</span>
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
                                  title={t("results.restoreDefault")}
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
                                  {t("results.otherClassifications", { count: allClassifications.length - 1 })}
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
                                            title={t("detail.setAsMain")}
                                          >
                                            {t("results.setAsPrimary")}
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
                    <span className="text-slate-500">{t("results.noHazard")}</span>
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
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onViewDetail(result)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
                        data-testid={`detail-btn-${idx}`}
                      >
                        {t("results.detail")}
                      </button>
                      {getPubChemSDSUrl(result.cid) && (
                        <a
                          href={getPubChemSDSUrl(result.cid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-200 text-sm rounded transition-colors flex items-center gap-1"
                          title={t("sds.viewSDS")}
                          data-testid={`sds-btn-${idx}`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> {t("sds.viewSDS")}
                        </a>
                      )}
                    </div>
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
