import * as XLSX from "xlsx";

export const ELECTRICITY_TARIFF_EXCEL_COLUMNS = [
  { key: "kelompok" as const, header: "Kelompok", example: "Industri" },
  { key: "tipeKelompok" as const, header: "Tipe Kelompok", example: "TM" },
  { key: "golongan" as const, header: "Golongan Tarif Listrik", example: "I-3/TM" },
  { key: "batasDaya" as const, header: "Batas Daya", example: "lebih dari 200 kVA s.d. kurang dari 30.000 kVA" },
  { key: "tarifPerKwh" as const, header: "Tarif per kWh", example: "1.035,78" },
  { key: "keterangan" as const, header: "Keterangan", example: "" },
];

/** Triggers a browser download of the Golongan Tarif Listrik Excel template — headers plus one filled example row. */
export function downloadElectricityTariffExcelTemplate(): void {
  const headerRow = ELECTRICITY_TARIFF_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = ELECTRICITY_TARIFF_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = ELECTRICITY_TARIFF_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 14) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Golongan Tarif Listrik");
  XLSX.writeFile(workbook, "Template_Golongan_Tarif_Listrik.xlsx");
}

export type ElectricityTariffImportRow = {
  kelompok: string;
  tipeKelompok: string;
  golongan: string;
  batasDaya: string;
  tarifPerKwh: string;
  keterangan: string;
};

/**
 * Parses an uploaded Golongan Tarif Listrik Excel file (same layout as the template) — matches
 * columns by header text, not position. A row needs at least Kelompok, Tipe Kelompok, Golongan,
 * Batas Daya, and Tarif per kWh to count; Keterangan is optional. The server import endpoint does
 * the actual duplicate check (by Golongan + Batas Daya) before inserting.
 */
export async function parseElectricityTariffExcelFile(
  file: File,
): Promise<{ rows: ElectricityTariffImportRow[]; skippedRows: number }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], skippedRows: 0 };
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const headerFor = (key: (typeof ELECTRICITY_TARIFF_EXCEL_COLUMNS)[number]["key"]) =>
    ELECTRICITY_TARIFF_EXCEL_COLUMNS.find((c) => c.key === key)!.header;

  const rows: ElectricityTariffImportRow[] = [];
  let skippedRows = 0;

  for (const sheetRow of sheetRows) {
    const kelompok = String(sheetRow[headerFor("kelompok")] ?? "").trim();
    const tipeKelompok = String(sheetRow[headerFor("tipeKelompok")] ?? "").trim();
    const golongan = String(sheetRow[headerFor("golongan")] ?? "").trim();
    const batasDaya = String(sheetRow[headerFor("batasDaya")] ?? "").trim();
    const tarifPerKwh = String(sheetRow[headerFor("tarifPerKwh")] ?? "").trim();
    if (!kelompok || !tipeKelompok || !golongan || !batasDaya || !tarifPerKwh) {
      skippedRows += 1;
      continue;
    }
    rows.push({
      kelompok,
      tipeKelompok,
      golongan,
      batasDaya,
      tarifPerKwh,
      keterangan: String(sheetRow[headerFor("keterangan")] ?? "").trim(),
    });
  }

  return { rows, skippedRows };
}
