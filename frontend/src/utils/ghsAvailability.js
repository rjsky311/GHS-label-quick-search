/**
 * GHS data availability helpers (v1.8 M2).
 *
 * Two related but distinct questions:
 *
 *   1. `hasGhsData(classification)`
 *      — Does this classification have ANY GHS signal?
 *      — True when at least one of pictograms / hazard_statements /
 *        precautionary_statements / signal_word is populated.
 *      — Drives the "No GHS classification on file" banner / warning.
 *      — Accepts both the `effective` shape returned by
 *        `getEffectiveClassification()` (uses `pictograms`) and the
 *        raw `ChemicalResult` shape (uses `ghs_pictograms`).
 *
 *   2. `hasRenderableGhsVisual(result)`
 *      — Does the raw result have enough structure for the existing
 *        ResultsTable pictogram / other-classifications cell to
 *        draw something useful?
 *      — Narrower than `hasGhsData`: a classification with only
 *        H-codes and a signal word is real GHS data but the
 *        existing visual block has nothing to render for it.
 *
 * Separating the two lets ResultsTable's GHS cell stay on a three
 * branch decision:
 *   - !hasGhsData(effective) → new "no GHS data" warning
 *   - hasGhsData(effective) && !hasRenderableGhsVisual(result) →
 *     preserve the existing `results.noHazard` text (don't regress
 *     to blank)
 *   - hasRenderableGhsVisual(result) → existing pictogram block
 */

export function hasGhsData(classification) {
  if (!classification) return false;
  const pic =
    classification.pictograms || classification.ghs_pictograms || [];
  const haz = classification.hazard_statements || [];
  const pre = classification.precautionary_statements || [];
  const sig = classification.signal_word;
  return pic.length > 0 || haz.length > 0 || pre.length > 0 || Boolean(sig);
}

export function hasRenderableGhsVisual(result) {
  if (!result || !result.found) return false;
  // The existing ResultsTable pictogram block renders ONLY pictograms
  // (plus an expandable list of other_classifications, each of which
  // is also shown by its pictograms). A classification that has
  // H-codes / P-codes / signal word but zero pictograms is real GHS
  // data, but has nothing for THIS cell to draw — it should route to
  // the `results.noHazard` fallback, which is exactly what the third
  // branch of the ResultsTable decision tree is there for.
  //
  // So "renderable" means: there is at least one pictogram somewhere
  // the block would actually display — primary or any alternate.
  const primaryPics = result.ghs_pictograms || [];
  if (primaryPics.length > 0) return true;
  const others = result.other_classifications || [];
  return others.some((cls) => (cls.pictograms || []).length > 0);
}
