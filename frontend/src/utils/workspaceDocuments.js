import axios from "axios";
import { API } from "@/constants/ghs";
import { buildPilotAdminHeaders, loadPilotAdminKey } from "@/constants/admin";

const readEnv = (key) =>
  typeof process !== "undefined" && process.env ? process.env[key] || "" : "";

const readDefinedWorkspaceSyncFlag = () =>
  typeof globalThis.__APP_WORKSPACE_SYNC_ENABLED__ === "boolean"
    ? globalThis.__APP_WORKSPACE_SYNC_ENABLED__
    : null;

const readDefinedDictionaryMissCaptureFlag = () =>
  typeof globalThis.__APP_DICTIONARY_MISS_CAPTURE_ENABLED__ === "boolean"
    ? globalThis.__APP_DICTIONARY_MISS_CAPTURE_ENABLED__
    : null;

export const WORKSPACE_SYNC_ENABLED =
  readDefinedWorkspaceSyncFlag() ??
  (readEnv("VITE_ENABLE_WORKSPACE_SYNC").trim().toLowerCase() === "true");

export const DICTIONARY_MISS_CAPTURE_ENABLED =
  readDefinedDictionaryMissCaptureFlag() ??
  (readEnv("VITE_ENABLE_DICTIONARY_MISS_CAPTURE").trim().toLowerCase() ===
    "true");

export const MAX_DICTIONARY_MISS_QUERY_LENGTH = 160;
export const MAX_DICTIONARY_MISS_CONTEXT_SCALAR_LENGTH = 160;

const DICTIONARY_MISS_CONTEXT_KEYS = new Set([
  "locale",
  "normalizedCas",
  "resultCount",
  "searchMode",
  "source",
]);

const sanitizeMissScalar = (value) => {
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > MAX_DICTIONARY_MISS_CONTEXT_SCALAR_LENGTH
      ? trimmed.slice(0, MAX_DICTIONARY_MISS_CONTEXT_SCALAR_LENGTH)
      : trimmed;
  }
  return undefined;
};

export function sanitizeDictionaryMissContext(context = {}) {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return {};
  }

  return Object.entries(context).reduce((sanitized, [key, value]) => {
    if (!DICTIONARY_MISS_CONTEXT_KEYS.has(key)) return sanitized;
    const scalar = sanitizeMissScalar(value);
    if (scalar !== undefined) {
      sanitized[key] = scalar;
    }
    return sanitized;
  }, {});
}

function localOnlyResponse(docType, payload = null) {
  return {
    docType,
    payload,
    updatedAt: null,
    localOnly: true,
  };
}

function workspaceRequestConfig() {
  return {
    headers: buildPilotAdminHeaders(loadPilotAdminKey()),
  };
}

export async function fetchWorkspaceDocument(docType) {
  if (!WORKSPACE_SYNC_ENABLED) {
    return localOnlyResponse(docType);
  }

  const response = await axios.get(
    `${API}/workspace/${docType}`,
    workspaceRequestConfig()
  );
  return response.data;
}

export async function saveWorkspaceDocument(docType, payload) {
  if (!WORKSPACE_SYNC_ENABLED) {
    return localOnlyResponse(docType, payload);
  }

  const response = await axios.put(
    `${API}/workspace/${docType}`,
    {
      payload,
    },
    workspaceRequestConfig()
  );
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
  if (!DICTIONARY_MISS_CAPTURE_ENABLED) return null;
  if (!query || !String(query).trim()) return null;
  const trimmedQuery = String(query)
    .trim()
    .slice(0, MAX_DICTIONARY_MISS_QUERY_LENGTH);
  const response = await axios.post(`${API}/dictionary/miss-query`, {
    query: trimmedQuery,
    query_kind: queryKind,
    endpoint,
    context: sanitizeDictionaryMissContext(context),
  });
  return response.data;
}
