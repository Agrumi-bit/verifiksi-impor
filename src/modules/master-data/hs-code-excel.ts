import * as XLSX from "xlsx";

type NamedOption = { id: string; name: string };

export const HS_CODE_EXCEL_COLUMNS: { key: "hsCode" | "description" | "commodityGroup" | "commoditySubGroup" | "unitOfMeasurement"; header: string; example: string }[] = [
  { key: "hsCode", header: "Pos Tarif / HS Code", example: "5205.31.00" },
  { key: "description", header: "Uraian Barang", example: "Benang katun, tunggal, dari serat tidak disikat" },
  { key: "commodityGroup", header: "Kelompok Komoditas", example: "Tekstil" },
  { key: "commoditySubGroup", header: "Sub Kelompok Komoditas", example: "Benang" },
  { key: "unitOfMeasurement", header: "Satuan", example: "Kg" },
];

/** Triggers a browser download of the HS Code Excel template — headers plus one filled example row. */
export function downloadHsCodeExcelTemplate(): void {
  const headerRow = HS_CODE_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = HS_CODE_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = HS_CODE_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "HS Code");
  XLSX.writeFile(workbook, "Template_HS_Code.xlsx");
}

export type HsCodeImportRow = {
  hsCode: string;
  description: string;
  commodityGroupId: string;
  commoditySubGroupId: string;
  unitOfMeasurementId: string;
};

export type HsCodeImportResult = {
  rows: HsCodeImportRow[];
  /** Rows skipped for having no "Pos Tarif / HS Code" or "Uraian Barang". */
  skippedRows: number;
  /** Rows skipped because "Kelompok Komoditas" / "Sub Kelompok Komoditas" / "Satuan" didn't match any master data — reported by HS Code so the user can fix and re-import just those. */
  unmatchedReferenceRows: { hsCode: string; missing: string[] }[];
};

/**
 * Parses an uploaded HS Code Excel file (same layout as the template) — matches columns by header
 * text, not position. "Kelompok Komoditas"/"Sub Kelompok Komoditas"/"Satuan" are matched by name
 * (case insensitive) against the master data already registered for each — a row referencing a
 * name that doesn't exist yet is reported, not silently dropped or guessed.
 */
export async function parseHsCodeExcelFile(
  file: File,
  commodityGroups: NamedOption[],
  commoditySubGroups: NamedOption[],
  unitsOfMeasurement: NamedOption[],
): Promise<HsCodeImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], skippedRows: 0, unmatchedReferenceRows: [] };
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const groupByName = new Map(commodityGroups.map((g) => [g.name.trim().toLowerCase(), g.id]));
  const subGroupByName = new Map(commoditySubGroups.map((g) => [g.name.trim().toLowerCase(), g.id]));
  const unitByName = new Map(unitsOfMeasurement.map((g) => [g.name.trim().toLowerCase(), g.id]));

  const hsCodeHeader = HS_CODE_EXCEL_COLUMNS.find((c) => c.key === "hsCode")!.header;
  const descriptionHeader = HS_CODE_EXCEL_COLUMNS.find((c) => c.key === "description")!.header;
  const groupHeader = HS_CODE_EXCEL_COLUMNS.find((c) => c.key === "commodityGroup")!.header;
  const subGroupHeader = HS_CODE_EXCEL_COLUMNS.find((c) => c.key === "commoditySubGroup")!.header;
  const unitHeader = HS_CODE_EXCEL_COLUMNS.find((c) => c.key === "unitOfMeasurement")!.header;

  const rows: HsCodeImportRow[] = [];
  const unmatchedReferenceRows: { hsCode: string; missing: string[] }[] = [];
  let skippedRows = 0;

  for (const sheetRow of sheetRows) {
    const hsCode = String(sheetRow[hsCodeHeader] ?? "").trim();
    const description = String(sheetRow[descriptionHeader] ?? "").trim();
    if (!hsCode || !description) {
      skippedRows += 1;
      continue;
    }

    const groupId = groupByName.get(String(sheetRow[groupHeader] ?? "").trim().toLowerCase());
    const subGroupId = subGroupByName.get(String(sheetRow[subGroupHeader] ?? "").trim().toLowerCase());
    const unitId = unitByName.get(String(sheetRow[unitHeader] ?? "").trim().toLowerCase());

    const missing: string[] = [];
    if (!groupId) missing.push("Kelompok Komoditas");
    if (!subGroupId) missing.push("Sub Kelompok Komoditas");
    if (!unitId) missing.push("Satuan");
    if (missing.length > 0) {
      unmatchedReferenceRows.push({ hsCode, missing });
      continue;
    }

    rows.push({ hsCode, description, commodityGroupId: groupId!, commoditySubGroupId: subGroupId!, unitOfMeasurementId: unitId! });
  }

  return { rows, skippedRows, unmatchedReferenceRows };
}
