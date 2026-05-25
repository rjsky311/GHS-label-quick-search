export const MANUAL_ENTRY_STATUS_OPTIONS = [
  {
    value: "approved",
    labelKey: "pilot.manualStatusApproved",
    defaultLabel: "Approved",
  },
  {
    value: "pending",
    labelKey: "pilot.manualStatusPending",
    defaultLabel: "Pending review",
  },
  {
    value: "needs_evidence",
    labelKey: "pilot.manualStatusNeedsEvidence",
    defaultLabel: "Needs evidence",
  },
  {
    value: "rejected",
    labelKey: "pilot.manualStatusRejected",
    defaultLabel: "Rejected",
  },
];

export const ALIAS_STATUS_OPTIONS = MANUAL_ENTRY_STATUS_OPTIONS;

export const REFERENCE_LINK_STATUS_OPTIONS = [
  {
    value: "active",
    labelKey: "pilot.referenceStatusActive",
    defaultLabel: "Active",
  },
  {
    value: "inactive",
    labelKey: "pilot.referenceStatusInactive",
    defaultLabel: "Inactive",
  },
];

export const CORRECTION_REQUEST_STATUS_OPTIONS = [
  {
    value: "open",
    labelKey: "pilot.correctionStatusOpen",
    defaultLabel: "Open",
  },
  {
    value: "candidate_found",
    labelKey: "pilot.correctionStatusCandidateFound",
    defaultLabel: "Candidate found",
  },
  {
    value: "approved",
    labelKey: "pilot.correctionStatusApproved",
    defaultLabel: "Approved",
  },
  {
    value: "rejected",
    labelKey: "pilot.correctionStatusRejected",
    defaultLabel: "Rejected",
  },
  {
    value: "ignored",
    labelKey: "pilot.correctionStatusIgnored",
    defaultLabel: "Ignored",
  },
];

export function curationTimestamp(item) {
  return (
    item?.updatedAt ||
    item?.updated_at ||
    item?.lastSeenAt ||
    item?.last_seen_at ||
    item?.createdAt ||
    item?.created_at ||
    item?.firstSeenAt ||
    item?.first_seen_at ||
    ""
  );
}

function parseUpdatedAt(item) {
  const parsed = Date.parse(curationTimestamp(item));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortNewestFirst(items, fallbackSelector) {
  return [...items].sort((a, b) => {
    const updatedDiff = parseUpdatedAt(b) - parseUpdatedAt(a);
    if (updatedDiff !== 0) return updatedDiff;
    return String(fallbackSelector(a) || "").localeCompare(
      String(fallbackSelector(b) || ""),
    );
  });
}
