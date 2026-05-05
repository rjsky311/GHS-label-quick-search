import { useCallback, useEffect, useRef } from "react";
import { Star, X, Copy, LayoutGrid, Lightbulb, Tag, ExternalLink, ShieldCheck, Clock, Database, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import GHSImage from "@/components/GHSImage";
import ClassificationComparisonTable from "@/components/ClassificationComparisonTable";
import { getReferenceLinks } from "@/utils/sdsLinks";
import { formatRelativeTime } from "@/utils/formatDate";
import { hasGhsData } from "@/utils/ghsAvailability";
import AuthoritativeSourceNote from "@/components/AuthoritativeSourceNote";
import { FlaskConical } from "lucide-react";
import {
  getLocalizedNames,
  getLocalizedPictogramName,
  getLocalizedSignalWord,
  getLocalizedStatementText,
} from "@/utils/ghsText";

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
  const { t, i18n } = useTranslation();
  const dialogRef = useRef(null);
  const displayLocale = i18n.language;

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
  const referenceLinks = getReferenceLinks(result);
  const displayNames = getLocalizedNames(result, displayLocale);

  const getReferenceLinkClassName = (linkType) => {
    if (linkType === "sds") {
      return "flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 transition-colors hover:bg-emerald-100";
    }
    if (linkType === "regulatory") {
      return "flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-blue-800 transition-colors hover:bg-blue-100";
    }
    return "flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-2xl outline-none ${
          allClassifications.length > 1 ? "max-w-3xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <h2 id="detail-modal-title" className="text-xl font-semibold text-slate-950">
              {displayNames.primary}
            </h2>
            {displayNames.secondary && (
              <p className="text-slate-500">{displayNames.secondary}</p>
            )}
            <p className="mt-1 flex items-center gap-2 font-mono text-blue-700">
              CAS: {result.cas_number}
              <button
                onClick={() => copyCAS(result.cas_number)}
                className="text-slate-400 transition-colors hover:text-blue-700"
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
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-300 hover:text-amber-500"
              }`}
              title={isFavorited(result.cas_number) ? t("favorites.removeFavorite") : t("favorites.addFavorite")}
            >
              <Star className={`w-6 h-6 ${isFavorited(result.cas_number) ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700"
              data-testid="close-modal-btn"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Custom Classification Note Input */}
          {(result.has_multiple_classifications || result.other_classifications?.length > 0) && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-800">
                <LayoutGrid className="w-4 h-4" /> {t("detail.customSettings")}
              </h3>
              <p className="mb-3 text-xs text-slate-600">
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
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {hasCustomClassification(result.cas_number) && (
                  <button
                    onClick={() => onClearCustomClassification(result.cas_number)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700"
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
              <h3 className="mb-2 text-sm font-medium text-slate-600">
                {t("detail.signalWord")}
              </h3>
              <span
                className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${
                  effective.signal_word === "Danger"
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {getLocalizedSignalWord(effective, displayLocale)}
              </span>
            </div>
          )}

          {/* GHS Classifications */}
          {allClassifications.length > 1 && allClassifications[0].pictograms?.length > 0 ? (
            /* Multiple classifications — comparison table */
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-600">
                {t("detail.ghsClassification")}
                <span className="ml-2 text-blue-700">{t("detail.classificationCount", { count: allClassifications.length })}</span>
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
              <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                <Lightbulb className="h-3 w-3 shrink-0 text-amber-600" /> {t("detail.classificationHint")}
              </p>
            </div>
          ) : allClassifications.length === 1 && allClassifications[0].pictograms?.length > 0 ? (
            /* Single classification — simple pictogram display */
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-600">
                {t("detail.ghsClassification")}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {allClassifications[0].pictograms.map((pic, pIdx) => (
                  <div key={pIdx} className="text-center">
                    <GHSImage
                      code={pic.code}
                      name={getLocalizedPictogramName(pic, displayLocale)}
                      className="w-14 h-14"
                    />
                    <p className="mt-1 text-xs text-slate-500">{pic.code}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Hazard Statements */}
          {effective?.hazard_statements?.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-600">
                {t("detail.hazardStatements")}
                {effective.isCustom && (
                  <span className="ml-2 text-blue-700">{t("detail.customHazardNote")}</span>
                )}
              </h3>
              <div className="space-y-2">
                {effective.hazard_statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    <span className="shrink-0 font-mono font-medium text-red-700">
                      {stmt.code}
                    </span>
                    <span className="text-slate-800">
                      {getLocalizedStatementText(stmt, displayLocale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Precautionary Statements */}
          {effective?.precautionary_statements?.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-600">
                {t("detail.precautionaryStatements")}
              </h3>
              <div className="space-y-2">
                {effective.precautionary_statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    <span className="shrink-0 font-mono font-medium text-blue-700">
                      {stmt.code}
                    </span>
                    <span className="text-slate-800">
                      {getLocalizedStatementText(stmt, displayLocale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference Links */}
          {referenceLinks.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-700" /> {t("sds.section")}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {referenceLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={getReferenceLinkClassName(link.linkType)}
                  >
                    <ExternalLink className="w-4 h-4" /> {link.label}
                  </a>
                ))}
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
              className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>{t("detail.noGhsDataBanner")}</span>
            </div>
          )}

          {/* Data Provenance (v1.8 M1) */}
          {(result.primary_source || result.retrieved_at) && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                <Info className="h-4 w-4 text-slate-500" /> {t("detail.provenance")}
              </h3>
              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                {result.primary_source && (
                  <div className="flex items-start gap-2">
                    <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <div className="flex-1">
                      <span className="mr-2 text-slate-500">{t("detail.provenanceSource")}:</span>
                      <span className="text-slate-800">{result.primary_source}</span>
                      {result.primary_report_count && (
                        <span
                          className="ml-2 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
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
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <div className="flex-1">
                      <span className="mr-2 text-slate-500">{t("detail.provenanceRetrieved")}:</span>
                      <span
                        className="text-slate-800"
                        title={result.retrieved_at}
                        data-testid="provenance-retrieved-at"
                      >
                        {formatRelativeTime(result.retrieved_at)}
                      </span>
                      {result.cache_hit && (
                        <span
                          className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
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
          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
            <button
              onClick={() => onPrintLabel(result)}
              className="flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
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
                className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-800 hover:bg-blue-100"
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
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
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
