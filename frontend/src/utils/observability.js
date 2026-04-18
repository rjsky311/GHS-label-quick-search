import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { API } from "@/constants/ghs";
import { escapeCsvCell } from "@/utils/exportData";

export const OBSERVABILITY_STORAGE_KEY = "ghs_observability_events";
export const OBSERVABILITY_UPDATE_EVENT = "ghs:observability-updated";
export const MAX_OBSERVABILITY_EVENTS = 250;

const DEFAULT_SOURCE = "frontend";

function sanitizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeMeta(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function buildEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeObservabilityEvent(raw) {
  if (!raw || typeof raw !== "object") return null;

  const ts = sanitizeString(raw.ts) || new Date().toISOString();
  const type = sanitizeString(raw.type);
  if (!type) return null;

  const count = Number(raw.count);

  return {
    id: sanitizeString(raw.id) || buildEventId(),
    ts,
    source: sanitizeString(raw.source) || DEFAULT_SOURCE,
    type,
    query: sanitizeString(raw.query),
    queryType: sanitizeString(raw.queryType),
    cas: sanitizeString(raw.cas),
    status: sanitizeString(raw.status),
    count: Number.isFinite(count) && count > 0 ? count : 1,
    meta: sanitizeMeta(raw.meta),
  };
}

export function loadObservabilityEvents() {
  try {
    const raw = localStorage.getItem(OBSERVABILITY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeObservabilityEvent).filter(Boolean);
  } catch {
    return [];
  }
}

function persistObservabilityEvents(events) {
  try {
    localStorage.setItem(OBSERVABILITY_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Best-effort local diagnostics only.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OBSERVABILITY_UPDATE_EVENT, {
        detail: { count: events.length },
      })
    );
  }
}

export function recordObservabilityEvent(type, payload = {}) {
  const event = normalizeObservabilityEvent({
    id: payload.id,
    ts: payload.ts,
    source: payload.source,
    type,
    query: payload.query,
    queryType: payload.queryType,
    cas: payload.cas,
    status: payload.status,
    count: payload.count,
    meta: payload.meta,
  });

  if (!event) return null;

  const nextEvents = [event, ...loadObservabilityEvents()].slice(
    0,
    MAX_OBSERVABILITY_EVENTS
  );
  persistObservabilityEvents(nextEvents);
  return event;
}

export function summarizeObservabilityEvents(events = []) {
  return events.reduce((summary, event) => {
    summary[event.type] = (summary[event.type] || 0) + (event.count || 1);
    return summary;
  }, {});
}

export async function fetchObservabilityReport() {
  const response = await axios.get(`${API}/ops/report`);
  return response.data;
}

function buildObservabilityCsvRows({ clientEvents, backendReport, backendError }) {
  const rows = [
    ["section", "field", "value"],
    ["report", "exportedAt", new Date().toISOString()],
    ["frontend", "eventCount", clientEvents.length],
  ];

  const clientSummary = summarizeObservabilityEvents(clientEvents);
  Object.entries(clientSummary).forEach(([type, count]) => {
    rows.push(["frontend_summary", type, count]);
  });

  if (backendReport?.counters) {
    Object.entries(backendReport.counters).forEach(([key, value]) => {
      rows.push(["backend_counter", key, value]);
    });
  }

  if (backendReport?.dictionary) {
    Object.entries(backendReport.dictionary).forEach(([key, value]) => {
      if (Array.isArray(value)) return;
      rows.push(["dictionary_summary", key, value]);
    });
    (backendReport.dictionary.topMissQueries || []).forEach((item) => {
      rows.push([
        "dictionary_miss",
        item.query_text,
        `${item.query_kind} (${item.endpoint}) x${item.hit_count}`,
      ]);
    });
  }

  if (backendError) {
    rows.push(["backend", "error", backendError]);
  }

  rows.push([]);
  rows.push(["events", "id", "ts", "type", "status", "query", "cas", "meta"]);
  clientEvents.forEach((event) => {
    rows.push([
      "event",
      event.id,
      event.ts,
      event.type,
      event.status,
      event.query,
      event.cas,
      JSON.stringify(event.meta),
    ]);
  });

  return rows;
}

export async function exportObservabilityReport({ format = "json" } = {}) {
  const clientEvents = loadObservabilityEvents();
  let backendReport = null;
  let backendError = "";

  try {
    backendReport = await fetchObservabilityReport();
  } catch (error) {
    backendError =
      error?.response?.data?.detail ||
      error?.message ||
      "Failed to fetch backend observability report.";
  }

  const report = {
    exportedAt: new Date().toISOString(),
    frontend: {
      storageKey: OBSERVABILITY_STORAGE_KEY,
      totalEvents: clientEvents.length,
      summary: summarizeObservabilityEvents(clientEvents),
      recentEvents: clientEvents,
    },
    backend: backendReport,
    backendError: backendError || null,
  };

  if (format === "csv") {
    const csv = buildObservabilityCsvRows({
      clientEvents,
      backendReport,
      backendError,
    })
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n");
    saveAs(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
      "ghs_observability_report.csv"
    );
  } else {
    saveAs(
      new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
      "ghs_observability_report.json"
    );
  }

  if (backendError) {
    toast.warning("Observability report exported with frontend data only.");
  } else {
    toast.success("Observability report exported.");
  }

  return report;
}
