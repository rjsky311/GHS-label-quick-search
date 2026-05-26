import { getDataQualityIssueDisplayLabel } from "@/utils/dataQuality";
import { hasCjkText } from "@/utils/ghsText";

const CANDIDATE_SCHEMA_VERSION = 1;
const MAX_FIELD_LENGTH = 240;
const MAX_REVIEW_NOTES_LENGTH = 1000;
const CAS_PATTERN = /\b\d{2,7}-\d{2}-\d\b/;
const MANUAL_ENTRY_CONVERSION_NOTE =
  "Pending manual dictionary review entry created; public data remains unchanged until that manual entry is approved.";

const normalizeText = (value, maxLength = MAX_FIELD_LENGTH) => {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

const firstPresent = (...values) =>
  values.map((value) => normalizeText(value)).find(Boolean) || "";

const splitCandidateSegments = (...values) =>
  values
    .flatMap((value) => String(value || "").split(/[\n\r|/;\uFF1B]+/))
    .map((value) =>
      normalizeText(value)
        .replace(
          /^(?:name_zh|zh|chinese(?:\s+name)?|expected|name_en|en|english(?:\s+name)?|cas)\s*[:\uFF1A-]\s*/i,
          "",
        )
        .replace(/^[\u3400-\u9fff]{1,8}\s*[:\uFF1A-]\s*/, "")
        .trim(),
    )
    .filter(Boolean);

const looksLikePromptText = (value) =>
  /\b(provide|review|source|evidence|trusted|traditional|dictionary|approval|mapping|expected|current)\b/i.test(
    value,
  ) ||
  /[\u8acb\u63d0\u4f9b\u8b49\u64da\u4f86\u6e90\u5be9\u6838\u51c6\u5b57\u5178]/.test(
    value,
  );

const pickChineseName = (item = {}, existingCandidate = {}) => {
  const explicit = normalizeText(
    existingCandidate.name_zh ||
      existingCandidate.suggested_name_zh ||
      existingCandidate.zh,
  );
  if (explicit && hasCjkText(explicit)) return explicit;

  return (
    splitCandidateSegments(
      item.expected_output,
      item.expectedOutput,
      item.chemical_name,
      item.chemicalName,
      item.query_text,
      item.queryText,
    ).find((segment) => hasCjkText(segment) && !looksLikePromptText(segment)) || ""
  );
};

const pickEnglishName = (item = {}, existingCandidate = {}) => {
  const explicit = normalizeText(
    existingCandidate.name_en ||
      existingCandidate.suggested_name_en ||
      existingCandidate.en,
  );
  if (explicit && !hasCjkText(explicit)) return explicit;

  return (
    splitCandidateSegments(
      item.chemical_name,
      item.chemicalName,
      item.expected_output,
      item.expectedOutput,
      item.query_text,
      item.queryText,
    ).find(
      (segment) =>
        /[a-z]/i.test(segment) &&
        !hasCjkText(segment) &&
        !CAS_PATTERN.test(segment) &&
        !looksLikePromptText(segment),
    ) || ""
  );
};

const pickCasNumber = (item = {}, existingCandidate = {}) => {
  const explicit = firstPresent(
    item.cas_number,
    item.casNumber,
    existingCandidate.cas_number,
    existingCandidate.casNumber,
  );
  if (CAS_PATTERN.test(explicit)) return explicit.match(CAS_PATTERN)[0];

  const combined = [
    item.expected_output,
    item.expectedOutput,
    item.current_output,
    item.currentOutput,
    item.query_text,
    item.queryText,
    item.chemical_name,
    item.chemicalName,
  ].join("\n");
  return combined.match(CAS_PATTERN)?.[0] || "";
};

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === "") return false;
      if (Array.isArray(entry)) return entry.length > 0;
      if (typeof entry === "object") return Object.keys(entry).length > 0;
      return true;
    }),
  );

