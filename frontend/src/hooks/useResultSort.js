import { useState, useMemo, useCallback } from "react";

const SIGNAL_WORD_ORDER = {
  "Danger": 0,
  "Warning": 1,
};

export default function useResultSort(results, getEffectiveClassification) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const requestSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const sortedResults = useMemo(() => {
    if (!sortConfig.key) return results;

    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.key) {
        case "cas_number":
          comparison = (a.cas_number || "").localeCompare(b.cas_number || "");
          break;

        case "name":
          comparison = (a.name_en || "").localeCompare(b.name_en || "");
          break;

        case "signal_word": {
          const getOrder = (r) => {
            if (!r.found) return 3;
            const eff = getEffectiveClassification(r);
            const sw = eff?.signal_word;
            if (sw in SIGNAL_WORD_ORDER) return SIGNAL_WORD_ORDER[sw];
            return 2; // no signal word
          };
          comparison = getOrder(a) - getOrder(b);
          break;
        }

        case "pictogram_count": {
          const getCount = (r) => {
            if (!r.found) return -1;
            const eff = getEffectiveClassification(r);
            return eff?.pictograms?.length || 0;
          };
          comparison = getCount(a) - getCount(b);
          break;
        }

        default:
          break;
      }

      return sortConfig.direction === "desc" ? -comparison : comparison;
    });

    return sorted;
  }, [results, sortConfig, getEffectiveClassification]);

  const resetSort = useCallback(() => {
    setSortConfig({ key: null, direction: "asc" });
  }, []);

  return { sortedResults, sortConfig, requestSort, resetSort };
}
