import * as XLSX from "xlsx";

import type { RawMaterialItemValues } from "./schema";

type HsCodeOption = { value: string; label: string; hint: string; unit: string };

/** Text-editable raw material fields covered by the Excel template, in column order. */
export const RAW_MATERIAL_EXCEL_COLUMNS: { key: "jenis" | "hsCode" | "deskripsi"; header: string; example: string }[] = [
  { key: "jenis", header: "Jenis Bahan Baku", example: "Serat Kapas" },
  { key: "hsCode", header: "HS Code", example: "5201.00.00" },
  { key: "deskripsi", header: "Deskripsi Bahan Baku", example: "Serat kapas mentah untuk bahan baku pemintalan" },
];

/** Triggers a browser download of the Raw Material Excel template — headers plus one filled example row. */
export function downloadRawMaterialExcelTemplate(): void {
  const headerRow = RAW_MATERIAL_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = RAW_MATERIAL_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = RAW_MATERIAL_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Raw Materials");
  XLSX.writeFile(workbook, "Template_Bahan_Baku.xlsx");
}

export type RawMaterialImportResult = {
  rawMaterials: (Partial<RawMaterialItemValues> & { id: string })[];
  skippedRows: number;
};

/**
 * Parses an uploaded Raw Material Excel file (same layout as the template) into raw material
 * entries — matches columns by header text, not position. Rows with no "Jenis Bahan Baku" are
 * skipped. When `hsCodeOptions` is given, a recognized HS Code also fills the description
 * automatically, same as picking it from the search dropdown would.
 */
export async function parseRawMaterialExcelFile(file: File, hsCodeOptions: HsCodeOption[] = []): Promise<RawMaterialImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rawMaterials: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const hsDescByCode = new Map(hsCodeOptions.map((opt) => [opt.value.trim().toLowerCase(), opt.hint]));

  const rawMaterials: (Partial<RawMaterialItemValues> & { id: string })[] = [];
  let skippedRows = 0;

  const jenisHeader = RAW_MATERIAL_EXCEL_COLUMNS.find((c) => c.key === "jenis")!.header;
  for (const row of rows) {
    const jenis = String(row[jenisHeader] ?? "").trim();
    if (!jenis) {
      skippedRows += 1;
      continue;
    }

    const rawMaterial: Partial<RawMaterialItemValues> & { id: string } = { id: crypto.randomUUID(), jenis };
    for (const column of RAW_MATERIAL_EXCEL_COLUMNS) {
      if (column.key === "jenis") continue;
      const raw = String(row[column.header] ?? "").trim();
      if (raw) rawMaterial[column.key] = raw;
    }
    if (rawMaterial.hsCode) {
      const hsDesc = hsDescByCode.get(rawMaterial.hsCode.trim().toLowerCase());
      if (hsDesc) rawMaterial.hsDesc = hsDesc;
    }
    rawMaterials.push(rawMaterial);
  }

  return { rawMaterials, skippedRows };
}
