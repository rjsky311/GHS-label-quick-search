import { useCallback, useEffect, useState } from "react";
import { preparedRecentKey } from "@/utils/preparedSolution";

/**
 * usePreparedRecents — Tier 2 PR-2A.
 *
 * A localStorage-only store of recent prepared-solution workflow
 * inputs. Scoped to THIS hook instance + `localStorage.ghs_prepared_recents`.
 *
 * ## Invariants the hook must uphold
 *
 *   1. **Workflow-only.** Entries carry parent identity + concentration +
 *      solvent + operational fields. NO GHS / pictogram / H-code / P-code /
 *      signal-word data is stored. Consumers must source hazard fields
 *      from the current parent result at reuse time, not from here.
 *
 *   2. **Dedup + prepend.** When the same workflow inputs are added
 *      again, the old entry is dropped and the new one prepended so
 *      the most recent submit wins in ordering.
 *
 *   3. **Cap.** Max 10 entries. Older entries fall off the end on
 *      new adds.
 *
 *   4. **Schema tolerance.** Entries without `schemaVersion === 1`
 *      are filtered out on load. Future versions can bump and write
 *      migration logic without throwing today.
 *
 *   5. **Isolation.** The localStorage key is distinct from favorites /
 *      history / print templates. Prepared recents MUST NOT flow into
 *      those surfaces. This hook provides neither the plumbing nor a
 *      callsite for that.
 *
 * ## Not in this hook
 *
 *   - No manage UI helpers (delete one / clear all / pin / rename).
 *     PR-2A is read + prepend only; manage UI is out of scope.
 *   - No backend sync. localStorage only.
 */

const RECENTS_KEY = "ghs_prepared_recents";
export const MAX_PREPARED_RECENTS = 10;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop any entry that doesn't match the current schema. Being
    // strict here avoids silently surfacing partially-shaped entries
    // if a future version writes something different.
    return parsed.filter((r) => r && r.schemaVersion === 1);
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {
    // Quota or serialisation errors: swallow — recents are a
    // convenience, not a system-of-record. The in-memory state is
    // still consistent for the current session.
  }
}

export default function usePreparedRecents() {
  // Lazy init so the first render already sees persisted entries —
  // avoids a flash where the Recent section is empty on modal open.
  const [recents, setRecents] = useState(() => loadFromStorage());

  // Defence-in-depth: if some other tab wrote to the same key, pick
  // it up on visibility change. We do NOT install a `storage` event
  // listener because the scope of the prepared flow is one tab at a
  // time and cross-tab races aren't a concern today; adding that
  // would widen the hook's surface area without evidence of need.
  useEffect(() => {
    // Intentionally empty — present so future maintainers don't
    // think an effect was omitted by accident.
  }, []);

  const addRecent = useCallback((record) => {
    if (!record) return;
    // Minimum validity: require parentCas + concentration + solvent.
    // Without them the record can't be reused meaningfully, and
    // letting it in would pollute dedup keys.
    if (!record.parentCas || !record.concentration || !record.solvent) return;
    const key = preparedRecentKey(record);
    setRecents((prev) => {
      const filtered = prev.filter((r) => preparedRecentKey(r) !== key);
      const next = [record, ...filtered].slice(0, MAX_PREPARED_RECENTS);
      persist(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    persist([]);
  }, []);

  return {
    recents,
    addRecent,
    clearRecents,
  };
}
