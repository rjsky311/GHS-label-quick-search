import { useEffect, useRef } from "react";
import { X, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClassificationComparisonTable from "@/components/ClassificationComparisonTable";

/**
 * Cross-chemical GHS classification comparison modal.
 *
 * @param {Object} props
 * @param {Array} props.chemicals  — 2-5 ChemicalResult objects
 * @param {Function} props.getEffectiveClassification
 * @param {Function} props.onClose
 */
export default function ComparisonModal({
  chemicals,
  getEffectiveClassification,
  onClose,
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const columns = chemicals.map((chem) => {
    const effective = getEffectiveClassification(chem) || {
      pictograms: chem.ghs_pictograms || [],
      hazard_statements: chem.hazard_statements || [],
      signal_word: chem.signal_word,
      signal_word_zh: chem.signal_word_zh,
    };
    return {
      label: chem.name_en || chem.cas_number,
      sublabel: chem.cas_number,
      classification: effective,
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-start justify-between">
          <div>
            <h2 id="comparison-modal-title" className="text-xl font-bold text-white">
              {t("compare.title")}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {t("compare.subtitle", { count: chemicals.length })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            data-testid="close-comparison-btn"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <ClassificationComparisonTable
            mode="cross-chemical"
            columns={columns}
            selectedIndex={null}
            onSelectClassification={null}
          />
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {t("compare.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
