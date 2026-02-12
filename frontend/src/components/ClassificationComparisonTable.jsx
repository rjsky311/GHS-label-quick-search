import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Star, CircleDot } from "lucide-react";
import GHSImage from "@/components/GHSImage";

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
  const { t } = useTranslation();
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

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700" data-testid="comparison-table">
      <table className="w-full border-collapse text-sm">
        {/* ── Header Row: Column labels ── */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-800 border-b border-r border-slate-700 p-3 text-left text-slate-400 font-medium min-w-[100px]">
              &nbsp;
            </th>
            {columns.map((col, colIdx) => {
              const isSelected = isSameChemical && selectedIndex === col.index;
              return (
                <th
                  key={colIdx}
                  className={`border-b border-slate-700 p-3 text-left min-w-[160px] ${
                    isSelected
                      ? "bg-purple-900/30 border-t-2 border-t-purple-500"
                      : "bg-slate-900/50"
                  }`}
                  data-testid={`col-header-${colIdx}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {isSameChemical && (
                        isSelected ? (
                          <Star className="w-4 h-4 text-purple-400 fill-current shrink-0" />
                        ) : (
                          <CircleDot className="w-4 h-4 text-slate-500 shrink-0" />
                        )
                      )}
                      <span className={`font-medium ${isSelected ? "text-purple-300" : "text-white"}`}>
                        {col.label}
                      </span>
                    </div>
                    {col.sublabel && (
                      <span className="text-xs text-amber-400 font-mono">{col.sublabel}</span>
                    )}
                    {isSameChemical && (
                      isSelected ? (
                        <span className="inline-flex w-fit px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded">
                          {t("compare.currentBadge")}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClassification?.(col.index);
                          }}
                          className="inline-flex w-fit px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
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
            <td className="sticky left-0 z-10 bg-slate-800 border-r border-b border-slate-700 p-3 text-slate-400 font-medium align-top">
              {t("compare.rowPictograms")}
            </td>
            {columns.map((col, colIdx) => {
              const colCodes = getColumnPictogramCodes(col);
              const isSelected = isSameChemical && selectedIndex === col.index;
              return (
                <td
                  key={colIdx}
                  className={`border-b border-slate-700 p-3 align-top ${
                    isSelected ? "bg-purple-900/20" : ""
                  }`}
                >
                  {allPictogramCodes.length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {allPictogramCodes.map((code) => {
                        if (colCodes.has(code)) {
                          const pic = (col.classification?.pictograms || []).find(
                            (p) => p.code === code
                          );
                          return (
                            <div key={code} className="text-center">
                              <GHSImage
                                code={code}
                                name={pic?.name_zh || pic?.name}
                                className="w-12 h-12"
                              />
                              <p className="text-[10px] text-slate-500 mt-0.5">{code}</p>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={code}
                              className="text-center"
                              data-testid={`absent-${code}-${colIdx}`}
                            >
                              <div className="w-12 h-12 border-2 border-dashed border-slate-600 rounded bg-slate-900/50 flex items-center justify-center">
                                <span className="text-[9px] text-slate-600">{code}</span>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                {t("compare.absent")}
                              </p>
                            </div>
                          );
                        }
                      })}
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
            <td className="sticky left-0 z-10 bg-slate-800 border-r border-b border-slate-700 p-3 text-slate-400 font-medium align-middle">
              {t("compare.rowSignalWord")}
            </td>
            {columns.map((col, colIdx) => {
              const sw = col.classification?.signal_word;
              const swZh = col.classification?.signal_word_zh;
              const isSelected = isSameChemical && selectedIndex === col.index;
              const isDanger = sw === "Danger";
              const isWarning = sw === "Warning";
              return (
                <td
                  key={colIdx}
                  className={`border-b border-slate-700 p-3 align-middle ${
                    isSelected ? "bg-purple-900/20" : ""
                  } ${signalWordsDiffer && sw ? (isDanger ? "bg-red-900/10" : "bg-amber-900/10") : ""}`}
                >
                  {sw ? (
                    <span
                      className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                        isDanger
                          ? "bg-red-500/20 text-red-400 border border-red-500/50"
                          : isWarning
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                          : "text-slate-300"
                      }`}
                      data-testid={`signal-word-${colIdx}`}
                    >
                      {swZh || sw}
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
            <td className="sticky left-0 z-10 bg-slate-800 border-r border-b border-slate-700 p-3 text-slate-400 font-medium align-top">
              {t("compare.rowHazards")}
            </td>
            {columns.map((col, colIdx) => {
              const colHCodes = getColumnHCodes(col);
              const isSelected = isSameChemical && selectedIndex === col.index;
              return (
                <td
                  key={colIdx}
                  className={`border-b border-slate-700 p-3 align-top ${
                    isSelected ? "bg-purple-900/20" : ""
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
                                ? "border-l-2 border-l-blue-500 bg-blue-500/5"
                                : "bg-slate-900/50"
                            }`}
                            data-testid={isUnique ? `unique-${code}-${colIdx}` : undefined}
                          >
                            <span className="text-amber-400 font-mono font-medium shrink-0">
                              {code}
                            </span>
                            <span className="text-slate-300">
                              {stmt?.text_zh || stmt?.text_en || ""}
                            </span>
                            {isUnique && (
                              <span className="shrink-0 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">
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

          {/* ── Row: Source (same-chemical only) ── */}
          {isSameChemical && (
            <tr>
              <td className="sticky left-0 z-10 bg-slate-800 border-r border-slate-700 p-3 text-slate-400 font-medium align-top">
                {t("compare.rowSource")}
              </td>
              {columns.map((col, colIdx) => {
                const source = col.classification?.source;
                const isSelected = isSameChemical && selectedIndex === col.index;
                return (
                  <td
                    key={colIdx}
                    className={`border-slate-700 p-3 align-top ${
                      isSelected ? "bg-purple-900/20" : ""
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
