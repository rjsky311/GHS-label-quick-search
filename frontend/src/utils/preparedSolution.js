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
 * Tier 2 PR-3: derived display name for a prepared workflow entry.
 *
 * Produces a short human-readable string like `"10% Ethanol in Water"`
 * for use in app-internal surfaces — the LabelPrintModal selected-row
 * title, the Recent / Saved entries inside PrepareSolutionModal. This
 * is a **workflow display helper**, not a canonical chemical identity:
 *
 *   - It is **not** used as a search key.
 *   - It is **not** stored anywhere.
 *   - It is **not** rendered on the printed label (that would cross
 *     into labelling identity territory; scope-locked to in-app use
 *     per the Tier 2 PR-3 contract).
 *   - It does NOT replace the parent CAS / name rendering in any UI
 *     surface — it is always a supplement.
 *
 * Accepts either a prepared item (`isPreparedSolution + preparedSolution`)
 * or a bare record shape (recent / preset). Returns "" when the inputs
 * don't have enough to form a meaningful display string; callers must
 * tolerate "" and fall back to the parent's raw name.
 *
 * @param {Object} input  Either a prepared item or a recent/preset record.
 * @returns {string}      Formatted display name, or "" when unavailable.
 */
export function formatPreparedDisplayName(input) {
  if (!input) return "";
  // Unify the two shapes: prepared items carry their workflow inputs
  // under `preparedSolution`, whereas recents/presets are flat.
  const src =
    input.preparedSolution && typeof input.preparedSolution === "object"
      ? input.preparedSolution
      : input;
  const concentration = (src.concentration || "").trim();
  const solvent = (src.solvent || "").trim();
  if (!concentration || !solvent) return "";
  // Prefer the most specific parent-name label we can find. We look at
  // the record/workflow-shape fields first, then fall back to the
  // prepared item's top-level name fields if present. If nothing is
  // available we still produce a useful "concentration solute in
  // solvent" string by leaving solute out — "10% in Water" is less
  // informative but honest about what we know.
  const parentName =
    src.parentNameEn ||
    src.parentNameZh ||
    input.name_en ||
    input.name_zh ||
    "";
  const parent = parentName.trim();
  if (!parent) return `${concentration} in ${solvent}`;
  return `${concentration} ${parent} in ${solvent}`;
}

/**
 * Tier 2 PR-2B: build a "saved preset" record from the current parent
 * chemical + form values.
 *
 * Presets are the MORE RESTRICTIVE sibling of recent records: they
 * only store the long-stable workflow inputs (parent identity +
 * concentration + solvent). The operational fields (preparedBy /
 * preparedDate / expiryDate) are deliberately NOT stored, because
 * they are session-like identifiers — pre-filling a stored preparedDate
 * from weeks ago would silently produce a misleading label. The user
 * should enter those fresh every time.
 *
 * Called directly from the form state (not from a prepared item) so
 * "Save as preset" does not require a valid prepared item — it is
 * saving the REUSABLE pieces of the recipe, not a specific prepared
 * instance.
 *
 * @param {Object} parent      Parent chemical result (must have
 *                             `cas_number` at minimum).
 * @param {Object} formValues  `{ concentration, solvent }` — trimmed
 *                             defensively here.
 * @returns {Object|null}      Preset record or null when required
 *                             inputs are missing.
 */
export function buildPresetRecord(parent, formValues) {
  if (!parent || !parent.cas_number) return null;
  const concentration = (formValues?.concentration || "").trim();
  const solvent = (formValues?.solvent || "").trim();
  if (!concentration || !solvent) return null;
  const presetName = (formValues?.presetName || "").trim();
  const derivedName =
    presetName ||
    formatPreparedDisplayName({
      concentration,
      solvent,
      parentNameEn: parent.name_en || null,
      parentNameZh: parent.name_zh || null,
    }) ||
    `${concentration} in ${solvent}`;
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    parentCas: parent.cas_number,
    parentNameEn: parent.name_en || null,
    parentNameZh: parent.name_zh || null,
    name: derivedName,
    concentration,
    solvent,
    // NOTE: operational fields (preparedBy / preparedDate / expiryDate)
    // are intentionally NOT in this shape. Do not add them without
    // revisiting the Tier 2 PR-2B trust-boundary contract — the whole
    // reason presets exclude them is to prevent stale session data
    // from leaking onto a new label months later.
  };
}

/**
 * Tier 2 PR-2B: dedup key for saved presets.
 *
 * Presets dedupe on `parentCas | concentration | solvent` only. Two
 * presets with the same recipe inputs collapse regardless of when
 * they were saved.
 */
export function preparedPresetKey(record) {
  if (!record) return "";
  return [
    record.parentCas || "",
    record.concentration || "",
    record.solvent || "",
  ].join("|");
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
 * UX cleanup: today's date as `YYYY-MM-DD`, using LOCAL time (not UTC).
 *
 * Why not `new Date().toISOString().slice(0, 10)`? That returns UTC.
 * For a user in UTC+08 preparing a solution at 09:00 on 2026-04-16
 * local time, `toISOString().slice(0, 10)` returns `"2026-04-15"` —
 * yesterday. For a safety-tool workflow where the printed label
 * carries a prepared-date, an off-by-one-day bug would be quietly
 * wrong. This helper uses `getFullYear/getMonth/getDate`, which
 * always report local-clock components, so the output matches what
 * the user's wall clock says.
 *
 * Output format matches what an HTML5 `<input type="date">` expects
 * as its `value` / emits as its `onChange` payload, so it slots
 * directly into form state.
 */
export function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
