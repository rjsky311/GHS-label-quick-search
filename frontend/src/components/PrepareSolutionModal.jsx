import { useEffect, useMemo, useRef, useState } from "react";
import { X, FlaskConical, Clock, Bookmark, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatPreparedDisplayName,
  todayDateString,
} from "@/utils/preparedSolution";

function toDayIndex(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
  if (!match) return null;
  const [, year, month, day] = match;
  return Math.floor(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86400000
  );
}

function getRecentExpiryStatus(expiryDate) {
  const expiryIndex = toDayIndex(expiryDate);
  const todayIndex = toDayIndex(todayDateString());
  if (expiryIndex == null || todayIndex == null) return null;

  const daysUntilExpiry = expiryIndex - todayIndex;
  if (daysUntilExpiry < 0) {
    return {
      tone: "expired",
      labelKey: "prepared.expiryExpired",
      chipClass:
        "border border-red-200 bg-red-50 text-red-700",
      cardClass:
        "border-red-200 bg-red-50 hover:border-red-300",
    };
  }
  if (daysUntilExpiry <= 7) {
    return {
      tone: "warning",
      labelKey: "prepared.expiryExpiringSoon",
      chipClass:
        "border border-amber-200 bg-amber-50 text-amber-700",
      cardClass:
        "border-amber-200 bg-amber-50 hover:border-amber-300",
    };
  }
  return null;
}

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
export default function PrepareSolutionModal({
  parent,
  onSubmit,
  onClose,
  recents = [],
  presets = [],
  onSavePreset,
  presetNameValue,
  onPresetNameChange,
}) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const concentrationInputRef = useRef(null);

  const [concentration, setConcentration] = useState("");
  const [solvent, setSolvent] = useState("");
  // Tier 2 PR-1: optional operational metadata. All three are free to
  // be blank; they do not gate submit. Dates use the native HTML5 date
  // input (yyyy-mm-dd). We do not parse them — whatever the user typed
  // is what the label prints, because these are operational identifiers
  // (who / when), not classification data.
  //
  // UX cleanup: `preparedDate` initialises to today (local TZ via
  // `todayDateString`, not UTC). Dogfood pass showed the blank default
  // produced 1–2 extra interactions per label for the common
  // "made-today, labeling-now" path. The user can still clear the
  // input or change the date if needed. `expiryDate` stays blank —
  // there is no sensible default shelf-life.
  const [preparedBy, setPreparedBy] = useState("");
  const [preparedDate, setPreparedDate] = useState(() => todayDateString());
  const [expiryDate, setExpiryDate] = useState("");
  const [localPresetName, setLocalPresetName] = useState("");
  const presetName =
    typeof presetNameValue === "string" ? presetNameValue : localPresetName;
  const setPresetName = (nextValue) => {
    setLocalPresetName(nextValue);
    onPresetNameChange?.(nextValue);
  };

  // Tier 2 PR-2A: parent-scoped recent prepared workflow inputs.
  // Filtered down to THIS parent's CAS so the section only ever shows
  // entries the user could meaningfully reuse for the current chemical.
  // We intentionally do not show a global list here — the trust-boundary
  // plan keeps recents bound to the current parent so there is no way
  // to accidentally "reuse" a concentration/solvent combo against a
  // different chemical's GHS data.
  const parentRecents = useMemo(() => {
    if (!parent || !Array.isArray(recents)) return [];
    return recents.filter(
      (r) => r && r.parentCas && r.parentCas === parent.cas_number
    );
  }, [parent, recents]);

  // Prefill handler: fills the form from a recent entry. We deliberately
  // do NOT auto-submit — the user still reviews and submits through the
  // existing path, which means existing validation + lifecycle + trust-
  // boundary guarantees stay intact. Hazard data is never sourced from
  // the recent record; it continues to come from the current parent
  // result via `buildPreparedSolutionItem`.
  //
  // UX cleanup: date-sensitive fields are NEVER silently carried
  // forward from a recent entry — `preparedDate` resets to today,
  // `expiryDate` resets to blank. The dogfood pass showed that
  // carrying yesterday's `preparedDate` into today's form can silently
  // produce a wrong-dated label, which is unacceptable in a safety
  // workflow. `preparedBy` is still carried (same operator is a
  // reasonable assumption) and `concentration` / `solvent` still
  // carry (that is the whole point of reusing a recent).
  const handlePrefillFromRecent = (recent) => {
    setConcentration(recent.concentration || "");
    setSolvent(recent.solvent || "");
    setPreparedBy(recent.preparedBy || "");
    setPreparedDate(todayDateString());
    setExpiryDate("");
    setPresetName("");
    // Send focus back to the concentration input so the user can still
    // tweak and submit with keyboard flow intact.
    concentrationInputRef.current?.focus();
  };

  // Tier 2 PR-2B: parent-scoped saved presets. Same filtering pattern
  // as recents so there is never any cross-parent reuse: a preset
  // stored against one chemical cannot pre-fill a different chemical's
  // form, which is the core trust-boundary property for this surface.
  const parentPresets = useMemo(() => {
    if (!parent || !Array.isArray(presets)) return [];
    return presets.filter(
      (p) => p && p.parentCas && p.parentCas === parent.cas_number
    );
  }, [parent, presets]);

  // Tier 2 PR-2B: preset prefill is deliberately MORE RESTRICTIVE than
  // recent prefill. We only restore the two stable recipe inputs and
  // clear the operational fields so no stale session metadata rides
  // along. UX cleanup: `preparedDate` now resets to TODAY rather than
  // blank, matching the on-mount default — the user is still forced
  // to consciously set / confirm the date, but the most common answer
  // ("today") is already filled in. `preparedBy` and `expiryDate`
  // stay blank.
  const handlePrefillFromPreset = (preset) => {
    setConcentration(preset.concentration || "");
    setSolvent(preset.solvent || "");
    setPreparedBy("");
    setPreparedDate(todayDateString());
    setExpiryDate("");
    setPresetName(preset.name || "");
    concentrationInputRef.current?.focus();
  };

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
    // Operational fields are passed through as-is. Any blank-string →
    // null normalisation happens inside buildPreparedSolutionItem;
    // keeping it there means a single source of truth and lets other
    // (future) callers of the helper get the same shape.
    onSubmit({
      concentration: trimmedConcentration,
      solvent: trimmedSolvent,
      preparedBy: preparedBy.trim(),
      preparedDate: preparedDate.trim(),
      expiryDate: expiryDate.trim(),
    });
  };

  // Tier 2 PR-2B: "Save as preset" handler. Triggered by a non-submit
  // button in the bottom action row. Requires the same `canSubmit`
  // gate as submit, because a preset with empty concentration/solvent
  // would be useless. This deliberately does NOT open the label
  // modal, touch selection, or reset quantities — it is a side-channel
  // save, not a workflow advance.
  const handleSavePresetClick = () => {
    if (!canSubmit) return;
    if (typeof onSavePreset !== "function") return;
    onSavePreset({
      concentration: trimmedConcentration,
      solvent: trimmedSolvent,
      presetName: presetName.trim(),
    });
  };

  if (!parent) return null;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepare-solution-modal-title"
      data-testid="prepare-solution-modal"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-6 w-6 shrink-0 text-blue-700" />
            <div>
              <h2
                id="prepare-solution-modal-title"
                className="text-xl font-semibold text-slate-950"
              >
                {t("prepared.title")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("prepared.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
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
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
            data-testid="prepare-solution-parent-summary"
          >
            <div className="mb-1 text-xs text-slate-500">
              {t("prepared.parent")}
            </div>
            <div className="font-mono text-sm text-blue-700">
              {parent.cas_number}
            </div>
            <div className="font-medium text-slate-950">
              {parent.name_en || ""}
            </div>
            {parent.name_zh && (
              <div className="text-sm text-slate-500">{parent.name_zh}</div>
            )}
          </div>

          {/* Tier 2 PR-2B: Saved presets (parent-scoped).
              Shown above Recent so presets — which the user explicitly
              curated — take visual precedence over auto-captured
              recents. Clicking a preset prefills ONLY concentration
              and solvent, and CLEARS the operational fields so no
              stale preparedDate / expiryDate slips onto a fresh
              label. See handlePrefillFromPreset. */}
          {parentPresets.length > 0 && (
            <div
              className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3"
              data-testid="prepare-solution-preset-section"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <Bookmark className="h-3.5 w-3.5 text-blue-700" />
                  <span>{t("prepared.presetHeading")}</span>
                </div>
                <p className="text-xs text-blue-700">
                  {t("prepared.presetHint")}
                </p>
              </div>
              <ul
                className="space-y-1"
                data-testid="prepare-solution-preset-list"
              >
                {parentPresets.map((p, idx) => {
                  // Tier 2 PR-3: prefer the derived display name
                  // ("10% Ethanol in Water") when we have enough info,
                  // otherwise fall back to the Tier 1 concentration/
                  // solvent meta string so edge cases (missing parent
                  // name) still read cleanly.
                  const display = formatPreparedDisplayName(p);
                  return (
                    <li key={`${p.createdAt || "noTs"}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => handlePrefillFromPreset(p)}
                        className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                        data-testid={`prepare-solution-preset-item-${idx}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                              <span data-testid={`prepare-solution-preset-badge-${idx}`}>
                                {t("prepared.presetBadge")}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-950">
                              {p.name ||
                                display ||
                                t("prepared.labelMeta", {
                                  concentration: p.concentration || "",
                                  solvent: p.solvent || "",
                                })}
                            </div>
                          </div>
                        </div>
                        {p.name && display && p.name !== display && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {display}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Tier 2 PR-2A: Recent prepared (parent-scoped).
              Only shown when the current parent has at least one
              matching recent record. Clicking an entry prefills the
              form; the user still has to submit. Hazard data is never
              sourced from here — see handlePrefillFromRecent. */}
          {parentRecents.length > 0 && (
            <div
              className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3"
              data-testid="prepare-solution-recent-section"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <Clock className="h-3.5 w-3.5 text-blue-700" />
                  <span>{t("prepared.recentHeading")}</span>
                </div>
                <p className="text-xs text-blue-700">
                  {t("prepared.recentHint")}
                </p>
              </div>
              <ul className="space-y-1" data-testid="prepare-solution-recent-list">
                {parentRecents.map((r, idx) => {
                  // Tier 2 PR-3: derived display name with Tier 1
                  // fallback, same pattern as presets. Operational
                  // fields still render on the second line so the
                  // user can see who/when at a glance without needing
                  // to click-to-prefill.
                  const display = formatPreparedDisplayName(r);
                  const expiryStatus = getRecentExpiryStatus(r.expiryDate);
                  return (
                    <li key={`${r.createdAt || "noTs"}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => handlePrefillFromRecent(r)}
                        className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                          expiryStatus?.cardClass ||
                          "border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                        }`}
                        data-testid={`prepare-solution-recent-item-${idx}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                              <span data-testid={`prepare-solution-recent-badge-${idx}`}>
                                {t("prepared.recentBadge")}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-950">
                              {display ||
                                t("prepared.labelMeta", {
                                  concentration: r.concentration || "",
                                  solvent: r.solvent || "",
                                })}
                            </div>
                          </div>
                          {expiryStatus && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${expiryStatus.chipClass}`}
                              data-testid={`prepare-solution-recent-expiry-status-${idx}`}
                            >
                              {t(expiryStatus.labelKey)}
                            </span>
                          )}
                        </div>
                        {(r.preparedBy || r.preparedDate || r.expiryDate) && (
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                            {r.preparedBy && (
                              <span>
                                {t("prepared.preparedByShort")}: {r.preparedBy}
                              </span>
                            )}
                            {r.preparedDate && (
                              <span>
                                {t("prepared.preparedDateShort")}: {r.preparedDate}
                              </span>
                            )}
                            {r.expiryDate && (
                              <span>
                                {t("prepared.expiryDateShort")}: {r.expiryDate}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <label
              htmlFor="prepared-concentration"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {t("prepared.concentration")}
              <span className="ml-1 text-red-600" aria-hidden>
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
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              data-testid="prepared-concentration-input"
              required
              maxLength={60}
            />
          </div>

          <div>
            <label
              htmlFor="prepared-solvent"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {t("prepared.solvent")}
              <span className="ml-1 text-red-600" aria-hidden>
                *
              </span>
            </label>
            <input
              id="prepared-solvent"
              type="text"
              value={solvent}
              onChange={(e) => setSolvent(e.target.value)}
              placeholder={t("prepared.solventPlaceholder")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              data-testid="prepared-solvent-input"
              required
              maxLength={60}
            />
          </div>

          {/* Tier 2 PR-1: Operational metadata section.
              Clearly separated from the required hazard-adjacent inputs
              above, and labelled as user-entered operational info so the
              user is never nudged to believe these are derived from GHS
              data. All three are optional; they never block submit. */}
          <div
            className="space-y-4 border-t border-slate-200 pt-4"
            data-testid="prepare-solution-operational-section"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {t("prepared.operationalHeading")}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {t("prepared.operationalSubheading")}
              </p>
            </div>

            <div>
              <label
                htmlFor="prepared-prepared-by"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t("prepared.preparedBy")}
              </label>
              <input
                id="prepared-prepared-by"
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder={t("prepared.preparedByPlaceholder")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                data-testid="prepared-prepared-by-input"
                maxLength={60}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prepared-prepared-date"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("prepared.preparedDate")}
                </label>
                <input
                  id="prepared-prepared-date"
                  type="date"
                  value={preparedDate}
                  onChange={(e) => setPreparedDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  data-testid="prepared-prepared-date-input"
                />
              </div>

              <div>
                <label
                  htmlFor="prepared-expiry-date"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("prepared.expiryDate")}
                </label>
                <input
                  id="prepared-expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  data-testid="prepared-expiry-date-input"
                />
              </div>
            </div>
          </div>

          {typeof onSavePreset === "function" && (
            <div
              className="border-t border-slate-200 pt-4"
              data-testid="prepare-solution-preset-name-section"
            >
              <label
                htmlFor="prepared-preset-name"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t("prepared.presetName")}
              </label>
              <input
                id="prepared-preset-name"
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value.slice(0, 60))}
                placeholder={t("prepared.presetNamePlaceholder")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                data-testid="prepared-preset-name-input"
                maxLength={60}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {t("prepared.presetNameHint")}
              </p>
            </div>
          )}

          {/* Trust-boundary note.
              Mirrors (but is shorter than) the printed note that PR-B
              renders on the label itself. Important to state the
              boundary BEFORE the user commits — people skim labels but
              read form instructions. */}
          <div
            className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"
            data-testid="prepare-solution-form-note"
          >
            {t("prepared.formNote")}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
              data-testid="prepare-solution-cancel-btn"
            >
              {t("prepared.cancel")}
            </button>
            {/* Tier 2 PR-2B: Save-as-preset is a non-submit action.
                Same enable gate as the primary submit (both require
                valid required inputs), but styled as a secondary
                button so it cannot be mistaken for "print now". */}
            {typeof onSavePreset === "function" && (
              <button
                type="button"
                onClick={handleSavePresetClick}
                disabled={!canSubmit}
                className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="prepare-solution-save-preset-btn"
              >
                <Save className="w-4 h-4" /> {t("prepared.saveAsPreset")}
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
