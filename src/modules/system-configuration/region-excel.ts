import * as XLSX from "xlsx";

export const REGION_EXCEL_COLUMNS = [
  { key: "provinceName" as const, header: "Provinsi", example: "JAWA BARAT" },
  { key: "cityName" as const, header: "Kota / Kabupaten", example: "BANDUNG" },
  { key: "districtName" as const, header: "Kecamatan", example: "CIBEUNYING KIDUL" },
  { key: "subdistrictName" as const, header: "Desa / Kelurahan", example: "SUKAMAJU" },
  { key: "postalCode" as const, header: "Kode Pos", example: "40121" },
];

type RegionExcelKey = (typeof REGION_EXCEL_COLUMNS)[number]["key"];

export type RegionImportRow = Record<RegionExcelKey, string>;

/** Triggers a browser download of the Data Wilayah Excel template — headers plus one filled example row. */
export function downloadRegionExcelTemplate(): void {
  const headerRow = REGION_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = REGION_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = REGION_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 16) }));
  // Kode Pos as text so Excel keeps leading zeros and doesn't reformat it as a number.
  sheet["E2"] = { t: "s", v: REGION_EXCEL_COLUMNS[4].example };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Data Wilayah");
  XLSX.writeFile(workbook, "Template_Data_Wilayah.xlsx");
}

/** "Kota / Kabupaten", "kota/kabupaten" and "KOTA KABUPATEN" all normalize to the same key. */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_TO_KEY = new Map<string, RegionExcelKey>(REGION_EXCEL_COLUMNS.map((c) => [normalizeHeader(c.header), c.key]));

/**
 * Parses an uploaded Data Wilayah Excel file (same layout as the template). Columns are matched
 * by header text — case, spacing and slashes ignored — not position. A row needs all five
 * columns filled to count; anything else is reported back as skipped. The server import
 * endpoint resolves Provinsi/Kota/Kecamatan/Desa ids and does the duplicate check.
 */
export async function parseRegionExcelFile(
  file: File,
): Promise<{ rows: RegionImportRow[]; skippedRows: number; missingHeaders: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { rows: [], skippedRows: 0, missingHeaders: REGION_EXCEL_COLUMNS.map((c) => c.header) };
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });

  const headerKeys = new Map<RegionExcelKey, string>();
  for (const header of Object.keys(sheetRows[0] ?? {})) {
    const key = HEADER_TO_KEY.get(normalizeHeader(header));
    if (key && !headerKeys.has(key)) headerKeys.set(key, header);
  }
  const missingHeaders = REGION_EXCEL_COLUMNS.filter((c) => !headerKeys.has(c.key)).map((c) => c.header);
  if (missingHeaders.length > 0) return { rows: [], skippedRows: 0, missingHeaders };

  const rows: RegionImportRow[] = [];
  let skippedRows = 0;

  for (const sheetRow of sheetRows) {
    const row = Object.fromEntries(
      REGION_EXCEL_COLUMNS.map((c) => [c.key, String(sheetRow[headerKeys.get(c.key)!] ?? "").trim()]),
    ) as RegionImportRow;
    if (REGION_EXCEL_COLUMNS.some((c) => !row[c.key])) {
      skippedRows += 1;
      continue;
    }
    rows.push(row);
  }

  return { rows, skippedRows, missingHeaders: [] };
}
