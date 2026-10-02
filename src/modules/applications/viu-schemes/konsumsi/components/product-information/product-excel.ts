import * as XLSX from "xlsx";

export const PRODUCT_EXCEL_COLUMNS = [
  { key: "commodityName" as const, header: "Sub Kelompok Komoditas", example: "" },
  { key: "productName" as const, header: "Nama Produk", example: "Men's Cotton T-Shirt" },
  { key: "hsCode" as const, header: "HS Code", example: "61091000" },
  { key: "countryOfOrigin" as const, header: "Asal Negara", example: "Vietnam" },
  { key: "quantity" as const, header: "Jumlah", example: "10000" },
  { key: "averageUnitPrice" as const, header: "Harga Satuan Rata-rata", example: "3.5" },
  { key: "currency" as const, header: "Mata Uang", example: "USD" },
];

function excelSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Produk";
}

/**
 * Triggers a browser download of the per-Brand Produk Excel template. `groupNames` is that
 * Brand's own Sub Kelompok Komoditas list (derived from Step "Dokumen Pendukung Merek" — see
 * deriveKonsumsiProductGroups) so the example row and the sheet's own note reference groups that
 * actually exist for this Brand, never an arbitrary one.
 */
export function downloadProductExcelTemplate(brandName: string, groupNames: string[]): void {
  const exampleRow = PRODUCT_EXCEL_COLUMNS.map((c) => (c.key === "commodityName" ? (groupNames[0] ?? "") : c.example));
  const headerRow = PRODUCT_EXCEL_COLUMNS.map((c) => c.header);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = PRODUCT_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 16) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, excelSheetName(brandName));

  if (groupNames.length > 0) {
    const noteSheet = XLSX.utils.aoa_to_sheet([
      ["Sub Kelompok Komoditas tersedia untuk merek ini"],
      ...groupNames.map((name) => [name]),
    ]);
    XLSX.utils.book_append_sheet(workbook, noteSheet, "Sub Kelompok Komoditas");
  }

  XLSX.writeFile(workbook, `Template_Produk_${excelSheetName(brandName).replace(/\s+/g, "_")}.xlsx`);
}

export type ProductImportRow = {
  commodityName: string;
  productName: string;
  hsCode: string;
  countryOfOrigin: string;
  quantity: string;
  averageUnitPrice: string;
  currency: string;
};

/**
 * Parses an uploaded per-Brand Produk Excel file (same layout as the template) — matches columns
 * by header text, not position. A row needs at least Sub Kelompok Komoditas, Nama Produk, HS
 * Code, Asal Negara, Jumlah, and Harga Satuan Rata-rata to count; Mata Uang defaults to "USD"
 * when blank. Resolving Sub Kelompok Komoditas/HS Code/Country against real data — and rejecting
 * a Sub Kelompok Komoditas that isn't one of this Brand's own (Step "Dokumen Pendukung Merek")
 * groups — happens in the caller, which has that live data; this function only does the
 * spreadsheet-shape parsing.
 */
export async function parseProductExcelFile(file: File): Promise<{ rows: ProductImportRow[]; skippedRows: number }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const headerFor = (key: (typeof PRODUCT_EXCEL_COLUMNS)[number]["key"]) =>
    PRODUCT_EXCEL_COLUMNS.find((c) => c.key === key)!.header;

  const rows: ProductImportRow[] = [];
  let skippedRows = 0;

  for (const sheetRow of sheetRows) {
    const commodityName = String(sheetRow[headerFor("commodityName")] ?? "").trim();
    const productName = String(sheetRow[headerFor("productName")] ?? "").trim();
    const hsCode = String(sheetRow[headerFor("hsCode")] ?? "").trim();
    const countryOfOrigin = String(sheetRow[headerFor("countryOfOrigin")] ?? "").trim();
    const quantity = String(sheetRow[headerFor("quantity")] ?? "").trim();
    const averageUnitPrice = String(sheetRow[headerFor("averageUnitPrice")] ?? "").trim();
    if (!commodityName || !productName || !hsCode || !countryOfOrigin || !quantity || !averageUnitPrice) {
      skippedRows += 1;
      continue;
    }
    rows.push({
      commodityName,
      productName,
      hsCode,
      countryOfOrigin,
      quantity,
      averageUnitPrice,
      currency: String(sheetRow[headerFor("currency")] ?? "").trim().toUpperCase() || "USD",
    });
  }

  return { rows, skippedRows };
}
