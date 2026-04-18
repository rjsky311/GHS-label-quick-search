import axios from "axios";
import { API } from "@/constants/ghs";

export async function fetchWorkspaceDocument(docType) {
  const response = await axios.get(`${API}/workspace/${docType}`);
  return response.data;
}

export async function saveWorkspaceDocument(docType, payload) {
  const response = await axios.put(`${API}/workspace/${docType}`, {
    payload,
  });
  return response.data;
}

export function hasMeaningfulWorkspacePayload(payload) {
  if (Array.isArray(payload)) {
    return payload.length > 0;
  }
  if (!payload || typeof payload !== "object") {
    return false;
  }
  return Object.values(payload).some((value) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  });
}

export async function recordDictionaryMissQuery({
  query,
  queryKind = "name",
  endpoint = "frontend",
  context = {},
} = {}) {
  if (!query || !String(query).trim()) return null;
  const response = await axios.post(`${API}/dictionary/miss-query`, {
    query: String(query).trim(),
    query_kind: queryKind,
    endpoint,
    context,
  });
  return response.data;
}
