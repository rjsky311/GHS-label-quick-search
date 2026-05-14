import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Star, CircleDot } from "lucide-react";
import GHSPictogramStrip from "@/components/GHSPictogramStrip";
import {
  getLocalizedPictogramName,
  getLocalizedSignalWord,
  getLocalizedStatementText,
} from "@/utils/ghsText";

/**
 * Shared comparison table for GHS classifications.
 *
 * mode="same-chemical"  — multiple classifications for one chemical (DetailModal)
 * mode="cross-chemical" — one classification per chemical, side-by-side (ComparisonModal)
 *
 * @param {Object} props
 * @param {"same-chemical"|"cross-chemical"} props.mode
 * @param {Array<{label:string, sublabel?:string, classification:Object, index?:number}>} props.columns
 * @param {number|null} props.selectedIndex   — currently selected index (same-chemical only)
 * @param {Function|null} props.onSelectClassification — callback(index) (same-chemical only)
 */
export default function ClassificationComparisonTable({
  mode,
  columns,
  selectedIndex = null,
  onSelectClassification = null,
}) {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.language;
  const isSameChemical = mode === "same-chemical";

  // ── Compute union sets for difference highlighting ──

  const allPictogramCodes = useMemo(() => {
    const codeSet = new Set();
    columns.forEach((col) => {
      (col.classification?.pictograms || []).forEach((p) => codeSet.add(p.code));
    });
    // Sort by GHS number (GHS01 < GHS02 < ...)
    return [...codeSet].sort();
  }, [columns]);

  const allHCodes = useMemo(() => {
    const codeSet = new Set();
    columns.forEach((col) => {
      (col.classification?.hazard_statements || []).forEach((s) => codeSet.add(s.code));
    });
    return [...codeSet].sort();
  }, [columns]);

  const allPCodes = useMemo(() => {
    const codeSet = new Set();
    columns.forEach((col) => {
      (col.classification?.precautionary_statements || []).forEach((s) => codeSet.add(s.code));
    });
    return [...codeSet].sort();
  }, [columns]);

  // Count how many columns contain each H-code (for "unique" marking)
  const hCodePresenceCount = useMemo(() => {
    const counts = {};
    allHCodes.forEach((code) => {
      counts[code] = 0;
      columns.forEach((col) => {
        if ((col.classification?.hazard_statements || []).some((s) => s.code === code)) {
          counts[code]++;
        }
      });
    });
    return counts;
  }, [allHCodes, columns]);

  // Check if signal words differ across columns
  const signalWordsDiffer = useMemo(() => {
    const words = columns.map((col) => col.classification?.signal_word || "");
    return new Set(words).size > 1;
  }, [columns]);

  // ── Helpers ──

  const getColumnPictogramCodes = (col) =>
    new Set((col.classification?.pictograms || []).map((p) => p.code));

  const getColumnHCodes = (col) =>
    new Set((col.classification?.hazard_statements || []).map((s) => s.code));

  const getHStatement = (col, code) =>
    (col.classification?.hazard_statements || []).find((s) => s.code === code);

  const getColumnPCodes = (col) =>
    new Set((col.classification?.precautionary_statements || []).map((s) => s.code));

  const getPStatement = (col, code) =>
    (col.classification?.precautionary_statements || []).find((s) => s.code === code);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white" data-testid="comparison-table">
      <table className="w-full border-collapse text-sm">
        {/* ── Header Row: Column labels ── */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[100px] border-b border-r border-slate-200 bg-slate-50 p-3 text-left font-medium text-slate-500">
              &nbsp;
            </th>
            {columns.map((col, colIdx) => {
              const isSelected = isSameChemical && selectedIndex === col.index;
              return (
                <th
                  key={colIdx}
                  className={`min-w-[160px] border-b border-slate-200 p-3 text-left ${
                    isSelected
                      ? "border-t-2 border-t-blue-600 bg-blue-50"
                      : "bg-white"
                  }`}
                  data-testid={`col-header-${colIdx}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {isSameChemical && (
                        isSelected ? (
                           <Star className="w-4 h-4 text-blue-600 fill-current shrink-0" />
                        ) : (
                          <CircleDot className="w-4 h-4 text-slate-500 shrink-0" />
                        )
                      )}
                      <span className={`font-medium ${isSelected ? "text-blue-800" : "text-slate-900"}`}>
                        {col.label}
                      </span>
                    </div>
                    {col.sublabel && (
                      <span className="text-xs text-blue-700 font-mono">{col.sublabel}</span>
                    )}
                    {isSameChemical && (
                      isSelected ? (
                        <span className="inline-flex w-fit rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          {t("compare.currentBadge")}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClassification?.(col.index);
                          }}
                          className="inline-flex w-fit rounded px-2 py-0.5 text-xs text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-800"
                          data-testid={`set-primary-${colIdx}`}
                        >
                          {t("compare.setAsPrimary")}
                        </button>
                      )
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* ── Row: Pictograms ── */}
          <tr>
            <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-slate-50 p-3 font-medium text-slate-600 align-top">
              {t("compare.rowPictograms")}
            </td>
            {columns.map((col, colIdx) => {
              const colCodes = getColumnPictogramCodes(col);
              const isSelected = isSameChemical && selectedIndex === col.index;
              const presentPictograms = (col.classification?.pictograms || [])
                .filter((pic) => pic?.code && allPictogramCodes.includes(pic.code))
                .sort((left, right) => left.code.localeCompare(right.code));
              const absentCodes = allPictogramCodes.filter(
                (code) => !colCodes.has(code),
              );
              return (
                <td
                  key={colIdx}
                  className={`border-b border-slate-200 p-3 align-top ${
                    isSelected ? "bg-blue-50/70" : ""
                  }`}
                >
                  {allPictogramCodes.length > 0 ? (
                    <div
                      className="max-w-[18rem] space-y-2"
                      data-testid={`comparison-pictograms-${colIdx}`}
                    >
                      <GHSPictogramStrip
                        pictograms={presentPictograms}
                        size="md"
                        variant={isSelected ? "selected" : "comparison"}
                        markerTitle={col.label}
                        getName={(pic) =>
                          getLocalizedPictogramName(pic, displayLocale)
                        }
                        showCodes
                      />
                      {presentPictograms.map((pic) => (
                        <span
                          key={`present-${pic.code}`}
                          data-testid={`present-${pic.code}-${colIdx}`}
                          className="sr-only"
                        >
                          {pic.code}
                        </span>
                      ))}
                      {absentCodes.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] leading-none text-slate-500">
                          <span>{t("compare.absent")}</span>
                          {absentCodes.map((code) => (
                            <span
                              key={code}
                              data-testid={`absent-${code}-${colIdx}`}
                              className="rounded border border-dashed border-slate-300 bg-slate-50 px-1.5 py-1 font-mono text-slate-500"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">{t("compare.noPictograms")}</span>
                  )}
                </td>
              );
            })}
          </tr>

          {/* ── Row: Signal Word ── */}
          <tr>
            <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-slate-50 p-3 font-medium text-slate-600 align-middle">
              {t("compare.rowSignalWord")}
            </td>
            {columns.map((col, colIdx) => {
              const sw = col.classification?.signal_word;
              const isSelected = isSameChemical && selectedIndex === col.index;
              const isDanger = sw === "Danger";
              const isWarning = sw === "Warning";
              return (
                <td
                  key={colIdx}
                  className={`border-b border-slate-200 p-3 align-middle ${
                    isSelected ? "bg-blue-50/70" : ""
                  } ${signalWordsDiffer && sw ? (isDanger ? "bg-red-50" : "bg-amber-50") : ""}`}
                >
                  {sw ? (
                    <span
                      className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                        isDanger
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : isWarning
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "text-slate-700"
                      }`}
                      data-testid={`signal-word-${colIdx}`}
                    >
                      {getLocalizedSignalWord(col.classification, displayLocale)}
                    </span>
                  ) : (
                    <span className="text-slate-500">{t("compare.noSignalWord")}</span>
                  )}
                </td>
              );
            })}
          </tr>

          {/* ── Row: Hazard Statements ── */}
          <tr>
            <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-slate-50 p-3 font-medium text-slate-600 align-top">
              {t("compare.rowHazards")}
            </td>
            {columns.map((col, colIdx) => {
              const colHCodes = getColumnHCodes(col);
              const isSelected = isSameChemical && selectedIndex === col.index;
              return (
                <td
                  key={colIdx}
                  className={`border-b border-slate-200 p-3 align-top ${
                    isSelected ? "bg-blue-50/70" : ""
                  }`}
                >
                  {colHCodes.size > 0 ? (
                    <div className="space-y-1.5">
                      {allHCodes.map((code) => {
                        if (!colHCodes.has(code)) return null;
                        const stmt = getHStatement(col, code);
                        const isUnique = hCodePresenceCount[code] === 1;
                        return (
                          <div
                            key={code}
                            className={`flex gap-2 items-start text-xs rounded px-2 py-1 ${
                              isUnique
                                ? "border-l-2 border-l-blue-600 bg-blue-50"
                                : "bg-slate-50"
                            }`}
                            data-testid={isUnique ? `unique-${code}-${colIdx}` : undefined}
                          >
                            <span className="text-blue-700 font-mono font-medium shrink-0">
                              {code}
                            </span>
                            <span className="text-slate-700">
                              {getLocalizedStatementText(stmt, displayLocale)}
                            </span>
                            {isUnique && (
                              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                                {t("compare.uniqueToThis")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-500">{t("compare.noHazards")}</span>
                  )}
                </td>
              );
            })}
          </tr>

          {/* ── Row: Precautionary Statements ── */}
          {allPCodes.length > 0 && (
            <tr>
              <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-slate-50 p-3 font-medium text-slate-600 align-top">
                {t("compare.rowPrecautions")}
              </td>
              {columns.map((col, colIdx) => {
                const colPCodes = getColumnPCodes(col);
                const isSelected = isSameChemical && selectedIndex === col.index;
                return (
                  <td
                    key={colIdx}
                    className={`border-b border-slate-200 p-3 align-top ${
                      isSelected ? "bg-blue-50/70" : ""
                    }`}
                  >
                    {colPCodes.size > 0 ? (
                      <div className="space-y-1">
                        {allPCodes.map((code) => {
                          if (!colPCodes.has(code)) return null;
                          const stmt = getPStatement(col, code);
                          return (
                            <div
                              key={code}
                              className="flex gap-2 items-start text-xs rounded bg-slate-50 px-2 py-1"
                            >
                              <span className="text-blue-700 font-mono font-medium shrink-0">
                                {code}
                              </span>
                              <span className="text-slate-700">
                                {getLocalizedStatementText(stmt, displayLocale)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-500">{t("compare.noPrecautions")}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          )}

          {/* ── Row: Source (same-chemical only) ── */}
          {isSameChemical && (
            <tr>
              <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 p-3 font-medium text-slate-600 align-top">
                {t("compare.rowSource")}
              </td>
              {columns.map((col, colIdx) => {
                const source = col.classification?.source;
                const isSelected = isSameChemical && selectedIndex === col.index;
                return (
                  <td
                    key={colIdx}
                    className={`border-slate-200 p-3 align-top ${
                      isSelected ? "bg-blue-50/70" : ""
                    }`}
                  >
                    {source ? (
                      <p className="text-xs text-slate-500 line-clamp-2" title={source}>
                        {source}
                      </p>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
