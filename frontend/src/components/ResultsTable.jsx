import { Tag, FileSpreadsheet, FileText, Star, X, PenLine, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search, ShieldCheck, LayoutGrid, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import GHSImage from "@/components/GHSImage";
import { getPubChemSDSUrl } from "@/utils/sdsLinks";
import { hasGhsData, hasRenderableGhsVisual } from "@/utils/ghsAvailability";
import { formatRelativeTime } from "@/utils/formatDate";
import {
  getLocalizedNames,
  getLocalizedPictogramName,
  getLocalizedSignalWord,
} from "@/utils/ghsText";

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
  onPrintAllWithGhs,
  printAllWithGhsCount = 0,
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
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.language;

  // `printAllWithGhsCount` is computed in App.js from the same filtered
  // and sorted subset the table is currently rendering. Don't recompute
  // here — the parent owns the action scope and count together.

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-slate-400" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-blue-700" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-blue-700" />;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="text-slate-950">
          <span className="font-semibold">{t("results.title")}</span>
          <span className="ml-2 text-slate-500">
            {t("results.summary", { total: totalCount, found: results.filter((r) => r.found).length })}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onOpenLabelModal}
            className="flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
            data-testid="print-label-btn"
          >
            <Tag className="w-4 h-4" /> {t("results.printLabel")}
            {selectedForLabel.length > 0 && (
              <span className="rounded-full bg-blue-900 px-2 py-0.5 text-xs">
                {selectedForLabel.length}
              </span>
            )}
          </button>
          {/* Precise shortcut — opens the modal with ONLY visible rows
              that have GHS data (no-GHS rows excluded). */}
          {printAllWithGhsCount > 0 && (
            <button
              onClick={onPrintAllWithGhs}
              className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              data-testid="print-all-with-ghs-btn"
            >
              <Printer className="w-4 h-4" />
              {t("results.printAllWithGhs")}
              <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">
                {printAllWithGhsCount}
              </span>
            </button>
          )}
          {(() => {
            const comparableCount = selectedForLabel.filter(
              (r) => r.found && r.ghs_pictograms?.length > 0
            ).length;
            return comparableCount >= 2 ? (
              <button
                onClick={onOpenComparison}
                disabled={comparableCount > 5}
                className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="compare-btn"
                title={
                  comparableCount > 5
                    ? t("compare.maxReached")
                    : t("compare.btnTooltip")
                }
              >
                <LayoutGrid className="w-4 h-4" /> {t("compare.btn")}
                <span className="rounded-full bg-blue-700 px-2 py-0.5 text-xs text-white">
                  {comparableCount}
                </span>
              </button>
            ) : null;
          })()}
          <button
            onClick={onExportToExcel}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            data-testid="export-xlsx-btn"
          >
            <FileSpreadsheet className="w-4 h-4" /> {t("results.exportExcel")}
          </button>
          <button
            onClick={onExportToCSV}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            data-testid="export-csv-btn"
          >
            <FileText className="w-4 h-4" /> {t("results.exportCSV")}
          </button>
        </div>
      </div>

      {/* Selection controls */}
      {results.filter((r) => r.found).length > 0 && (
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm">
          <span className="text-slate-600">{t("results.labelSelect")}</span>
          <button
            onClick={onSelectAllForLabel}
            className="font-medium text-blue-700 hover:text-blue-900"
          >
            {t("results.selectAll")}
          </button>
          <button
            onClick={onClearLabelSelection}
            className="font-medium text-slate-600 hover:text-slate-900"
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" />
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
                  ? f.color === "red" ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                  : f.color === "amber" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  : "bg-slate-100 text-slate-900 ring-1 ring-slate-300"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
          {/* Advanced Filters */}
          <span className="mx-1 text-slate-300">|</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onSetAdvancedFilter({ ...advancedFilter, minPictograms: advancedFilter.minPictograms === n ? 0 : n })}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                advancedFilter.minPictograms === n
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {t("filter.pictogramCount", { count: n })}
            </button>
          ))}
          <div className="relative ml-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={advancedFilter.hCodeSearch}
              onChange={(e) => onSetAdvancedFilter({ ...advancedFilter, hCodeSearch: e.target.value })}
              placeholder={t("filter.hCodePlaceholder")}
              className="w-24 rounded-full border border-slate-300 bg-white py-1 pl-6 pr-2 text-xs text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {(resultFilter !== "all" || advancedFilter.minPictograms > 0 || advancedFilter.hCodeSearch) && (
            <span className="ml-2 text-slate-500">
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
            <tr className="bg-slate-50">
              <th className="w-12 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colSelect")}
              </th>
              <th className="w-12 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colFavorite")}
              </th>
              <th
                className="w-28 cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
                onClick={() => onRequestSort("cas_number")}
                title={t("sort.tooltip")}
              >
                {t("results.colCAS")} <SortIcon columnKey="cas_number" />
              </th>
              <th
                className="min-w-[200px] cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
                onClick={() => onRequestSort("name")}
                title={t("sort.tooltip")}
              >
                {t("results.colName")} <SortIcon columnKey="name" />
              </th>
              <th className="w-48 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colGHS")}
              </th>
              <th
                className="w-20 cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-950"
                onClick={() => onRequestSort("signal_word")}
                title={t("sort.tooltip")}
              >
                {t("results.colSignalWord")} <SortIcon columnKey="signal_word" />
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                {t("results.colAction")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {results.map((result, idx) => (
              <tr
                key={idx}
                className={`transition-colors hover:bg-blue-50/60 ${
                  !result.found ? "opacity-60" : ""
                } ${isSelectedForLabel(result.cas_number) ? "bg-blue-50" : ""}`}
                data-testid={`result-row-${idx}`}
              >
                <td className="px-2 py-4 text-center">
                  {result.found && (
                    <input
                      type="checkbox"
                      checked={isSelectedForLabel(result.cas_number)}
                      onChange={() => onToggleSelectForLabel(result)}
                      aria-label={t("results.selectForLabel", { cas: result.cas_number })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
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
                          : "text-slate-300 hover:text-amber-500"
                      }`}
                      title={isFavorited(result.cas_number) ? t("favorites.removeFavorite") : t("favorites.addFavorite")}
                      data-testid={`favorite-btn-${idx}`}
                    >
                      <Star className={`w-5 h-5 ${isFavorited(result.cas_number) ? "fill-current" : ""}`} />
                    </button>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="font-mono text-blue-700">
                    {result.cas_number}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {result.found ? (
                    (() => {
                      const displayNames = getLocalizedNames(result, displayLocale);
                      return (
                        <div>
                      <div className="break-words font-medium text-slate-950">
                        {displayNames.primary || t("results.loadingName")}
                      </div>
                      {displayNames.secondary && (
                        <div className="text-sm text-slate-500">
                          {displayNames.secondary}
                        </div>
                      )}
                      {/* Provenance chips (v1.8 M1). Compact, glanceable.
                          Full provenance (timestamp, full source text) lives
                          in the detail modal to keep the results table
                          readable when many rows are shown. */}
                      {(result.primary_source || result.cache_hit) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                          {result.primary_source &&
                            /echa/i.test(result.primary_source) && (
                              <span
                                className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-blue-700"
                                title={result.primary_source}
                                data-testid={`source-badge-echa-${result.cas_number}`}
                              >
                                {t("results.sourceEcha")}
                              </span>
                            )}
                          {result.primary_report_count && (
                            <span
                              className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-slate-600"
                              title={t("detail.provenanceReportCountTooltip", {
                                count: result.primary_report_count,
                              })}
                            >
                              {t("results.reportCountBadge", {
                                count: result.primary_report_count,
                              })}
                            </span>
                          )}
                          {result.cache_hit && (
                            <span
                              className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700"
                              title={
                                result.retrieved_at
                                  ? t("detail.provenanceCacheTooltipWithAge", {
                                      age: formatRelativeTime(result.retrieved_at),
                                    })
                                  : t("detail.provenanceCacheTooltip")
                              }
                            >
                              {t("results.cacheBadge")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                      );
                    })()
                  ) : (
                    <span className="text-red-700">{result.error}</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {(() => {
                    // v1.8 M2 three-branch decision:
                    //   1. not-found → "-"
                    //   2. found but no GHS data anywhere (on effective) → new warning
                    //   3. found with GHS data but nothing for the visual block to draw → existing `noHazard`
                    //   4. found with renderable visual → existing pictogram block (unchanged)
                    if (!result.found) return "-";
                    const effectiveForGhsCheck = getEffectiveClassification(result);
                    if (!hasGhsData(effectiveForGhsCheck)) {
                      return (
                        <div
                          className="space-y-1"
                          data-testid={`no-ghs-data-${result.cas_number}`}
                        >
                          <div className="text-sm text-slate-600">
                            {t("results.noGhsDataAvailable")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t("results.noGhsDataHint")}
                          </div>
                        </div>
                      );
                    }
                    if (!hasRenderableGhsVisual(result)) {
                      return (
                        <span className="text-slate-500">{t("results.noHazard")}</span>
                      );
                    }
                    return (
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
                                <span className="mr-1 text-xs text-blue-700" title={t("results.customMarker")}>{"\u2605"}</span>
                              ) : (
                                <span className="mr-1 text-xs text-emerald-600" title={t("results.defaultMarker")}>{"\u25cf"}</span>
                              )}
                              {effective.pictograms?.map((pic, pIdx) => (
                                <GHSImage
                                  key={pIdx}
                                  code={pic.code}
                                  name={getLocalizedPictogramName(pic, displayLocale)}
                                  className="w-10 h-10"
                                  showTooltip
                                />
                              ))}
                              {effective.isCustom && (
                                <button
                                  onClick={() => onClearCustomClassification(result.cas_number)}
                                  className="ml-2 text-xs text-slate-400 hover:text-red-600"
                                  title={t("results.restoreDefault")}
                                >
                                  <X className="inline h-3 w-3" />
                                </button>
                              )}
                            </div>
                            {effective.note && (
                              <div className="flex items-center gap-1 text-xs text-blue-700"><PenLine className="h-3 w-3" /> {effective.note}</div>
                            )}

                            {/* Other Classifications Toggle */}
                            {allClassifications.length > 1 && (
                              <div>
                                <button
                                  onClick={() => onToggleOtherClassifications(result.cas_number)}
                                  className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                                  aria-expanded={!!expandedOtherClassifications[result.cas_number]}
                                >
                                  <span>{expandedOtherClassifications[result.cas_number] ? '▼' : '▶'}</span>
                                  {t("results.otherClassifications", { count: allClassifications.length - 1 })}
                                </button>

                                {/* Expanded Other Classifications */}
                                {expandedOtherClassifications[result.cas_number] && (
                                  <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-2">
                                    {allClassifications.map((cls, clsIdx) => {
                                      const isSelected = effective.customIndex === clsIdx;
                                      if (isSelected) return null;

                                      return (
                                        <div key={clsIdx} className="group/item flex flex-wrap items-center gap-1">
                                          <span className="mr-1 text-xs text-slate-500">○</span>
                                          {cls.pictograms?.map((pic, pIdx) => (
                                            <GHSImage
                                              key={pIdx}
                                              code={pic.code}
                                              name={getLocalizedPictogramName(
                                                pic,
                                                displayLocale
                                              )}
                                              className="w-8 h-8 opacity-70"
                                            />
                                          ))}
                                          <button
                                            onClick={() => onSetCustomClassification(result.cas_number, clsIdx)}
                                            className="ml-2 text-xs text-blue-700 opacity-0 transition-opacity hover:text-blue-900 group-hover/item:opacity-100"
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
                    );
                  })()}
                </td>
                <td className="px-4 py-4">
                  {result.found ? (
                    (() => {
                      const effective = getEffectiveClassification(result);
                      return effective?.signal_word ? (
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            effective.signal_word === "Danger"
                              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          }`}
                        >
                          {getLocalizedSignalWord(effective, displayLocale)}
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
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        data-testid={`detail-btn-${idx}`}
                      >
                        {t("results.detail")}
                      </button>
                      {getPubChemSDSUrl(result.cid) && (
                        <a
                          href={getPubChemSDSUrl(result.cid)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
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
