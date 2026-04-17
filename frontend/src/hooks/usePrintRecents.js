import { useCallback, useState } from "react";
import {
  buildPrintJobRecord,
  mergeRecentPrints,
  normalizePrintJob,
} from "@/utils/printStorage";

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

  const addRecentPrint = useCallback((payload) => {
    const record = buildPrintJobRecord(payload);
    if (!record) return null;

    setRecentPrints((prev) => {
      const next = mergeRecentPrints(prev, record, MAX_RECENT_PRINTS);
      persist(next);
      return next;
    });

    return record;
  }, []);

  const clearRecentPrints = useCallback(() => {
    setRecentPrints([]);
    persist([]);
  }, []);

  return {
    recentPrints,
    addRecentPrint,
    clearRecentPrints,
  };
}
