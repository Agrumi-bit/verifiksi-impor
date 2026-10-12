/* Mesin laporan khusus VKI — salinan terpisah; perubahan di sini tidak memengaruhi skema lain. */
/*
 * Content model of the chapter-based Laporan Pelaksanaan (Pelaporan Pasal 47) used by the VIU Non
 * Industri and VKI reports: each chapter is a list of blocks (sub-heads, paragraphs, figures, tables,
 * highlights, limits) that the printable report lays out on A4 pages and the workspace shows per chapter.
 */

export type Seg = { label: string; value: number };
export type Fig =
  | { k: "kpis"; tiles: [string, string, string][] }
  | { k: "hbar"; rows: { key: string; desc?: string; value: number }[]; total?: number; keyWidth?: number; unit?: string }
  | { k: "donuts"; items: { cap: string; center: string; sub: string; segs: Seg[] }[] }
  | { k: "columns"; items: Seg[] };
export type Block =
  | { t: "sub"; num: string; title: string }
  | { t: "p"; text: string }
  | { t: "fig"; num: string; title: string; source: string; fig: Fig }
  | { t: "table"; num: string; title: string; headers: string[]; rows: (string | number)[][]; source: string }
  | { t: "highlights"; items: string[] }
  | { t: "limits"; items: string[] };
export type Chapter = { n: number; title: string; lead: string; scope: string[]; stats: [string, string][]; blocks: Block[] };

export type ChapterReportModel = {
  chapters: Chapter[];
  intro: string[];
  summary: { tiles: [string, string, string][]; highlights: string[]; alerts: string[] };
  conclusion: { title: string; paragraphs: string[] }[];
};
