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

const RECENT_PRINTS_KEY = "ghs_recent_print_jobs";
export const MAX_RECENT_PRINTS = 10;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(RECENT_PRINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizePrintJob).filter(Boolean);
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(RECENT_PRINTS_KEY, JSON.stringify(list));
  } catch {
    // Best-effort convenience state only.
  }
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
