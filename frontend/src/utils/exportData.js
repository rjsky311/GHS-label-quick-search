import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { API } from "@/constants/ghs";
import i18n from "@/i18n";
import {
  getLocalizedPictogramName,
  getLocalizedSignalWord,
  getLocalizedStatementText,
  resolveTrustedChineseName,
} from "@/utils/ghsText";
import { hasGhsData } from "@/utils/ghsAvailability";
import { getReferenceLinks } from "@/utils/sdsLinks";

// The `xlsx` package (SheetJS) has unpatched vulnerabilities in the
// 0.18.x line shipped via npm. We previously used it as a client-side
// fallback if the backend export endpoint failed, but that fallback
// never went through the backend's formula-injection neutralization
// (`spreadsheet_safe`) and kept a vulnerable package in the bundle.
//
// As of v1.7.0 the backend is the only source of .xlsx output. If it
// fails, we surface a toast error rather than silently producing an
// unsanitized client-side file. CSV has a small native fallback using
// a safe escape helper below — no third-party dependency needed.

/**
 * Escape a single CSV cell value.
 *
 * - Leading formula-trigger characters (=, +, -, @, tab, CR) are
 *   prefixed with an apostrophe so spreadsheet applications treat
 *   the value as literal text. Matches the backend's
 *   `spreadsheet_safe()` so the client-side fallback cannot be
 *   turned into an exfiltration vector.
 * - Values containing a comma, quote, CR, or LF are wrapped in
 *   double quotes with any internal quotes doubled (RFC 4180).
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (text.length > 0 && "=+-@\t\r".includes(text[0])) {
    text = "'" + text;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function hasDirectPictogramVisual(result) {
  return (result?.ghs_pictograms || result?.pictograms || []).length > 0;
}

export function resolveExportDataState(result, t) {
  if (result?.upstream_error) return t("export.dataStateUpstreamError");
  if (result?.found === false) return t("export.dataStateNotFound");
  if (hasGhsData(result) && !hasDirectPictogramVisual(result)) {
    return t("export.dataStateTextOnly");
  }
  if (!hasGhsData(result)) return t("export.dataStateNoGhs");
  return t("export.dataStateRenderable");
}

function buildExportTrustCells(result, t) {
  const references = getReferenceLinks(result);
  return [
    resolveExportDataState(result, t),
    result?.primary_source || t("export.notRecorded"),
    result?.primary_report_count || "-",
    result?.retrieved_at || t("export.notRecorded"),
    result?.cache_hit ? t("export.cacheHit") : t("export.cacheNotRecorded"),
    references.length
      ? t("export.referenceCount", { count: references.length })
      : t("export.noReferences"),
    result?.customNote
      ? t("export.customClassification", { note: result.customNote })
      : t("export.defaultClassification"),
  ];
}

export function normalizeResultsForExport(results = []) {
  return results.map((result) => ({
    ...result,
    name_zh: resolveTrustedChineseName(result) || "",
  }));
}

function buildCsvRows(results, t) {
  const displayLocale = i18n.language;
  const rows = [
    [
      t("export.cas"),
      t("export.nameEn"),
      t("export.nameZh"),
      t("export.ghs"),
      t("export.signalWord"),
      t("export.hazardStatements"),
      t("export.precautionaryStatements"),
      t("export.dataState"),
      t("export.primarySource"),
      t("export.reportCount"),
      t("export.retrievedAt"),
      t("export.cacheState"),
      t("export.referenceLinks"),
      t("export.classificationSelection"),
    ],
  ];
  for (const r of results) {
    const ghsText =
      r.ghs_pictograms && r.ghs_pictograms.length
        ? r.ghs_pictograms
            .map((p) => `${p.code} (${getLocalizedPictogramName(p, displayLocale)})`)
            .join(", ")
        : t("export.none");
    const signal = getLocalizedSignalWord(r, displayLocale) || "-";
    const hazardText =
      r.hazard_statements && r.hazard_statements.length
        ? r.hazard_statements
            .map((s) => `${s.code}: ${getLocalizedStatementText(s, displayLocale)}`)
            .join("; ")
        : t("export.noHazard");
    const precautionText =
      r.precautionary_statements && r.precautionary_statements.length
        ? r.precautionary_statements
            .map((p) => `${p.code}: ${getLocalizedStatementText(p, displayLocale)}`)
            .join("; ")
        : t("export.noPrecautionary");
    rows.push([
      r.cas_number || "",
      r.name_en || "",
      r.name_zh || "",
      ghsText,
      signal,
      hazardText,
      precautionText,
      ...buildExportTrustCells(r, t),
    ]);
  }
  return rows;
}

export function buildExportPreview(results, options = {}) {
  const t = options.t || i18n.t.bind(i18n);
  const maxRows = Math.max(0, options.maxRows ?? 5);
  const normalizedResults = normalizeResultsForExport(results);
  const [headers, ...dataRows] = buildCsvRows(normalizedResults, t);

  return {
    headers,
    rows: dataRows.slice(0, maxRows).map((cells, index) => ({
      id: `${results[index]?.cas_number || "row"}-${index}`,
      cells,
    })),
    totalRows: dataRows.length,
    previewRows: Math.min(maxRows, dataRows.length),
    hiddenRows: Math.max(0, dataRows.length - maxRows),
  };
}

/**
 * Export results as .xlsx. Backend-only; no client-side fallback.
 * On server error, surface a toast error and return — do NOT emit an
 * unsanitized file from the browser.
 */
export async function exportToExcel(results) {
  if (results.length === 0) return;
  const t = i18n.t.bind(i18n);
  const normalizedResults = normalizeResultsForExport(results);

  try {
    const response = await axios.post(
      `${API}/export/xlsx`,
      { results: normalizedResults, format: "xlsx" },
      { responseType: "blob" }
    );
    saveAs(response.data, "ghs_results.xlsx");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Excel export failed:", e);
    toast.error(t("export.errorXlsx"));
  }
}

/**
 * Export results as .csv. Tries the backend first so the server-side
 * formula-injection neutralization is applied. If the backend is
 * unreachable, falls back to a native CSV build using escapeCsvCell.
 */
export async function exportToCSV(results) {
  if (results.length === 0) return;
  const t = i18n.t.bind(i18n);
  const normalizedResults = normalizeResultsForExport(results);

  try {
    const response = await axios.post(
      `${API}/export/csv`,
      { results: normalizedResults, format: "csv" },
      { responseType: "blob" }
    );
    saveAs(response.data, "ghs_results.csv");
    return;
  } catch (e) {
    // eslint-disable-next-line no-console
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
  saveAs(blob, "ghs_results.csv");
  toast.info(t("export.csvFallbackHint"));
}
