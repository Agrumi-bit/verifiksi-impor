/* Struktur bagian laporan khusus VIU Industri — terpisah dari laporan Konsumsi (export-sections.ts). */
export type ExportTable = { title?: string; headers: string[]; rows: (string | number)[][] };
/** `narrative` (when set) is printed as prose on its own page before the tables. */
export type ExportSection = { no: string; title: string; narrative?: string[]; tables: ExportTable[] };
