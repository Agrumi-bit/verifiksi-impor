import * as XLSX from "xlsx";

import {
  resolveHsCodeRows,
  type HsCodeImportIssue,
  type HsCodeSheetRow,
  type RefCommodityGroup,
  type RefCommoditySubGroup,
  type RefUnit,
  type ResolvedHsCodeRow,
} from "./hs-code-import-resolver";

type HsCodeExcelColumnKey = keyof Omit<HsCodeSheetRow, "rowNumber">;

/**
 * Template columns. Matched by header text, not position. The two "Kode …" columns and
 * "Kelompok Komoditas" are optional (older files without them still import), but filling the codes
 * is the only fully unambiguous way to point at a Sub Kelompok / Komoditas.
 */
export const HS_CODE_EXCEL_COLUMNS: { key: HsCodeExcelColumnKey; header: string; example: string }[] = [
  { key: "hsCode", header: "Pos Tarif / HS Code", example: "5208.11.00" },
  { key: "description", header: "Uraian Barang", example: "Kain tenunan dari kapas ... - Tidak dikelantang: -- Tenunan polos, beratnya tidak lebih dari 100 g/m2" },
  { key: "industryGroup", header: "Kelompok Komoditas", example: "Tekstil, Karpet, dan Penutup Lantai Tekstil Lainnya" },
  { key: "commodityGroup", header: "Sub Kelompok Komoditas", example: "Kain Tenun" },
  { key: "commodityGroupCode", header: "Kode Sub Kelompok Komoditas", example: "SK0101" },
  { key: "commoditySubGroup", header: "Komoditas", example: "Dari Kapas" },
  { key: "commoditySubGroupCode", header: "Kode Komoditas", example: "KM010102" },
  { key: "unit", header: "Satuan", example: "Meter" },
];

/** Triggers a browser download of the HS Code Excel template — headers plus one filled example row. */
export function downloadHsCodeExcelTemplate(): void {
  const headerRow = HS_CODE_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = HS_CODE_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = HS_CODE_EXCEL_COLUMNS.map((c) => ({ wch: Math.min(Math.max(c.header.length, c.example.length, 12), 60) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "HS Code");
  XLSX.writeFile(workbook, "Template_HS_Code.xlsx");
}

export type HsCodeImportRow = ResolvedHsCodeRow;

export type HsCodeImportResult = {
  rows: HsCodeImportRow[];
  /** Rows skipped for having no "Pos Tarif / HS Code" or "Uraian Barang". */
  skippedRows: number;
  /** One entry per problem (row number, column, value as typed, reason) — a row can have several. */
  issues: HsCodeImportIssue[];
  /** Number of distinct rows that were skipped because of `issues`. */
  issueRowCount: number;
};

/**
 * Parses an uploaded HS Code Excel file (same layout as the template) and resolves every row against
 * the master data via `resolveHsCodeRows` — see that function for the matching rules.
 */
export async function parseHsCodeExcelFile(
  file: File,
  refs: { commodityGroups: RefCommodityGroup[]; commoditySubGroups: RefCommoditySubGroup[]; units: RefUnit[] },
): Promise<HsCodeImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], skippedRows: 0, issues: [], issueRowCount: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  // Header lookup is case/whitespace-insensitive so "Kode komoditas " still matches.
  const headerKey = (row: Record<string, unknown>, header: string) => {
    const wanted = header.trim().toLowerCase();
    return Object.keys(row).find((k) => k.trim().toLowerCase() === wanted);
  };
  const cell = (row: Record<string, unknown>, key: HsCodeExcelColumnKey) => {
    const header = HS_CODE_EXCEL_COLUMNS.find((c) => c.key === key)!.header;
    const actual = headerKey(row, header);
    return actual ? String(row[actual] ?? "").trim() : "";
  };

  const sheetRows: HsCodeSheetRow[] = rawRows.map((row, index) => ({
    rowNumber: index + 2, // +1 for the header row, +1 because Excel rows are 1-based
    hsCode: cell(row, "hsCode"),
    description: cell(row, "description"),
    industryGroup: cell(row, "industryGroup"),
    commodityGroup: cell(row, "commodityGroup"),
    commodityGroupCode: cell(row, "commodityGroupCode"),
    commoditySubGroup: cell(row, "commoditySubGroup"),
    commoditySubGroupCode: cell(row, "commoditySubGroupCode"),
    unit: cell(row, "unit"),
  }));

  const { rows, issues, skippedRows } = resolveHsCodeRows(sheetRows, refs);
  return { rows, skippedRows, issues, issueRowCount: new Set(issues.map((i) => i.rowNumber)).size };
}

/** Downloads the skipped-row report so the user can fix the source file row by row. */
export function downloadHsCodeImportReport(issues: HsCodeImportIssue[], duplicates: string[] = []): void {
  const header = ["Baris Excel", "Pos Tarif / HS Code", "Kolom", "Nilai di File", "Keterangan"];
  const body = issues.map((i) => [i.rowNumber, i.hsCode, i.column, i.value, i.reason]);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet["!cols"] = [{ wch: 11 }, { wch: 18 }, { wch: 28 }, { wch: 36 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, sheet, "Baris Dilewati");
  if (duplicates.length > 0) {
    const dupSheet = XLSX.utils.aoa_to_sheet([["Pos Tarif / HS Code (sudah terdaftar, dilewati)"], ...duplicates.map((d) => [d])]);
    dupSheet["!cols"] = [{ wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, dupSheet, "Duplikat");
  }
  XLSX.writeFile(workbook, "Laporan_Impor_HS_Code.xlsx");
}
