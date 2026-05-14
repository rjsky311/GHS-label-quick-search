/**
 * GHS data availability helpers.
 *
 * These helpers keep "no data", "real data without pictograms", and
 * "renderable pictograms" separate. That distinction matters because a
 * chemical can have signal words or H/P statements even when there is no GHS
 * pictogram to draw in the results table.
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
  const primaryPics = result.ghs_pictograms || [];
  if (primaryPics.length > 0) return true;
  const others = result.other_classifications || [];
  return others.some((cls) => (cls.pictograms || []).length > 0);
}
