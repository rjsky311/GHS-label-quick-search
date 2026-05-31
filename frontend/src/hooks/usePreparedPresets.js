import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizePreparedPresetRecord,
  preparedPresetKey,
} from "@/utils/preparedSolution";
import {
  fetchWorkspaceDocument,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";
import {
  readJsonStorage,
  writeJsonStorage,
} from "@/utils/localStorageJson";

/**
 * usePreparedPresets — Tier 2 PR-2B.
 *
 * A local-first, backend-synced store of **saved** prepared-solution
 * recipe inputs (`parentCas` + `concentration` + `solvent` + parent
 * name labels). Complementary to `usePreparedRecents` but with a
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
 *   - No cross-tab sync (no `storage` event listener).
 */

const PRESETS_KEY = "ghs_prepared_presets";
export const MAX_PREPARED_PRESETS = 10;

function loadFromStorage() {
  const parsed = readJsonStorage(PRESETS_KEY, [], {
    validate: Array.isArray,
  });
  return parsed.map(normalizePreparedPresetRecord).filter(Boolean);
}

function persist(list) {
  writeJsonStorage(PRESETS_KEY, list);
}

export default function usePreparedPresets() {
  const [presets, setPresets] = useState(() => loadFromStorage());
  const presetsRef = useRef(presets);

  useEffect(() => {
    presetsRef.current = presets;
  }, [presets]);

  useEffect(() => {
    let cancelled = false;
    const localSnapshot = loadFromStorage();

    async function syncFromBackend() {
      try {
        const remote = await fetchWorkspaceDocument("prepared_presets");
        const remotePayload = Array.isArray(remote?.payload)
          ? remote.payload.map(normalizePreparedPresetRecord).filter(Boolean)
          : [];

        if (remotePayload.length > 0) {
          if (!cancelled) {
            setPresets(remotePayload);
            persist(remotePayload);
          }
          return;
        }

        if (localSnapshot.length > 0) {
          await saveWorkspaceDocument("prepared_presets", localSnapshot);
        }
      } catch {
        // Local fallback stays in place when backend persistence is unavailable.
      }
    }

    syncFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  const addPreset = useCallback((record) => {
    const normalized = normalizePreparedPresetRecord(record);
    if (!normalized) {
      return { saved: false, deduped: false, reason: "invalid" };
    }
    // Recipe minimum: parent identity + both required inputs. Without
    // these the preset is not reusable and the dedup key collapses
    // several records into one.
    const key = preparedPresetKey(normalized);
    const previous = presetsRef.current;
    const filtered = previous.filter((r) => preparedPresetKey(r) !== key);
    const deduped = filtered.length !== previous.length;
    const next = [normalized, ...filtered].slice(0, MAX_PREPARED_PRESETS);

    presetsRef.current = next;
    setPresets(next);
    persist(next);
    void saveWorkspaceDocument("prepared_presets", next).catch(() => {});

    return {
      saved: true,
      deduped,
      reason: deduped ? "updated" : "created",
      record: normalized,
    };
  }, []);

  return {
    presets,
    addPreset,
  };
}
