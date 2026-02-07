import { useState, useCallback, useEffect } from "react";

const HISTORY_KEY = "ghs_search_history";
const MAX_HISTORY = 50;

export default function useSearchHistory() {
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save successful results to history
  const saveToHistory = useCallback((newResults) => {
    const successfulResults = newResults.filter((r) => r.found);
    if (successfulResults.length === 0) return;

    const timestamp = new Date().toISOString();
    const newHistoryItems = successfulResults.map((r) => ({
      cas_number: r.cas_number,
      name_en: r.name_en,
      name_zh: r.name_zh,
      timestamp,
    }));

    setHistory((prev) => {
      const existingCas = new Set(newHistoryItems.map((h) => h.cas_number));
      const filtered = prev.filter((h) => !existingCas.has(h.cas_number));
      const updated = [...newHistoryItems, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, saveToHistory, clearHistory };
}
