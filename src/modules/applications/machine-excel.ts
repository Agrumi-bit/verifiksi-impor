import * as XLSX from "xlsx";

import { MACHINE_KONDISI_LABELS, type MachineItemValues } from "./schema";

/** Text-editable machine fields, in the exact order they appear in the Excel template — photo paths are file uploads, never part of the sheet. */
export const MACHINE_EXCEL_COLUMNS: { key: keyof MachineItemValues; header: string; example: string }[] = [
  { key: "nama", header: "Nama Mesin", example: "Mesin Pemintal Benang" },
  { key: "merk", header: "Merk", example: "Toyota" },
  { key: "model", header: "Model", example: "FA-506" },
  { key: "tahun", header: "Tahun Pembuatan", example: "2019" },
  { key: "jumlah", header: "Jumlah Unit", example: "12" },
  { key: "proses", header: "Nama Proses", example: "Pemintalan Serat Kapas Menjadi Benang" },
  { key: "kapasitas", header: "Kapasitas Produksi", example: "500" },
  { key: "kapasitasSatuan", header: "Satuan Kapasitas Produksi", example: "kg/hari" },
  { key: "kapasitasJam", header: "Kapasitas Produksi per Jam", example: "20" },
  { key: "kapasitasJamSatuan", header: "Satuan Kapasitas per Jam", example: "kg" },
  { key: "waktuBeroperasi", header: "Waktu Beroperasi (jam/hari)", example: "8" },
  { key: "kondisi", header: "Kondisi (Aktif/Tidak Aktif)", example: "Aktif" },
  { key: "power", header: "Power Consumption (kWh/jam)", example: "15" },
  { key: "input", header: "Input / Raw Material", example: "Serat Kapas" },
  { key: "output", header: "Output / Produk", example: "Benang Katun" },
];

const KONDISI_LABEL_TO_VALUE: Record<string, "AKTIF" | "TIDAK_AKTIF"> = Object.fromEntries(
  Object.entries(MACHINE_KONDISI_LABELS).map(([value, label]) => [label.toLowerCase(), value as "AKTIF" | "TIDAK_AKTIF"]),
);

/** Triggers a browser download of the Data Mesin Excel template — headers plus one filled example row, so an import always uses the same column layout. */
export function downloadMachineExcelTemplate(): void {
  const headerRow = MACHINE_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = MACHINE_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = MACHINE_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 12) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Data Mesin");
  XLSX.writeFile(workbook, "Template_Data_Mesin.xlsx");
}

export type MachineImportResult = {
  machines: (Partial<MachineItemValues> & { id: string })[];
  skippedRows: number;
};

/** Parses an uploaded Data Mesin Excel file (same layout as the template) into machine entries — matches columns by header text, not position, so reordered columns still work. Rows with no "Nama Mesin" are skipped rather than added as blank entries. */
export async function parseMachineExcelFile(file: File): Promise<MachineImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { machines: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const machines: (Partial<MachineItemValues> & { id: string })[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const nama = String(row[MACHINE_EXCEL_COLUMNS[0].header] ?? "").trim();
    if (!nama) {
      skippedRows += 1;
      continue;
    }

    const machine: Partial<MachineItemValues> & { id: string } = { id: crypto.randomUUID() };
    for (const column of MACHINE_EXCEL_COLUMNS) {
      const raw = String(row[column.header] ?? "").trim();
      if (!raw) continue;
      if (column.key === "kondisi") {
        machine.kondisi = KONDISI_LABEL_TO_VALUE[raw.toLowerCase()] ?? undefined;
      } else {
        (machine as Record<string, string>)[column.key] = raw;
      }
    }
    machines.push(machine);
  }

  return { machines, skippedRows };
}
