import * as XLSX from "xlsx";

export type LartasFlagKey = "apiP" | "apiUIndustri" | "apiUNonIndustri" | "barangKonsumsi" | "ppbb";

export const LARTAS_EXCEL_COLUMNS: { key: "no" | "hsCode" | LartasFlagKey; header: string; example: string }[] = [
  { key: "no", header: "No", example: "1" },
  { key: "hsCode", header: "Pos Tarif/HS", example: "5205.31.00" },
  { key: "apiP", header: "API-P Bahan Baku dan/atau Bahan Penolong", example: "√" },
  { key: "apiUIndustri", header: "API-U Perusahaan Industri", example: "√" },
  { key: "apiUNonIndustri", header: "API-U Perusahaan Non Industri", example: "" },
  { key: "barangKonsumsi", header: "API-U Barang Konsumsi", example: "" },
  { key: "ppbb", header: "PPBB", example: "" },
];

/**
 * Template mirrors the Lampiran's own column order (Pelaku Usaha sebagai Pemohon) — a mark ("√") means the HS Code is open to
 * that applicant type. No Uraian Barang column: the description always comes from HS Code master data.
 */
export function downloadLartasExcelTemplate(): void {
  const headerRow = LARTAS_EXCEL_COLUMNS.map((c) => c.header);
  const exampleRow = LARTAS_EXCEL_COLUMNS.map((c) => c.example);
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  sheet["!cols"] = LARTAS_EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length, c.example.length, 8) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Lartas Impor");
  XLSX.writeFile(workbook, "Template_Lartas_Impor.xlsx");
}

export type LartasImportRow = { hsCode: string } & Record<LartasFlagKey, boolean>;

export type LartasParseResult = {
  rows: LartasImportRow[];
  /** Rows with an HS Code but no mark in any applicant column — usually a chapter/heading row. */
  unmarkedRows: number;
};

const HEADER_SCAN_ROWS = 15;
const MARK_VALUES = new Set(["√", "✓", "✔", "v", "x", "ya", "yes", "y", "1", "true"]);

function normalize(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Order matters: "non industri" before "industri", "konsumsi" before either. */
function classifyHeader(text: string): "hsCode" | "description" | LartasFlagKey | null {
  if (!text) return null;
  if (text.includes("pos tarif") || text === "hs" || text === "hs code" || text === "kode hs") return "hsCode";
  if (text.includes("uraian")) return "description";
  if (text.includes("ppbb")) return "ppbb";
  if (text.includes("konsumsi")) return "barangKonsumsi";
  if (text.includes("api-p") || text.includes("api p")) return "apiP";
  if (text.includes("non industri") || text.includes("non-industri")) return "apiUNonIndustri";
  if (text.includes("industri")) return "apiUIndustri";
  return null;
}

/**
 * Reads either this app's own template or the Lampiran table pasted as-is — the Lampiran uses a
 * 3-row merged header (Pelaku Usaha sebagai Pemohon > API-U > Industri/Non Industri/Barang
 * Konsumsi), so columns are located by keyword across the first rows instead of by a single
 * header row, and data starts right after the last header row found.
 */
export async function parseLartasExcelFile(file: File): Promise<LartasParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("empty-workbook");
  const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], { header: 1, defval: "", raw: false });

  const columnIndex = new Map<string, number>();
  let lastHeaderRow = -1;
  for (let r = 0; r < Math.min(grid.length, HEADER_SCAN_ROWS); r += 1) {
    const knownHsColumn = columnIndex.get("hsCode");
    if (knownHsColumn !== undefined && /\d/.test(String(grid[r]?.[knownHsColumn] ?? ""))) break;
    (grid[r] ?? []).forEach((cell, c) => {
      const key = classifyHeader(normalize(cell));
      if (key && !columnIndex.has(key)) {
        columnIndex.set(key, c);
        lastHeaderRow = Math.max(lastHeaderRow, r);
      }
    });
  }

  const hsColumn = columnIndex.get("hsCode");
  const flagKeys: LartasFlagKey[] = ["apiP", "apiUIndustri", "apiUNonIndustri", "barangKonsumsi", "ppbb"];
  if (hsColumn === undefined || !flagKeys.some((k) => columnIndex.has(k))) {
    throw new Error("missing-columns");
  }

  const rows: LartasImportRow[] = [];
  let unmarkedRows = 0;
  for (const line of grid.slice(lastHeaderRow + 1)) {
    const hsCode = String(line[hsColumn] ?? "").trim();
    if (!hsCode) continue;
    const flags = Object.fromEntries(
      flagKeys.map((k) => {
        const c = columnIndex.get(k);
        return [k, c !== undefined && MARK_VALUES.has(normalize(line[c]))];
      }),
    ) as Record<LartasFlagKey, boolean>;
    if (!flagKeys.some((k) => flags[k])) {
      unmarkedRows += 1;
      continue;
    }
    rows.push({ hsCode, ...flags });
  }

  return { rows, unmarkedRows };
}
