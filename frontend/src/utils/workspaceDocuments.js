import axios from "axios";
import { API } from "@/constants/ghs";
import { buildPilotAdminHeaders, loadPilotAdminKey } from "@/constants/admin";

const readEnv = (key) =>
  typeof process !== "undefined" && process.env ? process.env[key] || "" : "";

const readDefinedWorkspaceSyncFlag = () =>
  typeof globalThis.__APP_WORKSPACE_SYNC_ENABLED__ === "boolean"
    ? globalThis.__APP_WORKSPACE_SYNC_ENABLED__
    : null;

export const WORKSPACE_SYNC_ENABLED =
  readDefinedWorkspaceSyncFlag() ??
  (readEnv("VITE_ENABLE_WORKSPACE_SYNC").trim().toLowerCase() === "true");

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
  if (!query || !String(query).trim()) return null;
  const response = await axios.post(`${API}/dictionary/miss-query`, {
    query: String(query).trim(),
    query_kind: queryKind,
    endpoint,
    context,
  });
  return response.data;
}
