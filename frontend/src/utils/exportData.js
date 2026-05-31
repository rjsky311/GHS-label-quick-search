import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { API } from "@/constants/ghs";
import i18n from "@/i18n";
import {
  buildCsvRows,
  normalizeResultsForExport,
} from "@/utils/exportRows";
import { escapeCsvCell } from "@/utils/csvCell";

export { escapeCsvCell } from "@/utils/csvCell";
export {
  buildExportPreview,
  normalizeResultsForExport,
  resolveExportDataState,
} from "@/utils/exportRows";

export function buildExportFilename(format, options = {}) {
  const safeFormat = format === "csv" ? "csv" : "xlsx";
  const safeScope = String(options.scopeKey || "visible")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "visible";
  const count = Number.isFinite(Number(options.count))
    ? Number(options.count)
    : 0;
  return `ghs_batch_${safeScope}_${count}.${safeFormat}`;
}

function buildExportPayload(normalizedResults, format, options = {}) {
  const sourceTotalCount = Number.isFinite(Number(options.totalCount))
    ? Number(options.totalCount)
    : normalizedResults.length;
  const visibleCount = Number.isFinite(Number(options.visibleCount))
    ? Number(options.visibleCount)
    : normalizedResults.length;
  return {
    results: normalizedResults,
    format,
    export_scope: options.scopeKey || "visible",
    export_scope_label: options.scopeLabel || options.scopeKey || "Visible filtered",
    export_count: normalizedResults.length,
    source_total_count: sourceTotalCount,
    visible_count: visibleCount,
  };
}

// The `xlsx` package (SheetJS) has unpatched vulnerabilities in the
// 0.18.x line shipped via npm. We previously used it as a client-side
// fallback if the backend export endpoint failed, but that fallback
// never went through the backend's formula-injection neutralization
// (`spreadsheet_safe`) and kept a vulnerable package in the bundle.
//
// As of v1.7.0 the backend is the only source of .xlsx output. If it
// fails, we surface a toast error rather than silently producing an
// unsanitized client-side file. CSV has a small native fallback using
// a safe escape helper -- no third-party dependency needed.

/**
 * Export results as .xlsx. Backend-only; no client-side fallback.
 * On server error, surface a toast error and return; do not emit an
 * unsanitized file from the browser.
 */
export async function exportToExcel(results, options = {}) {
  if (results.length === 0) return;
  const t = i18n.t.bind(i18n);
  const normalizedResults = normalizeResultsForExport(results);

  try {
    const response = await axios.post(
      `${API}/export/xlsx`,
      buildExportPayload(normalizedResults, "xlsx", options),
      { responseType: "blob" }
    );
    saveAs(response.data, buildExportFilename("xlsx", {
      ...options,
      count: normalizedResults.length,
    }));
  } catch (e) {
    console.error("Excel export failed:", e);
    toast.error(t("export.errorXlsx"));
  }
}

/**
 * Export results as .csv. Tries the backend first so the server-side
 * formula-injection neutralization is applied. If the backend is
 * unreachable, falls back to a native CSV build using escapeCsvCell.
 */
export async function exportToCSV(results, options = {}) {
  if (results.length === 0) return;
  const t = i18n.t.bind(i18n);
  const normalizedResults = normalizeResultsForExport(results);

  try {
    const response = await axios.post(
      `${API}/export/csv`,
      buildExportPayload(normalizedResults, "csv", options),
      { responseType: "blob" }
    );
    saveAs(response.data, buildExportFilename("csv", {
      ...options,
      count: normalizedResults.length,
    }));
    return;
  } catch (e) {
    console.warn("CSV server export failed, using client-side fallback:", e);
  }

  // Client-side fallback. Escape every cell so a malicious CAS /
  // name / hazard string cannot break out into a formula when the
  // resulting file is opened in Excel / Sheets / Calc.
  const rows = buildCsvRows(normalizedResults, t);
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8",
  });
  saveAs(blob, buildExportFilename("csv", {
    ...options,
    count: normalizedResults.length,
  }));
  toast.info(t("export.csvFallbackHint"));
}
