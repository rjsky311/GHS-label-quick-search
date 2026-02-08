import { useState } from "react";

export default function useLabelSelection() {
  const [selectedForLabel, setSelectedForLabel] = useState([]);

  const toggleSelectForLabel = (chemical) => {
    setSelectedForLabel((prev) => {
      const exists = prev.find((c) => c.cas_number === chemical.cas_number);
      if (exists) {
        return prev.filter((c) => c.cas_number !== chemical.cas_number);
      } else {
        return [...prev, chemical];
      }
    });
  };

  const isSelectedForLabel = (cas_number) => {
    return selectedForLabel.some((c) => c.cas_number === cas_number);
  };

  const selectAllForLabel = (results) => {
    const validResults = results.filter((r) => r.found);
    setSelectedForLabel(validResults);
  };

  const clearLabelSelection = () => {
    setSelectedForLabel([]);
  };

  return {
    selectedForLabel,
    setSelectedForLabel,
    toggleSelectForLabel,
    isSelectedForLabel,
    selectAllForLabel,
    clearLabelSelection,
  };
}
