import * as XLSX from "xlsx";

export const HIERARCHY_EXCEL_COLUMNS = [
  { key: "industryGroupName" as const, header: "Kelompok Industri", example: "Industri Tekstil" },
  { key: "industryGroupCode" as const, header: "Kode Kelompok Industri", example: "IND-01" },
  { key: "commodityGroupName" as const, header: "Commodity Group", example: "Serat Tekstil" },
  { key: "commodityGroupCode" as const, header: "Kode Commodity Group", example: "52" },
  { key: "subGroupName" as const, header: "Commodity Sub Group", example: "Katun" },
  { key: "subGroupCode" as const, header: "Kode Sub Group", example: "52.01" },
];

/** Triggers a browser download of the combined hierarchy Excel template — headers plus one filled example row. */
export function downloadCommodityHierarchyExcelTemplate(): void {
  const headerRow = HIERARCHY_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = HIERARCHY_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = HIERARCHY_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 14) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Kelompok Industri");
  XLSX.writeFile(workbook, "Template_Kelompok_Industri.xlsx");
}

export type CommodityHierarchyImportRow = {
  industryGroupName: string;
  industryGroupCode: string;
  commodityGroupName: string;
  commodityGroupCode: string;
  subGroupName: string;
  subGroupCode: string;
};

/**
 * Parses an uploaded hierarchy Excel file (same layout as the template) — matches columns by
 * header text, not position. A row needs at least "Kelompok Industri" to count; "Commodity Group"
 * and "Commodity Sub Group" are optional per row (a row can define just the top level). The server
 * import endpoint does the actual find-or-create + duplicate handling across all three levels.
 */
export async function parseCommodityHierarchyExcelFile(file: File): Promise<{ rows: CommodityHierarchyImportRow[]; skippedRows: number }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const headerFor = (key: (typeof HIERARCHY_EXCEL_COLUMNS)[number]["key"]) => HIERARCHY_EXCEL_COLUMNS.find((c) => c.key === key)!.header;

  const rows: CommodityHierarchyImportRow[] = [];
  let skippedRows = 0;

  for (const sheetRow of sheetRows) {
    const industryGroupName = String(sheetRow[headerFor("industryGroupName")] ?? "").trim();
    if (!industryGroupName) {
      skippedRows += 1;
      continue;
    }
    rows.push({
      industryGroupName,
      industryGroupCode: String(sheetRow[headerFor("industryGroupCode")] ?? "").trim(),
      commodityGroupName: String(sheetRow[headerFor("commodityGroupName")] ?? "").trim(),
      commodityGroupCode: String(sheetRow[headerFor("commodityGroupCode")] ?? "").trim(),
      subGroupName: String(sheetRow[headerFor("subGroupName")] ?? "").trim(),
      subGroupCode: String(sheetRow[headerFor("subGroupCode")] ?? "").trim(),
    });
  }

  return { rows, skippedRows };
}
