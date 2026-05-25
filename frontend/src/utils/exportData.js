import axios from "axios";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { API } from "@/constants/ghs";
import i18n from "@/i18n";
import {
  buildCsvRows,
  buildExportPreview,
  normalizeResultsForExport,
  resolveExportDataState,
} from "@/utils/exportRows";
import { escapeCsvCell } from "@/utils/csvCell";

export { escapeCsvCell } from "@/utils/csvCell";
export {
  buildExportPreview,
  normalizeResultsForExport,
  resolveExportDataState,
} from "@/utils/exportRows";

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