const candidateNotes = (candidate = {}) =>
  [
    candidate.request_id
      ? `Correction request #${candidate.request_id}`
      : "Correction request candidate",
    candidate.issue_type
      ? `Issue: ${getDataQualityIssueDisplayLabel(candidate.issue_type)} (${candidate.issue_type})`
      : "",
    candidate.evidence_type ? `Evidence type: ${candidate.evidence_type}` : "",
    candidate.evidence_url ? `Evidence: ${candidate.evidence_url}` : "",
    candidate.review_notes ? `Review: ${candidate.review_notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

const appendReviewNote = (baseNote = "", nextNote = "") => {
  const notes = [normalizeText(baseNote, MAX_REVIEW_NOTES_LENGTH), nextNote]
    .filter(Boolean)
    .join(" | ");
  return normalizeText(notes, MAX_REVIEW_NOTES_LENGTH);
};

export function buildCorrectionCandidateEvidence(item = {}, reviewNotes = "") {
  const existingCandidate =
    item.candidate && typeof item.candidate === "object" ? item.candidate : {};
  const issueType = firstPresent(item.issue_type, item.issueType, "other-data-quality");
  const evidenceUrl = firstPresent(item.evidence_url, item.evidenceUrl);
  const evidenceType = firstPresent(item.evidence_type, item.evidenceType);

  const candidate = compactObject({
    schema_version: CANDIDATE_SCHEMA_VERSION,
    review_required: true,
    approved_for_public_use: false,
    source: "admin-correction-request",
    candidate_type: issueType,
    issue_type: issueType,
    request_id: item.id,
    cas_number: pickCasNumber(item, existingCandidate),
    name_en: pickEnglishName(item, existingCandidate),
    name_zh: pickChineseName(item, existingCandidate),
    query_text: firstPresent(item.query_text, item.queryText),
    evidence_type: evidenceType,
    evidence_url: evidenceUrl,
    review_notes: normalizeText(reviewNotes || item.review_notes || item.reviewNotes),
    current_output: normalizeText(item.current_output || item.currentOutput),
    expected_output: normalizeText(item.expected_output || item.expectedOutput),
  });

  return candidate;
}

export function buildManualEntryPayloadFromCorrectionCandidate(
  item = {},
  reviewNotes = "",
) {
  const candidate = buildCorrectionCandidateEvidence(item, reviewNotes);
  const casNumber = normalizeText(candidate.cas_number);
  const nameEn = normalizeText(candidate.name_en);
  const nameZh = normalizeText(candidate.name_zh);

  if (!casNumber || (!nameEn && !nameZh)) return null;

  return {
    cas_number: casNumber,
    name_en: nameEn || null,
    name_zh: nameZh && hasCjkText(nameZh) ? nameZh : null,
    notes: candidateNotes(candidate),
    source: "correction-request",
    status: "pending",
  };
}

export function buildCorrectionRequestManualEntryConversionPayload(
  item = {},
  reviewNotes = "",
) {
  const candidate = buildCorrectionCandidateEvidence(item, reviewNotes);
  return {
    status: "candidate_found",
    review_notes: appendReviewNote(
      reviewNotes || item.review_notes || item.reviewNotes,
      MANUAL_ENTRY_CONVERSION_NOTE,
    ),
    candidate: compactObject({
      ...candidate,
      converted_to_manual_entry: true,
      manual_entry_status: "pending",
      manual_entry_source: "correction-request",
      public_data_changed: false,
    }),
  };
}

export function getCorrectionCandidateDisplayRows(candidate = {}) {
  const rows = [
    ["CAS", candidate.cas_number],
    ["EN", candidate.name_en],
    ["ZH", candidate.name_zh],
    ["Evidence", candidate.evidence_type || candidate.evidence_url],
    ["Source", candidate.source],
    [
      "Manual",
      candidate.converted_to_manual_entry
        ? candidate.manual_entry_status || "pending"
        : "",
    ],
  ];
  return rows
    .filter(([, value]) => normalizeText(value))
    .map(([label, value]) => [label, normalizeText(value)]);
}
