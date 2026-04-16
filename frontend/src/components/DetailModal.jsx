import { useCallback, useEffect, useRef } from "react";
import { Star, X, Copy, LayoutGrid, Lightbulb, Tag, ExternalLink, ShieldCheck, Clock, Database, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import GHSImage from "@/components/GHSImage";
import ClassificationComparisonTable from "@/components/ClassificationComparisonTable";
import { getPubChemSDSUrl, getECHASearchUrl } from "@/utils/sdsLinks";
import { formatRelativeTime } from "@/utils/formatDate";
import { hasGhsData } from "@/utils/ghsAvailability";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import { FlaskConical } from "lucide-react";

export default function DetailModal({
  result,
  onClose,
  onToggleFavorite,
  isFavorited,
  getEffectiveClassification,
  customGHSSettings,
  onSetCustomClassification,
  hasCustomClassification,
  onClearCustomClassification,
  onPrintLabel,
  onPrepareSolution,
  // When another modal (e.g. PrepareSolutionModal) is stacked on top
  // of this one, the parent passes `suppressed={true}` so this dialog:
  //   - becomes `inert` (nothing inside is focusable / clickable /
  //     announced by screen readers)
  //   - gets `aria-hidden="true"` as a fallback for older AT
  //   - drops `aria-modal` so only the topmost modal is announced
  //     as the active modal dialog
  // This closes the long-standing stacked-aria-modal debt without
  // unmounting DetailModal (which would blow away its focus / scroll
  // state for when the user cancels back to it).
  suppressed = false,
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);

  const copyCAS = useCallback((cas) => {
    navigator.clipboard.writeText(cas).then(() => {
      toast.success(t("detail.copyCAS", { cas }));
    });
  }, [t]);

  useEffect(() => {
    // Don't pull focus or register the Escape handler while a higher
    // modal is stacked on top of us — the stacked modal owns focus +
    // Escape. PR #14 added capture-phase stopImmediatePropagation in
    // PrepareSolutionModal as the first line of defence; this is the
    // structurally cleaner second line.
    if (suppressed) return;
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, suppressed]);

  const effective = getEffectiveClassification(result) || {
    pictograms: result.ghs_pictograms || [],
    hazard_statements: result.hazard_statements || [],
    precautionary_statements: result.precautionary_statements || [],
    signal_word: result.signal_word,
    signal_word_zh: result.signal_word_zh,
    isCustom: false,
    customIndex: 0,
  };
  const allClassifications = [
    {
      pictograms: result.ghs_pictograms || [],
      hazard_statements: result.hazard_statements || [],
      precautionary_statements: result.precautionary_statements || [],
      signal_word: result.signal_word,
      signal_word_zh: result.signal_word_zh,
    },
    ...(result.other_classifications || [])
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={suppressed ? undefined : onClose}
      role="dialog"
      aria-modal={suppressed ? undefined : "true"}
      aria-hidden={suppressed ? "true" : undefined}
      // React 19 supports `inert` as a boolean attribute; passing
      // `true` serializes to `inert=""` on the DOM, `false` omits it.
      // eslint-disable-next-line react/no-unknown-property
      inert={suppressed || undefined}
      aria-labelledby="detail-modal-title"
      data-testid="detail-modal"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`bg-slate-800 rounded-2xl w-full max-h-[90vh] overflow-y-auto outline-none ${
          allClassifications.length > 1 ? "max-w-3xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 flex items-start justify-between">
          <div>
            <h2 id="detail-modal-title" className="text-xl font-bold text-white">
              {result.name_en}
            </h2>
            {result.name_zh && (
              <p className="text-slate-400">{result.name_zh}</p>
            )}
            <p className="text-amber-400 font-mono mt-1 flex items-center gap-2">
              CAS: {result.cas_number}
              <button
                onClick={() => copyCAS(result.cas_number)}
                className="text-slate-500 hover:text-amber-400 transition-colors"
                title={t("detail.copyCAS", { cas: result.cas_number })}
              >
                <Copy className="w-4 h-4" />
              </button>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(result)}
              className={`transition-colors ${
                isFavorited(result.cas_number)
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-slate-600 hover:text-amber-400"
              }`}
              title={isFavorited(result.cas_number) ? t("favorites.removeFavorite") : t("favorites.addFavorite")}
            >
              <Star className={`w-6 h-6 ${isFavorited(result.cas_number) ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
              data-testid="close-modal-btn"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Custom Classification Note Input */}
          {(result.has_multiple_classifications || result.other_classifications?.length > 0) && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> {t("detail.customSettings")}
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                {t("detail.customSettingsHint")}
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={t("detail.customNotePlaceholder")}
                  value={customGHSSettings[result.cas_number]?.note || ""}
                  onChange={(e) => {
                    const currentIndex = customGHSSettings[result.cas_number]?.selectedIndex || 0;
                    onSetCustomClassification(result.cas_number, currentIndex, e.target.value);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
                {hasCustomClassification(result.cas_number) && (
                  <button
                    onClick={() => onClearCustomClassification(result.cas_number)}
                    className="px-3 py-2 bg-slate-700 hover:bg-red-600/50 text-slate-300 text-sm rounded-lg transition-colors"
                    title={t("detail.restoreDefault")}
                  >
                    {t("detail.restoreDefault")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Signal Word — only for single classification */}
          {allClassifications.length <= 1 && effective?.signal_word && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">
                {t("detail.signalWord")}
              </h3>
              <span
                className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${
                  effective.signal_word === "Danger"
                    ? "bg-red-500/20 text-red-400 border border-red-500/50"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                }`}
              >
                {effective.signal_word_zh || effective.signal_word}
              </span>
            </div>
          )}

          {/* GHS Classifications */}
          {allClassifications.length > 1 && allClassifications[0].pictograms?.length > 0 ? (
            /* Multiple classifications — comparison table */
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                {t("detail.ghsClassification")}
                <span className="text-blue-400 ml-2">{t("detail.classificationCount", { count: allClassifications.length })}</span>
              </h3>
              <ClassificationComparisonTable
                mode="same-chemical"
                columns={allClassifications.map((cls, idx) => ({
                  label: idx === 0 ? t("detail.defaultClass") : t("detail.classN", { n: idx + 1 }),
                  classification: cls,
                  index: idx,
                }))}
                selectedIndex={effective.customIndex}
                onSelectClassification={(idx) =>
                  onSetCustomClassification(
                    result.cas_number,
                    idx,
                    customGHSSettings[result.cas_number]?.note || ""
                  )
                }
              />
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" /> {t("detail.classificationHint")}
              </p>
            </div>
          ) : allClassifications.length === 1 && allClassifications[0].pictograms?.length > 0 ? (
            /* Single classification — simple pictogram display */
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                {t("detail.ghsClassification")}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {allClassifications[0].pictograms.map((pic, pIdx) => (
                  <div key={pIdx} className="text-center">
                    <GHSImage
                      code={pic.code}
                      name={pic.name_zh}
                      className="w-14 h-14"
                    />
                    <p className="text-xs text-slate-400 mt-1">{pic.code}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Hazard Statements */}
          {effective?.hazard_statements?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                {t("detail.hazardStatements")}
                {effective.isCustom && <span className="text-purple-400 ml-2">{t("detail.customHazardNote")}</span>}
              </h3>
              <div className="space-y-2">
                {effective.hazard_statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 rounded-lg p-3 flex gap-3"
                  >
                    <span className="text-amber-400 font-mono font-medium shrink-0">
                      {stmt.code}
                    </span>
                    <span className="text-white">{stmt.text_zh}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Precautionary Statements */}
          {effective?.precautionary_statements?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                {t("detail.precautionaryStatements")}
              </h3>
              <div className="space-y-2">
                {effective.precautionary_statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 rounded-lg p-3 flex gap-3"
                  >
                    <span className="text-blue-400 font-mono font-medium shrink-0">
                      {stmt.code}
                    </span>
                    <span className="text-white">{stmt.text_zh}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SDS Links */}
          {(getPubChemSDSUrl(result.cid) || getECHASearchUrl(result.cas_number)) && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> {t("sds.section")}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {getPubChemSDSUrl(result.cid) && (
                  <a
                    href={getPubChemSDSUrl(result.cid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-600/40 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> {t("sds.pubchem")}
                  </a>
                )}
                {getECHASearchUrl(result.cas_number) && (
                  <a
                    href={getECHASearchUrl(result.cas_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-700/40 hover:bg-blue-600/60 text-blue-200 border border-blue-600/40 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> {t("sds.echa")}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* v1.8 M2: "no GHS data available" banner.
              Surfaced ABOVE Data Provenance so the trust frame is set
              before users see source / timestamp — otherwise those
              signals might suggest completeness when there's nothing
              to be complete about. Follows the effective classification
              so custom overrides flip the banner on/off correctly. */}
          {result.found && !hasGhsData(effective) && (
            <div
              role="note"
              data-testid="detail-no-ghs-data-banner"
              className="p-3 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-300 text-sm flex items-start gap-2"
            >
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{t("detail.noGhsDataBanner")}</span>
            </div>
          )}

          {/* Data Provenance (v1.8 M1) */}
          {(result.primary_source || result.retrieved_at) && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" /> {t("detail.provenance")}
              </h3>
              <div className="bg-slate-900 rounded-lg p-3 space-y-2 text-sm">
                {result.primary_source && (
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-slate-500 mr-2">{t("detail.provenanceSource")}:</span>
                      <span className="text-slate-200">{result.primary_source}</span>
                      {result.primary_report_count && (
                        <span
                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-xs"
                          title={t("detail.provenanceReportCountTooltip", {
                            count: result.primary_report_count,
                          })}
                          data-testid="provenance-report-count"
                        >
                          {t("detail.provenanceReportCount", {
                            count: result.primary_report_count,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {result.retrieved_at && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-slate-500 mr-2">{t("detail.provenanceRetrieved")}:</span>
                      <span
                        className="text-slate-200"
                        title={result.retrieved_at}
                        data-testid="provenance-retrieved-at"
                      >
                        {formatRelativeTime(result.retrieved_at)}
                      </span>
                      {result.cache_hit && (
                        <span
                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300 border border-amber-700/40 text-xs"
                          title={
                            result.retrieved_at
                              ? t("detail.provenanceCacheTooltipWithAge", {
                                  age: formatRelativeTime(result.retrieved_at),
                                })
                              : t("detail.provenanceCacheTooltip")
                          }
                          data-testid="provenance-cache-badge"
                        >
                          {t("detail.provenanceCache")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* v1.8 M1: trust-boundary disclaimer — SDS / supplier / regulation is authoritative */}
          {result.found && <AuthoritativeSourceNote variant="detail" />}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-700 flex flex-wrap gap-3">
            <button
              onClick={() => onPrintLabel(result)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
            >
              <Tag className="w-4 h-4" /> {t("detail.printLabel")}
            </button>
            {/* v1.9 M3 Tier 1: Prepare-solution entry.
                Only shown for found chemicals — prepared items rely on
                parent's GHS arrays being populated to copy over, and
                for a not-found result there's nothing to copy. */}
            {result.found && onPrepareSolution && (
              <button
                onClick={() => onPrepareSolution(result)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                data-testid="prepare-solution-btn"
              >
                <FlaskConical className="w-4 h-4" /> {t("detail.prepareSolution")}
              </button>
            )}
            {result.cid && (
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${result.cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> {t("detail.viewPubChem")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
