import { useEffect, useRef, useState } from "react";
import { X, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Prepare-solution / dilution workflow modal (v1.9 M3 Tier 1).
 *
 * Shown when the user clicks "Prepare solution" inside DetailModal.
 * Takes two required inputs — concentration and solvent — and on
 * submit hands them back to the parent via `onSubmit({concentration,
 * solvent})`. The parent (App.js) then:
 *
 *   1. builds a derived prepared-solution item via
 *      `buildPreparedSolutionItem(parent, formValues)`
 *   2. REPLACES `selectedForLabel` with `[preparedItem]`
 *   3. RESETS `labelQuantities` to `{}`
 *   4. CLOSES DetailModal + this modal, OPENS LabelPrintModal
 *
 * The trust-boundary design choices locked in the plan are carried
 * directly in the UI here:
 *
 *   - no fields for pictograms / H-codes / P-codes / signal word.
 *     The user cannot override GHS classification; only concentration
 *     and solvent. Any impulse to add a "custom hazard" field at this
 *     layer must be resisted.
 *   - the parent-chemical identity is shown read-only at the top so
 *     the user always sees what the derived label will be based on.
 *   - "Continue to print" copy explicitly signals that this is just
 *     a labelling workflow, not a classification engine.
 *
 * @param {Object}   parent    ChemicalResult the user is deriving from
 * @param {Function} onSubmit  ({concentration, solvent}) => void
 * @param {Function} onClose   () => void (called for both Cancel and Esc)
 */
export default function PrepareSolutionModal({ parent, onSubmit, onClose }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const concentrationInputRef = useRef(null);

  const [concentration, setConcentration] = useState("");
  const [solvent, setSolvent] = useState("");

  useEffect(() => {
    // Put focus on the first meaningful input, not the X button.
    concentrationInputRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        // Capture phase + stopImmediatePropagation so the DetailModal
        // that is still mounted underneath does NOT also receive this
        // Escape via its own window keydown listener. Cancel semantics
        // here are "never mind, back to detail" — not "close both".
        // Pointer paths (Cancel button / backdrop / X) already go
        // through onClose directly and don't propagate; this brings
        // the keyboard path in line with them.
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  // Validation is purely "both fields non-empty after trim". We do not
  // attempt to parse "10 %" vs "10%" vs "0.1 N" vs "0.1N": concentration
  // notation varies wildly across disciplines, and the label just prints
  // whatever string the user typed. Making it stricter here would
  // push us into false-safety territory.
  const trimmedConcentration = concentration.trim();
  const trimmedSolvent = solvent.trim();
  const canSubmit = Boolean(trimmedConcentration && trimmedSolvent);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      concentration: trimmedConcentration,
      solvent: trimmedSolvent,
    });
  };

  if (!parent) return null;

  return (
    <div
      className="fixed inset-0 z-[55] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepare-solution-modal-title"
      data-testid="prepare-solution-modal"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h2
                id="prepare-solution-modal-title"
                className="text-xl font-bold text-white"
              >
                {t("prepared.title")}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {t("prepared.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            data-testid="prepare-solution-close-btn"
            aria-label={t("prepared.cancel")}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Read-only parent chemical summary.
              Always visible so the user knows exactly what the derived
              label will inherit from — no ambiguity once the modal
              closes and they're in the print flow. */}
          <div
            className="bg-slate-900/60 border border-slate-700 rounded-lg p-3"
            data-testid="prepare-solution-parent-summary"
          >
            <div className="text-xs text-slate-400 mb-1">
              {t("prepared.parent")}
            </div>
            <div className="font-mono text-amber-400 text-sm">
              {parent.cas_number}
            </div>
            <div className="text-white font-medium">
              {parent.name_en || ""}
            </div>
            {parent.name_zh && (
              <div className="text-slate-400 text-sm">{parent.name_zh}</div>
            )}
          </div>

          <div>
            <label
              htmlFor="prepared-concentration"
              className="block text-sm text-slate-300 mb-1"
            >
              {t("prepared.concentration")}
              <span className="text-red-400 ml-1" aria-hidden>
                *
              </span>
            </label>
            <input
              id="prepared-concentration"
              ref={concentrationInputRef}
              type="text"
              value={concentration}
              onChange={(e) => setConcentration(e.target.value)}
              placeholder={t("prepared.concentrationPlaceholder")}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              data-testid="prepared-concentration-input"
              required
              maxLength={60}
            />
          </div>

          <div>
            <label
              htmlFor="prepared-solvent"
              className="block text-sm text-slate-300 mb-1"
            >
              {t("prepared.solvent")}
              <span className="text-red-400 ml-1" aria-hidden>
                *
              </span>
            </label>
            <input
              id="prepared-solvent"
              type="text"
              value={solvent}
              onChange={(e) => setSolvent(e.target.value)}
              placeholder={t("prepared.solventPlaceholder")}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              data-testid="prepared-solvent-input"
              required
              maxLength={60}
            />
          </div>

          {/* Trust-boundary note.
              Mirrors (but is shorter than) the printed note that PR-B
              renders on the label itself. Important to state the
              boundary BEFORE the user commits — people skim labels but
              read form instructions. */}
          <div
            className="text-xs text-slate-400 bg-blue-900/20 border border-blue-700/40 rounded-lg p-3"
            data-testid="prepare-solution-form-note"
          >
            {t("prepared.formNote")}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
              data-testid="prepare-solution-cancel-btn"
            >
              {t("prepared.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              data-testid="prepare-solution-submit-btn"
            >
              {t("prepared.continueToPrint")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
