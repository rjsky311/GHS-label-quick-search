export const resultHasUpstreamRetryReview = (batchResultsState = {}) => {
  const reviewActions = Array.isArray(batchResultsState.reviewActions)
    ? batchResultsState.reviewActions
    : [];
  return reviewActions.some((action) => {
    const type = action?.type || "";
    const text = action?.text || "";
    return (
      type === "upstream-error" ||
      /upstream retry|Retry upstream|PubChem|ServerBusy|temporarily unavailable/i.test(
        text,
      )
    );
  });
};

export const resolveBatchSearchGate = ({
  printButtonVisible,
  printableCount,
  batchResultsState,
  allowExternalUpstreamDegradedPass,
}) => {
  if (printButtonVisible) {
    return {
      canContinueToPrintModal: true,
      shouldStopEarly: false,
      ok: true,
      warning: "",
      failure: "",
    };
  }

  if (resultHasUpstreamRetryReview(batchResultsState)) {
    const warning = `no-printable-results:${printableCount}:external-upstream-transient`;
    return {
      canContinueToPrintModal: false,
      shouldStopEarly: true,
      ok: Boolean(allowExternalUpstreamDegradedPass),
      warning,
      failure: allowExternalUpstreamDegradedPass
        ? ""
        : `no-printable-results:${printableCount}:external-upstream-unavailable`,
    };
  }

  return {
    canContinueToPrintModal: false,
    shouldStopEarly: false,
    ok: false,
    warning: "",
    failure: "",
  };
};
