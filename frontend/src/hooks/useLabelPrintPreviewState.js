import { useMemo } from "react";
import {
  BATCH_PRINT_REPRESENTATIVE,
  buildBatchPrintableItems,
} from "@/utils/printBatchPlanner";

export default function useLabelPrintPreviewState({
  batchPreviewItemIndex,
  batchPreviewRepresentative,
  batchPrintPlan,
  batchSelectedPrintItems,
  canPrintBatchSelectedScope,
  effectiveLabelConfig,
  hasBatchPrintPlan,
  labelQuantities,
  selectedForLabel,
}) {
  const activeBatchPreviewItem = useMemo(() => {
    if (!hasBatchPrintPlan) return null;

    return (
      batchPrintPlan.items.find((item) => item.index === batchPreviewItemIndex) ||
      batchPrintPlan.items.find(
        (item) =>
          item.index ===
          batchPrintPlan.representatives[batchPreviewRepresentative]?.index,
      ) ||
      batchPrintPlan.items.find(
        (item) =>
          item.index ===
          batchPrintPlan.representatives[BATCH_PRINT_REPRESENTATIVE.FIRST]?.index,
      ) ||
      null
    );
  }, [
    batchPreviewItemIndex,
    batchPreviewRepresentative,
    batchPrintPlan,
    hasBatchPrintPlan,
  ]);

  const activeBatchPreviewPrintItems = useMemo(
    () =>
      activeBatchPreviewItem
        ? buildBatchPrintableItems(
            { items: [activeBatchPreviewItem] },
            { includeReducedPurpose: true, includeContinuation: true },
          )
        : [],
    [activeBatchPreviewItem],
  );

  const previewSourceItems = useMemo(
    () =>
      activeBatchPreviewItem
        ? activeBatchPreviewPrintItems.length
          ? activeBatchPreviewPrintItems
          : [activeBatchPreviewItem.chemical]
        : selectedForLabel,
    [activeBatchPreviewItem, activeBatchPreviewPrintItems, selectedForLabel],
  );

  const previewLabelConfig = useMemo(
    () =>
      activeBatchPreviewPrintItems[0]?.__printLayoutOverride
        ? {
            ...effectiveLabelConfig,
            ...activeBatchPreviewPrintItems[0].__printLayoutOverride,
          }
        : effectiveLabelConfig,
    [activeBatchPreviewPrintItems, effectiveLabelConfig],
  );

  const previewLabelQuantities = useMemo(
    () =>
      activeBatchPreviewItem
        ? {
            [activeBatchPreviewItem.cas ||
            activeBatchPreviewItem.chemical?.cas_number ||
            "preview"]: 1,
          }
        : labelQuantities,
    [activeBatchPreviewItem, labelQuantities],
  );

  const sheetPreviewItems = canPrintBatchSelectedScope
    ? batchSelectedPrintItems
    : selectedForLabel;
  const sheetPreviewQuantities = useMemo(
    () =>
      canPrintBatchSelectedScope
        ? batchSelectedPrintItems.reduce((acc, chemical) => {
            acc[chemical.cas_number] = labelQuantities?.[chemical.cas_number] || 1;
            return acc;
          }, {})
        : labelQuantities,
    [
      batchSelectedPrintItems,
      canPrintBatchSelectedScope,
      labelQuantities,
    ],
  );

  return {
    activeBatchPreviewItem,
    activeBatchPreviewPrintItems,
    previewLabelConfig,
    previewLabelQuantities,
    previewSourceItems,
    sheetPreviewItems,
    sheetPreviewQuantities,
  };
}
