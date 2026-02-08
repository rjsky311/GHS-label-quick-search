import { useCallback, useEffect, useRef } from "react";
import { Star, X, Copy, LayoutGrid, Lightbulb, Tag, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import GHSImage from "@/components/GHSImage";
import { getPubChemSDSUrl, getECHASearchUrl } from "@/utils/sdsLinks";

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
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);

  const copyCAS = useCallback((cas) => {
    navigator.clipboard.writeText(cas).then(() => {
      toast.success(t("detail.copyCAS", { cas }));
    });
  }, [t]);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const effective = getEffectiveClassification(result) || {
    pictograms: result.ghs_pictograms || [],
    hazard_statements: result.hazard_statements || [],
    signal_word: result.signal_word,
    signal_word_zh: result.signal_word_zh,
    isCustom: false,
    customIndex: 0,
  };
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
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto outline-none"
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

          {/* Signal Word */}
          {effective?.signal_word && (
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

          {/* All GHS Classifications with Selection */}
          {allClassifications.length > 0 && allClassifications[0].pictograms?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                {t("detail.ghsClassification")}
                {allClassifications.length > 1 && (
                  <span className="text-blue-400 ml-2">{t("detail.classificationCount", { count: allClassifications.length })}</span>
                )}
              </h3>
              <div className="space-y-3">
                {allClassifications.map((cls, clsIdx) => {
                  const isSelected = effective.customIndex === clsIdx;
                  const hasNoPictograms = !cls.pictograms || cls.pictograms.length === 0;
                  if (hasNoPictograms) return null;

                  return (
                    <div
                      key={clsIdx}
                      className={`rounded-xl p-4 border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-900/30 border-purple-500"
                          : "bg-slate-900/50 border-slate-700 hover:border-slate-500"
                      }`}
                      onClick={() => onSetCustomClassification(
                        result.cas_number,
                        clsIdx,
                        customGHSSettings[result.cas_number]?.note || ""
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <span className="text-purple-400 text-lg">★</span>
                          ) : (
                            <span className="text-slate-500 text-lg">○</span>
                          )}
                          <span className={`text-sm font-medium ${isSelected ? "text-purple-300" : "text-slate-400"}`}>
                            {clsIdx === 0 ? t("detail.defaultClass") : t("detail.classN", { n: clsIdx + 1 })}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded">
                              {t("detail.currentSelection")}
                            </span>
                          )}
                        </div>
                        {!isSelected && (
                          <button
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            {t("detail.clickToSelect")}
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        {cls.pictograms?.map((pic, pIdx) => (
                          <div key={pIdx} className="text-center">
                            <GHSImage
                              code={pic.code}
                              name={pic.name_zh}
                              className={`w-14 h-14 ${!isSelected ? "opacity-70" : ""}`}
                            />
                            <p className="text-xs text-slate-400 mt-1">{pic.code}</p>
                          </div>
                        ))}
                      </div>

                      {cls.signal_word_zh && (
                        <p className="text-xs text-slate-400 mt-2">
                          {t("detail.signalWord")}: <span className={cls.signal_word === "Danger" ? "text-red-400" : "text-amber-400"}>{cls.signal_word_zh}</span>
                        </p>
                      )}

                      {cls.source && clsIdx > 0 && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1" title={cls.source}>
                          {cls.source.substring(0, 80)}...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" /> {t("detail.classificationHint")}
              </p>
            </div>
          )}

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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-700 flex flex-wrap gap-3">
            <button
              onClick={() => onPrintLabel(result)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
            >
              <Tag className="w-4 h-4" /> {t("detail.printLabel")}
            </button>
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
