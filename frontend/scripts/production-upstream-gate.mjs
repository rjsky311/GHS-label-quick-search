export const EXTERNAL_UPSTREAM_STATUS = "external-upstream-unavailable";

export const isBoundedExternalUpstreamUiState = ({
  rowText = "",
  upstreamBannerCount = 0,
  upstreamRowStateCount = 0,
} = {}) => {
  const text = String(rowText || "");
  return (
    Number(upstreamBannerCount) > 0 &&
    Number(upstreamRowStateCount) > 0 &&
    /PubChem|GHS classification fetch failed/i.test(text) &&
    /Upstream retry needed|Retry upstream source|temporarily unavailable|暫時無法回應/i.test(
      text,
    )
  );
};

export const isExternalUpstreamUnavailableReport = (report = {}) =>
  report?.statusCategory === EXTERNAL_UPSTREAM_STATUS &&
  report?.externalUpstream?.contractObserved === true &&
  Array.isArray(report?.failures) &&
  report.failures.includes("source-upstream-unavailable");

export const canTreatExternalUpstreamAsNonActionable = ({
  searchUi,
  health,
  bundle,
  pdfCanary,
  requirePdfCanary = false,
} = {}) =>
  isExternalUpstreamUnavailableReport(searchUi) &&
  health?.present === true &&
  health?.ok === true &&
  bundle?.present === true &&
  bundle?.ok === true &&
  (!requirePdfCanary ||
    (pdfCanary?.present === true && pdfCanary?.ok === true));
