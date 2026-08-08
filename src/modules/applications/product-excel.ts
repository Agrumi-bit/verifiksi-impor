import * as XLSX from "xlsx";

import type { ProductItemValues } from "./schema";

type HsCodeOption = { value: string; label: string; hint: string; unit: string };

/** Text-editable product fields covered by the Excel template, in column order. */
export const PRODUCT_EXCEL_COLUMNS: { key: "kategori" | "materialType" | "deskripsi" | "hsCode"; header: string; example: string }[] = [
  { key: "kategori", header: "Kategori Produk", example: "Tekstil" },
  { key: "materialType", header: "Jenis Produk", example: "Benang Katun" },
  { key: "deskripsi", header: "Deskripsi Produk", example: "Benang katun hasil pemintalan serat kapas untuk bahan tekstil" },
  { key: "hsCode", header: "HS Code", example: "5205.11.00" },
];

/** Triggers a browser download of the Product Information Excel template — headers plus one filled example row. */
export function downloadProductExcelTemplate(): void {
  const headerRow = PRODUCT_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = PRODUCT_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = PRODUCT_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Product Information");
  XLSX.writeFile(workbook, "Template_Product_Information.xlsx");
}

export type ProductImportResult = {
  products: (Partial<ProductItemValues> & { id: string })[];
  skippedRows: number;
};

/**
 * Parses an uploaded Product Information Excel file (same layout as the template) into product
 * entries — matches columns by header text, not position. Rows with no "Jenis Produk" are
 * skipped. When `hsCodeOptions` is given, a recognized HS Code also fills "Uraian HS Code"
 * automatically, same as picking it from the search dropdown would.
 */
export async function parseProductExcelFile(file: File, hsCodeOptions: HsCodeOption[] = []): Promise<ProductImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { products: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const hsDescByCode = new Map(hsCodeOptions.map((opt) => [opt.value.trim().toLowerCase(), opt.hint]));

  const products: (Partial<ProductItemValues> & { id: string })[] = [];
  let skippedRows = 0;

  const materialTypeHeader = PRODUCT_EXCEL_COLUMNS.find((c) => c.key === "materialType")!.header;
  for (const row of rows) {
    const materialType = String(row[materialTypeHeader] ?? "").trim();
    if (!materialType) {
      skippedRows += 1;
      continue;
    }

    const product: Partial<ProductItemValues> & { id: string } = { id: crypto.randomUUID(), materialType };
    for (const column of PRODUCT_EXCEL_COLUMNS) {
      if (column.key === "materialType") continue;
      const raw = String(row[column.header] ?? "").trim();
      if (raw) product[column.key] = raw;
    }
    if (product.hsCode) {
      const hsDesc = hsDescByCode.get(product.hsCode.trim().toLowerCase());
      if (hsDesc) product.hsDesc = hsDesc;
    }
    products.push(product);
  }

  return { products, skippedRows };
}
