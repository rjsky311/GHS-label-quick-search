import { useState, useCallback, useEffect } from "react";
import {
  readJsonStorage,
  removeStorageItem,
  writeJsonStorage,
} from "@/utils/localStorageJson";

const HISTORY_KEY = "ghs_search_history";
const MAX_HISTORY = 50;

const normalizeHistoryCas = (value) =>
  typeof value === "string" ? value.trim() : "";

export default function useSearchHistory() {
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(
      readJsonStorage(HISTORY_KEY, [], {
        validate: Array.isArray,
      })
    );
  }, []);

  // Save successful results to history
  const saveToHistory = useCallback((newResults) => {
    const successfulResults = newResults.filter((r) => r.found);
    if (successfulResults.length === 0) return;

    const timestamp = new Date().toISOString();
    const newHistoryItems = successfulResults
      .map((r) => ({
        cas_number: normalizeHistoryCas(r.cas_number),
        name_en: r.name_en,
        name_zh: r.name_zh,
        timestamp,
      }))
      .filter((item) => item.cas_number);
    if (newHistoryItems.length === 0) return;

    setHistory((prev) => {
      const existingCas = new Set(newHistoryItems.map((h) => h.cas_number));
      const filtered = prev.filter((h) => !existingCas.has(h.cas_number));
      const updated = [...newHistoryItems, ...filtered].slice(0, MAX_HISTORY);
      writeJsonStorage(HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    removeStorageItem(HISTORY_KEY);
  }, []);

  return { history, saveToHistory, clearHistory };
}
