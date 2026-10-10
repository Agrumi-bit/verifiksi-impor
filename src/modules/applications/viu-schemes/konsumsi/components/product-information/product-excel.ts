import * as XLSX from "xlsx";

export const PRODUCT_EXCEL_COLUMNS = [
  { key: "productName" as const, header: "Nama Produk", example: "Men's Cotton T-Shirt" },
  { key: "hsCode" as const, header: "HS Code", example: "61091000" },
  // Multiple countries separated by ";" — name or ISO code, freely mixed (e.g. "REP. RAKYAT CINA; VN").
  // Splitting/resolving happens in the caller (BrandProductSection), same convention as HS
  // Code/Country below — this module only does spreadsheet-shape parsing.
  { key: "countryOfOrigin" as const, header: "Asal Negara", example: "REP. RAKYAT CINA; Vietnam" },
  { key: "quantity" as const, header: "Jumlah Permohonan", example: "10000" },
  // Optional — not in the required-columns check below (see parseProductExcelFile), same "0"
  // default as the manual Add Product form when left blank.
  { key: "stockQuantity" as const, header: "Jumlah Stock", example: "0" },
  { key: "averageUnitPrice" as const, header: "Harga Satuan Rata-rata", example: "3.5" },
  { key: "currency" as const, header: "Mata Uang", example: "USD" },
];

function excelSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no : \ / ? * [ ]
  return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Produk";
}

/**
 * Triggers a browser download of the per-Brand Produk Excel template. No commodity-grouping
 * column — Sub Kelompok Komoditas is derived automatically from each row's own HS Code at import
 * time (see BrandProductSection's `handleImportFile`), the inverse of this template's previous
 * design (grouping picked in Step "Dokumen Pendukung Merek" before any product existed).
 */
export function downloadProductExcelTemplate(brandName: string): void {
  const exampleRow = PRODUCT_EXCEL_COLUMNS.map((c) => c.example);
  const headerRow = PRODUCT_EXCEL_COLUMNS.map((c) => c.header);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = PRODUCT_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 16) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, excelSheetName(brandName));
  XLSX.writeFile(workbook, `Template_Produk_${excelSheetName(brandName).replace(/\s+/g, "_")}.xlsx`);
}

export type ProductImportRow = {
  productName: string;
  hsCode: string;
  countryOfOrigin: string;
  quantity: string;
  stockQuantity: string;
  averageUnitPrice: string;
  currency: string;
};

/**
 * Parses an uploaded per-Brand Produk Excel file (same layout as the template) — matches columns
 * by header text, not position. A row needs at least Nama Produk, HS Code, Asal Negara, Jumlah
 * Permohonan, and Harga Satuan Rata-rata to count; Mata Uang defaults to "USD" and Jumlah Stock
 * defaults to "0" when blank (same default as the manual Add Product form) — neither is required
 * for a row to count. Resolving HS Code/Country against real data — and deriving the Sub Kelompok
 * Komoditas from the HS Code — happens in the caller, which has that live data; this function only
 * does the spreadsheet-shape parsing.
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
    const productName = String(sheetRow[headerFor("productName")] ?? "").trim();
    const hsCode = String(sheetRow[headerFor("hsCode")] ?? "").trim();
    const countryOfOrigin = String(sheetRow[headerFor("countryOfOrigin")] ?? "").trim();
    const quantity = String(sheetRow[headerFor("quantity")] ?? "").trim();
    const averageUnitPrice = String(sheetRow[headerFor("averageUnitPrice")] ?? "").trim();
    if (!productName || !hsCode || !countryOfOrigin || !quantity || !averageUnitPrice) {
      skippedRows += 1;
      continue;
    }
    rows.push({
      productName,
      hsCode,
      countryOfOrigin,
      quantity,
      stockQuantity: String(sheetRow[headerFor("stockQuantity")] ?? "").trim() || "0",
      averageUnitPrice,
      currency: String(sheetRow[headerFor("currency")] ?? "").trim().toUpperCase() || "USD",
    });
  }

  return { rows, skippedRows };
}
