/**
 * Prepared-solution derived-item helper (v1.9 M3 Tier 1).
 *
 * Produces a pure-frontend object that represents a dilution /
 * working solution derived from a single parent chemical. The output
 * is fed straight into `selectedForLabel` and then into `printLabels()`,
 * where PR-B's rendering path picks up the `isPreparedSolution` flag
 * and annotates the label with a prepared-solution badge, the
 * concentration / solvent metadata, and a trust disclaimer.
 *
 * ## Design contract (M3 Tier 1, locked)
 *
 *   1. Single parent chemical only. No mixtures / multi-solute.
 *   2. Only two user inputs: `concentration` and `solvent`.
 *   3. GHS data is COPIED FROM THE PARENT AS-IS — pictograms,
 *      hazard_statements, precautionary_statements, signal_word,
 *      other_classifications all passed through. Never edited,
 *      never merged, never recomputed.
 *   4. Parent's `cas_number` is preserved. We do NOT synthesize a
 *      fake CAS for the mixture. Downstream modules that key off
 *      CAS continue to work; M3 Tier 1 is single-item per print
 *      session, so no collision handling is needed (enforced at the
 *      App level by replacing `selectedForLabel` with exactly
 *      `[preparedItem]` on submit).
 *   5. Prepared item MUST NOT be routed into `saveToHistory`,
 *      `toggleFavorite`, or any comparison flow. Enforced at the
 *      App level by simply not calling those paths with prepared
 *      items.
 *
 * ## Output shape
 *
 *     {
 *       ...parentChemicalAllFieldsPreserved,
 *       isPreparedSolution: true,
 *       preparedSolution: {
 *         concentration: "10% (v/v)",
 *         solvent:       "Water",
 *         parentCas:     "64-17-5",
 *         parentNameEn:  "Ethanol",
 *         parentNameZh:  "乙醇",
 *       }
 *     }
 *
 * The parent fields being carried verbatim is what makes PR-B's
 * print path "just work": `getEffectiveForPrint()` and the four
 * template renderers read `ghs_pictograms` / `hazard_statements` /
 * `precautionary_statements` / `signal_word*` from the item
 * directly, same as a normal chemical.
 */

/**
 * Build a prepared-solution derived item from a parent chemical
 * result and a form's concentration + solvent values.
 *
 * @param {Object} parent     A `ChemicalResult`-shaped object from
 *                            the backend / App state. Must have
 *                            `found: true` and `cas_number` at
 *                            minimum; missing GHS arrays are
 *                            tolerated (defaulted to []).
 * @param {Object} formValues `{ concentration, solvent }` —
 *                            trimmed by the form before reaching
 *                            this helper, but we trim again
 *                            defensively.
 * @returns {Object|null}     Derived prepared item, or null if the
 *                            inputs are invalid (no parent, missing
 *                            concentration, or missing solvent).
 *
 * Null-return contract: the caller (App.js) should treat null as
 * "do not open the label modal". Form-level validation in
 * PrepareSolutionModal prevents this from happening under normal
 * use; this is a defensive last line.
 */
export function buildPreparedSolutionItem(parent, formValues) {
  if (!parent || !parent.found) return null;
  const concentration = (formValues?.concentration || "").trim();
  const solvent = (formValues?.solvent || "").trim();
  if (!concentration || !solvent) return null;

  return {
    // Pass every parent field through verbatim. Using spread rather
    // than an explicit whitelist so future ChemicalResult fields
    // (e.g. provenance, P-codes already landed) automatically flow
    // through without a helper change.
    ...parent,
    // Mark as prepared — checked by print helpers and by App-level
    // cleanup logic that wipes selection when a prepared item is
    // present on modal close.
    isPreparedSolution: true,
    // Metadata bundle. parentCas / parentNameEn / parentNameZh are
    // snapshotted here so UI surfaces (LabelPrintModal's selected
    // list, eventually the print template) can show "derived from
    // X" without having to reach back into the result arrays.
    preparedSolution: {
      concentration,
      solvent,
      parentCas: parent.cas_number,
      parentNameEn: parent.name_en || null,
      parentNameZh: parent.name_zh || null,
    },
  };
}

/**
 * Predicate: is this item a prepared solution?
 *
 * Useful for App-level cleanup ("if any selected item is a prepared
 * solution, wipe selection on modal close") and for future surfaces
 * that want to branch on prepared-vs-pure.
 */
export function isPreparedSolutionItem(item) {
  return Boolean(item && item.isPreparedSolution);
}

/**
 * Predicate: does the current selection contain any prepared item?
 *
 * In M3 Tier 1 the selection either contains exactly one prepared
 * item (after a Prepare-solution submit) or zero prepared items
 * (normal selection). The helper still handles multi-item defensively
 * so future expansion doesn't need to retrofit the check.
 */
export function selectionHasPreparedItem(selection) {
  if (!Array.isArray(selection)) return false;
  return selection.some(isPreparedSolutionItem);
}
