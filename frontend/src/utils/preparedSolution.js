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
 *         // required (Tier 1):
 *         concentration: "10% (v/v)",
 *         solvent:       "Water",
 *         parentCas:     "64-17-5",
 *         parentNameEn:  "Ethanol",
 *         parentNameZh:  "乙醇",
 *         // optional operational metadata (Tier 2 PR-1, all user-
 *         // entered, not derived; null when blank):
 *         preparedBy:    "A. Chen",
 *         preparedDate:  "2026-04-16",
 *         expiryDate:    "2026-10-16",
 *       }
 *     }
 *
 * The parent fields being carried verbatim is what makes PR-B's
 * print path "just work": `getEffectiveForPrint()` and the four
 * template renderers read `ghs_pictograms` / `hazard_statements` /
 * `precautionary_statements` / `signal_word*` from the item
 * directly, same as a normal chemical.
 *
 * ## Operational metadata (Tier 2 PR-1)
 *
 * `preparedBy`, `preparedDate`, `expiryDate` are **optional**. They
 * are user-entered strings — this helper does NOT parse or validate
 * dates beyond trim + empty-string-to-null normalisation. The label
 * prints whatever the user typed. These are operational identifiers
 * for lab workflow, NOT hazard / classification data; downstream
 * rendering must keep that framing (copy on form and label makes it
 * explicit).
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
 * @param {Object} formValues `{ concentration, solvent, preparedBy?,
 *                            preparedDate?, expiryDate? }` — trimmed
 *                            by the form before reaching this helper,
 *                            but we trim again defensively. Optional
 *                            operational fields default to empty and
 *                            are normalised to null on the output
 *                            when blank.
 * @returns {Object|null}     Derived prepared item, or null if the
 *                            required inputs are invalid (no parent,
 *                            missing concentration, or missing
 *                            solvent). Optional operational fields
 *                            being blank NEVER blocks the build.
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

  // Tier 2 PR-1: optional operational metadata. Trim, then normalise
  // blank → null so downstream print / UI branches can use a simple
  // truthy check without worrying about whitespace strings slipping
  // through as "present".
  const normaliseOptional = (v) => {
    const trimmed = (v || "").trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const preparedBy = normaliseOptional(formValues?.preparedBy);
  const preparedDate = normaliseOptional(formValues?.preparedDate);
  const expiryDate = normaliseOptional(formValues?.expiryDate);

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
      // Tier 2 PR-1 operational metadata — always present on the
      // object (so consumers can destructure without undefined
      // checks), but null when the user left the field blank.
      preparedBy,
      preparedDate,
      expiryDate,
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
 * Tier 2 PR-2A: build the "recent prepared" record shape from a
 * prepared item. Captures ONLY workflow inputs (parent identity +
 * the user-entered fields) — never any GHS / hazard / classification
 * data. On reuse, hazard data is sourced from the current parent
 * result at that time, not from this stored snapshot.
 *
 * Stable record shape, versioned with `schemaVersion: 1` so future
 * migrations can filter or transform entries.
 *
 * @param {Object} preparedItem  Output of `buildPreparedSolutionItem`.
 * @returns {Object|null}        Recent record, or null if the input
 *                               is not a valid prepared item.
 */
export function buildRecentRecord(preparedItem) {
  if (!isPreparedSolutionItem(preparedItem)) return null;
  const meta = preparedItem.preparedSolution || {};
  if (!meta.concentration || !meta.solvent) return null;
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    // parent identity — enough to scope "recents for THIS parent"
    // and to label a recent-list entry without touching GHS fields.
    parentCas: meta.parentCas || preparedItem.cas_number || null,
    parentNameEn: meta.parentNameEn || preparedItem.name_en || null,
    parentNameZh: meta.parentNameZh || preparedItem.name_zh || null,
    // workflow inputs (Tier 1 required + Tier 2 PR-1 optional)
    concentration: meta.concentration,
    solvent: meta.solvent,
    preparedBy: meta.preparedBy || null,
    preparedDate: meta.preparedDate || null,
    expiryDate: meta.expiryDate || null,
  };
}

/**
 * Tier 2 PR-2A: dedup key for recent records.
 *
 * Two recents are considered "the same" when their workflow inputs
 * match exactly (parent CAS + both required fields + all three
 * operational fields). Creation time is intentionally excluded —
 * resubmitting the same solution multiple times should bubble it to
 * the top, not fill the list with near-duplicates.
 *
 * Blanks are represented as the empty string so the resulting key
 * is stable regardless of whether the caller uses null or "" for an
 * unset optional field.
 */
export function preparedRecentKey(record) {
  if (!record) return "";
  return [
    record.parentCas || "",
    record.concentration || "",
    record.solvent || "",
    record.preparedBy || "",
    record.preparedDate || "",
    record.expiryDate || "",
  ].join("|");
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
