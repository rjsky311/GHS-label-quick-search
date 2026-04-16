import { useCallback, useState } from "react";
import { preparedPresetKey } from "@/utils/preparedSolution";

/**
 * usePreparedPresets — Tier 2 PR-2B.
 *
 * A localStorage-only store of **saved** prepared-solution recipe
 * inputs (`parentCas` + `concentration` + `solvent` + parent name
 * labels). Complementary to `usePreparedRecents` but with a
 * DELIBERATELY MORE RESTRICTIVE shape:
 *
 *   - Presets store ONLY the reusable recipe inputs.
 *   - Presets do NOT store operational fields (preparedBy /
 *     preparedDate / expiryDate). Those are session-like and a
 *     stale preparedDate inherited from a months-old preset would
 *     produce a misleading label.
 *   - Presets carry NO GHS / hazard / classification data. On
 *     reuse, hazards are sourced from the current parent result,
 *     same as everywhere else in this flow.
 *
 * ## Invariants
 *
 *   1. Workflow-only, recipe-only. See above.
 *   2. Dedup + prepend. Same (parentCas, concentration, solvent)
 *      tuple bubbles to the top.
 *   3. Cap. Max 10 entries; oldest falls off.
 *   4. Schema tolerance. Entries without `schemaVersion === 1`
 *      are filtered out on load.
 *   5. Isolation. Distinct localStorage key from favorites /
 *      history / print templates / prepared recents.
 *
 * ## Not in this hook
 *
 *   - No delete-one / clear-all / rename / pin / reorder.
 *     PR-2B is save + read + prefill only; manage UI is out of
 *     scope. If evidence later shows cleanup is actually needed,
 *     it can go in a follow-up without changing the storage shape.
 *   - No backend sync.
 *   - No cross-tab sync (no `storage` event listener).
 */

const PRESETS_KEY = "ghs_prepared_presets";
export const MAX_PREPARED_PRESETS = 10;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && r.schemaVersion === 1);
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list));
  } catch {
    // Swallow — presets are convenience state; in-memory value stays
    // consistent for the session even if the write fails.
  }
}

export default function usePreparedPresets() {
  const [presets, setPresets] = useState(() => loadFromStorage());

  const addPreset = useCallback((record) => {
    if (!record) return;
    // Recipe minimum: parent identity + both required inputs. Without
    // these the preset is not reusable and the dedup key collapses
    // several records into one.
    if (!record.parentCas || !record.concentration || !record.solvent) return;
    const key = preparedPresetKey(record);
    setPresets((prev) => {
      const filtered = prev.filter((r) => preparedPresetKey(r) !== key);
      const next = [record, ...filtered].slice(0, MAX_PREPARED_PRESETS);
      persist(next);
      return next;
    });
  }, []);

  return {
    presets,
    addPreset,
  };
}
