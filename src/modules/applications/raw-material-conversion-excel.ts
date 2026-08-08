import * as XLSX from "xlsx";

import type { RawMaterialConversionEntryValues, RawMaterialConversionKategori } from "./schema";

type ProductOption = { id: string; materialType: string };
type RawMaterialOption = { id: string; jenis: string };

const KATEGORI_LABELS: Record<RawMaterialConversionKategori, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};
const KATEGORI_BY_LABEL = new Map(
  Object.entries(KATEGORI_LABELS).map(([value, label]) => [label.toLowerCase(), value as RawMaterialConversionKategori]),
);

/** Text-editable conversion fields covered by the Excel template, in column order. */
export const RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS: {
  key: "jenisProduk" | "volumeProduksiJumlah" | "volumeProduksiSatuan" | "namaItem" | "hsCode" | "kategori" | "volumeKebutuhanJumlah" | "volumeKebutuhanSatuan" | "rasioKonversi" | "keterangan";
  header: string;
  example: string;
}[] = [
  { key: "jenisProduk", header: "Jenis Produk", example: "Benang Katun" },
  { key: "volumeProduksiJumlah", header: "Volume Produksi", example: "4" },
  { key: "volumeProduksiSatuan", header: "Satuan Volume Produksi", example: "meter" },
  { key: "namaItem", header: "Nama Item/Produk", example: "Serat Kapas" },
  { key: "hsCode", header: "HS Code", example: "5201.00.00" },
  { key: "kategori", header: "Kategori", example: "Bahan Baku" },
  { key: "volumeKebutuhanJumlah", header: "Volume Kebutuhan", example: "1" },
  { key: "volumeKebutuhanSatuan", header: "Satuan Volume Kebutuhan", example: "kg" },
  { key: "rasioKonversi", header: "Rasio Konversi", example: "1 kg/4 meter" },
  { key: "keterangan", header: "Keterangan", example: "" },
];

/** Triggers a browser download of the Rasio Konversi Excel template — headers plus one filled example row. */
export function downloadRawMaterialConversionExcelTemplate(): void {
  const headerRow = RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Rasio Konversi");
  XLSX.writeFile(workbook, "Template_Rasio_Konversi.xlsx");
}

export type RawMaterialConversionImportResult = {
  entries: (Partial<RawMaterialConversionEntryValues> & { id: string })[];
  skippedRows: number;
};

/**
 * Parses an uploaded Rasio Konversi Excel file (same layout as the template) — matches columns
 * by header text, not position. Rows with no "Nama Item/Produk" are skipped. "Jenis Produk" and
 * "Nama Item/Produk" are matched by name against already-added products/raw materials (case
 * insensitive); unmatched or blank stays unset so the user can pick it manually.
 */
export async function parseRawMaterialConversionExcelFile(
  file: File,
  products: ProductOption[] = [],
  rawMaterialOptions: RawMaterialOption[] = [],
): Promise<RawMaterialConversionImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { entries: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const productIdByName = new Map(products.map((p) => [p.materialType.trim().toLowerCase(), p.id]));
  const rawMaterialIdByName = new Map(rawMaterialOptions.map((r) => [r.jenis.trim().toLowerCase(), r.id]));

  const entries: (Partial<RawMaterialConversionEntryValues> & { id: string })[] = [];
  let skippedRows = 0;

  const namaItemHeader = RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS.find((c) => c.key === "namaItem")!.header;
  const jenisProdukHeader = RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS.find((c) => c.key === "jenisProduk")!.header;
  const kategoriHeader = RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS.find((c) => c.key === "kategori")!.header;
  for (const row of rows) {
    const namaItem = String(row[namaItemHeader] ?? "").trim();
    if (!namaItem) {
      skippedRows += 1;
      continue;
    }

    const entry: Partial<RawMaterialConversionEntryValues> & { id: string } = { id: crypto.randomUUID() };
    for (const column of RAW_MATERIAL_CONVERSION_EXCEL_COLUMNS) {
      if (column.key === "namaItem" || column.key === "jenisProduk" || column.key === "hsCode" || column.key === "kategori") continue;
      const raw = String(row[column.header] ?? "").trim();
      if (raw) entry[column.key] = raw;
    }

    const jenisProduk = String(row[jenisProdukHeader] ?? "").trim();
    const matchedProductId = jenisProduk ? productIdByName.get(jenisProduk.toLowerCase()) : undefined;
    if (matchedProductId) entry.productId = matchedProductId;

    const matchedRawMaterialId = rawMaterialIdByName.get(namaItem.toLowerCase());
    if (matchedRawMaterialId) entry.rawMaterialId = matchedRawMaterialId;

    const kategoriText = String(row[kategoriHeader] ?? "").trim();
    const matchedKategori = kategoriText ? KATEGORI_BY_LABEL.get(kategoriText.toLowerCase()) : undefined;
    if (matchedKategori) entry.kategori = matchedKategori;

    entries.push(entry);
  }

  return { entries, skippedRows };
}
