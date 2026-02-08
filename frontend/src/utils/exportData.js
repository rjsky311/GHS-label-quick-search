import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { API } from "@/constants/ghs";
import i18n from "@/i18n";

export async function exportToExcel(results) {
  if (results.length === 0) return;
  const t = i18n.t.bind(i18n);

  try {
    const response = await axios.post(
      `${API}/export/xlsx`,
      { results, format: "xlsx" },
      { responseType: "blob" }
    );
    saveAs(response.data, "ghs_results.xlsx");
  } catch (e) {
    const wsData = [
      [t("export.cas"), t("export.nameEn"), t("export.nameZh"), t("export.ghs"), t("export.signalWord"), t("export.hazardStatements")],
    ];

    results.forEach((r) => {
      const ghsText = r.ghs_pictograms
        ? r.ghs_pictograms.map((p) => `${p.code} (${p.name_zh})`).join(", ")
        : t("export.none");
      const signal = r.signal_word_zh || r.signal_word || "-";
      const hazardText = r.hazard_statements
        ? r.hazard_statements.map((s) => `${s.code}: ${s.text_zh}`).join("; ")
        : t("export.noHazard");

      wsData.push([
        r.cas_number || "",
        r.name_en || "",
        r.name_zh || "",
        ghsText,
        signal,
        hazardText,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("export.sheetName"));
    XLSX.writeFile(wb, "ghs_results.xlsx");
  }
}

export async function exportToCSV(results) {
  if (results.length === 0) return;
  const t = i18n.t.bind(i18n);

  try {
    const response = await axios.post(
      `${API}/export/csv`,
      { results, format: "csv" },
      { responseType: "blob" }
    );
    saveAs(response.data, "ghs_results.csv");
  } catch (e) {
    const wsData = [
      [t("export.cas"), t("export.nameEn"), t("export.nameZh"), t("export.ghs"), t("export.signalWord"), t("export.hazardStatements")],
    ];

    results.forEach((r) => {
      const ghsText = r.ghs_pictograms
        ? r.ghs_pictograms.map((p) => `${p.code} (${p.name_zh})`).join(", ")
        : t("export.none");
      const signal = r.signal_word_zh || r.signal_word || "-";
      const hazardText = r.hazard_statements
        ? r.hazard_statements.map((s) => `${s.code}: ${s.text_zh}`).join("; ")
        : t("export.noHazard");

      wsData.push([
        r.cas_number || "",
        r.name_en || "",
        r.name_zh || "",
        ghsText,
        signal,
        hazardText,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8",
    });
    saveAs(blob, "ghs_results.csv");
  }
}
