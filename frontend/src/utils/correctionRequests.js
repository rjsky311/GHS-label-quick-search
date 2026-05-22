import axios from "axios";
import { API } from "@/constants/ghs";

const trimOptional = (value) => {
  const text = String(value || "").trim();
  return text || undefined;
};

export function normalizeCorrectionRequestPayload(payload = {}) {
  return {
    issue_type: trimOptional(payload.issue_type) || "other-data-quality",
    cas_number: trimOptional(payload.cas_number),
    chemical_name: trimOptional(payload.chemical_name),
    query_text: trimOptional(payload.query_text),
    current_output: trimOptional(payload.current_output),
    expected_output: trimOptional(payload.expected_output),
    evidence_url: trimOptional(payload.evidence_url),
    evidence_type: trimOptional(payload.evidence_type),
    local_context: trimOptional(payload.local_context),
    candidate:
      payload.candidate && typeof payload.candidate === "object"
        ? payload.candidate
        : {},
    source: trimOptional(payload.source) || "public-in-app",
  };
}

export async function submitCorrectionRequest(payload) {
  const response = await axios.post(
    `${API}/dictionary/correction-requests`,
    normalizeCorrectionRequestPayload(payload),
  );
  return response.data;
}
