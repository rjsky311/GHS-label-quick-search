import { useCallback, useEffect, useState } from "react";
import {
  buildPrintJobRecord,
  mergeRecentPrints,
  normalizePrintJob,
} from "@/utils/printStorage";
import {
  fetchWorkspaceDocument,
  saveWorkspaceDocument,
} from "@/utils/workspaceDocuments";
import {
  readJsonStorage,
  writeJsonStorage,
} from "@/utils/localStorageJson";

const RECENT_PRINTS_KEY = "ghs_recent_print_jobs";
export const MAX_RECENT_PRINTS = 10;

function loadFromStorage() {
  const parsed = readJsonStorage(RECENT_PRINTS_KEY, [], {
    validate: Array.isArray,
  });
  return parsed.map(normalizePrintJob).filter(Boolean);
}

function persist(list) {
  writeJsonStorage(RECENT_PRINTS_KEY, list);
}

export default function usePrintRecents() {
  const [recentPrints, setRecentPrints] = useState(() => loadFromStorage());

  useEffect(() => {
    let cancelled = false;
    const localSnapshot = loadFromStorage();

    async function syncFromBackend() {
      try {
        const remote = await fetchWorkspaceDocument("print_recents");
        const remotePayload = Array.isArray(remote?.payload)
          ? remote.payload.map(normalizePrintJob).filter(Boolean)
          : [];

        if (remotePayload.length > 0) {
          if (!cancelled) {
            setRecentPrints(remotePayload);
            persist(remotePayload);
          }
          return;
        }

        if (localSnapshot.length > 0) {
          await saveWorkspaceDocument("print_recents", localSnapshot);
        }
      } catch {
        // Local fallback remains authoritative when backend sync fails.
      }
    }

    syncFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  const addRecentPrint = useCallback((payload) => {
    const record = buildPrintJobRecord(payload);
    if (!record) return null;

    setRecentPrints((prev) => {
      const next = mergeRecentPrints(prev, record, MAX_RECENT_PRINTS);
      persist(next);
      void saveWorkspaceDocument("print_recents", next).catch(() => {});
      return next;
    });

    return record;
  }, []);

  const clearRecentPrints = useCallback(() => {
    setRecentPrints([]);
    persist([]);
    void saveWorkspaceDocument("print_recents", []).catch(() => {});
  }, []);

  return {
    recentPrints,
    addRecentPrint,
    clearRecentPrints,
  };
}
