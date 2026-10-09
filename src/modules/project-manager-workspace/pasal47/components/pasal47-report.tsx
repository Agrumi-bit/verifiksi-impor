"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../../components/material-icon";
import {
  Badge, CARD_BORDER, CREAM, Eyebrow, GREEN, INK, MUTED, MUTED_2, NAVY, ORANGE, ORANGE_LIGHT, ORANGE_TEXT, PageHead,
} from "@/modules/verifikator-workspace/components/report/document-verification-report";
import { resolvePeriod, type ReportingPeriod } from "../derive";
import { buildExportSections, EXPORT_PARTS, type ExportSection, type ExportTable } from "../export-sections";
import { compact, fdLong, nf, sym } from "../format";
import { bab2, btkiLabel } from "../report-bab2";
import { bab3 } from "../report-bab3";
import { bab4 } from "../report-bab4";
import { bab5 } from "../report-bab5";
import { bab6 } from "../report-bab6";
import { bab7 } from "../report-bab7";
import { bab8 } from "../report-bab8";
import { bab9 } from "../report-bab9";
import { bab10 } from "../report-bab10";
import { MAP_H, MAP_W, WORLD_BASE } from "../world-map";
import { bab1, chapterDivider, CHAPTERS, executiveSummary, GLOSSARY, kbliNonCompliant, planValues } from "../report-model";
import { introductionParagraphs, kpis } from "../summary";
import type { P47Dataset, P47Report } from "../types";
import { C, ColumnChart, ColumnPanels, ScatterLog, DividerBody, Donut, Figure, HBarList, Ikhtisar, KpiTiles, LineSeries, Limits, Para, ProfileCards, RankColumns, SERIES_COLORS, StackBars, SubHead, TableCaption, WorldMap } from "./report-figures";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";

const TITLE = "Laporan Pelaksanaan VIU – Produk Tekstil sebagai Barang Konsumsi";
const STATUS_LABEL = { DRAFT: "Draf", REVIEWED: "Ditelaah", APPROVED: "Disetujui" } as const;
const STATUS_BADGE = { DRAFT: { color: "#7a4a10", bg: "#ffebce" }, REVIEWED: { color: "#1a3a6b", bg: "#dbe8fa" }, APPROVED: { color: "#0e3d24", bg: "#d2f6dd" } } as const;

/** Why each section is in the report — printed under its title. */
const SECTION_INTRO: Record<string, string> = {
  "8.2": "Bab ini menyajikan profil Perusahaan pemegang Angka Pengenal Importir Umum (API-U) yang mengajukan Verifikasi Importir Umum (VIU) Produk Tekstil sebagai Barang Konsumsi pada periode laporan: periode penerbitan Laporan Hasil Verifikasi Importir Umum (LHVIU), kesesuaian KBLI terhadap persyaratan Pasal 37, serta daftar perusahaan dan status LHVIU. Sebaran kantor dan gudang dibahas pada Bab 9.",
  "8.3": "Bab ini menyajikan ruang lingkup komoditas Produk Tekstil dalam rencana impor Perusahaan API-U, meliputi kelompok komoditas, sebaran pos tarif/Harmonized System (HS) menurut bab BTKI, rencana kebutuhan per pos tarif, rencana impor menurut periode pelaksanaan VIU, serta ragam komoditas per perusahaan.",
  "8.4": "Bab ini membaca hasil VIU dari sudut pandang negara asal produk. Analisis dimulai dari negara asal, kemudian diturunkan ke rencana volume, rencana nilai, share, tren menurut periode pelaksanaan VIU, produk/bab HS, dan importir yang mengajukan rencana impor dari negara tersebut.",
  "8.5": "Bab ini menganalisis struktur merek dalam rencana impor dengan alur: merek apa yang diajukan, siapa pemiliknya, apakah merek lokal atau luar negeri, status pendaftarannya, siapa pemohon VIU, apa hubungan pemohon dengan pemilik merek beserta dokumen dasarnya, kelas merek, serta besaran rencana volume dan nilai yang terkait. Hubungan antara pemohon VIU dan pemilik merek menjadi fokus utama analisis.",
  "8.6": "Pemilik merek, perwakilan resmi, dan bukti merek (sertifikat atau tanda pendaftaran) beserta masa berlakunya pada akhir periode.",
  "8.7": "Bab ini menilai bukti pemenuhan persyaratan teknis yang dilampirkan Perusahaan API-U, yaitu Sertifikat Hasil Uji Mutu per merek dan sub kelompok komoditas serta Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia: cakupannya terhadap product line rencana impor, status hasil verifikasi, laboratorium penguji, masa berlaku, dan batas pengajuan 6 bulan sejak terbit.",
  "8.8": "Bab ini menyajikan persediaan (stok) Produk Tekstil yang dilaporkan Perusahaan API-U per product line pada saat pengajuan, perbandingannya dengan rencana impor, serta kecukupan kapasitas gudang sebagaimana dinilai Technical Analyst.",
  "8.9": "Bab ini membandingkan modal operasi Pemohon VIU, yaitu Jumlah Modal Kerja yang dinyatakan perusahaan, dengan rencana nilai impor yang diajukan, beserta rasio rencana impor terhadap modal operasi dan penilaian modal oleh Technical Analyst.",
  "8.10": "Bab ini mengukur tingkat konsentrasi rencana nilai impor menurut Pemohon VIU, pemilik merek, merek, pos tarif/HS, negara asal, dan kelompok komoditas menggunakan rasio konsentrasi (CR) dan Herfindahl-Hirschman Index (HHI).",
  "8.11": "Rencana kebutuhan impor per bulan menurut tanggal pengajuan permohonan, per satuan. Data realisasi impor belum tersedia pada sistem.",
  "8.12": "Status ketersediaan data pada setiap tahap rantai pasok merek, dari pemilik merek hingga konsumen. Tahap hilir tidak diverifikasi oleh VIU.",
  "8.13": "Bab ini merangkum temuan analitis dari Bab 1 sampai dengan Bab 9 beserta tingkat prioritas dan rekomendasi tindak lanjutnya, temuan pelaksanaan verifikasi dengan materialitas yang ditetapkan Project Manager, serta data yang perlu dilengkapi.",
  "8.12f": "Bab ini menganalisis fasilitas kantor dan gudang Pemohon VIU: lokasi, status kepemilikan, legalitas gudang, luas hasil verifikasi lapangan, serta kewajarannya terhadap rencana impor.",
};

type Plan =
  | { kind: "approval" }
  | { kind: "toc" }
  | { kind: "glossary" }
  | { kind: "intro"; part: 1 | 2 }
  | { kind: "summary" }
  | { kind: "divider"; ch: number }
  | { kind: "bab1"; part: 1 | 2 | 3 }
  | { kind: "bab1list"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab2"; part: 1 | 2 | 3 | 4 | 5 }
  | { kind: "bab2hs"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab2co"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab3"; part: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }
  | { kind: "bab3tbl"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab3co"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab4"; part: 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  | { kind: "bab4tbl"; table: "pairs" | "brands" | "shared" | "valid"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab5"; part: 1 | 2 | 3 | 4 }
  | { kind: "bab5tbl"; table: "company" | "certs"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab6"; part: 1 | 2 | 3 }
  | { kind: "bab6tbl"; table: "storage" | "company"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab7"; part: 1 | 2 | 3 | 4 | 5 }
  | { kind: "bab7tbl"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab8"; part: 1 | 2 | 3 }
  | { kind: "bab9"; part: 1 | 2 | 3 | 4 }
  | { kind: "bab10"; part: 1 | 2 | 3 }
  | { kind: "bab10tbl"; table: "analytic" | "recorded"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "bab9tbl"; rows: (string | number)[][]; part: number; parts: number }
  | { kind: "table"; ch: number; table: ExportTable; tableNo: string; rows: (string | number)[][]; part: number; parts: number; first: boolean; landscape: boolean }
  | { kind: "conclusion" }
  | { kind: "appendix" };

const rowsPerPage = (t: ExportTable, landscape: boolean) => {
  const longText = t.headers.some((h) => /Temuan|Isi|Alamat|Uraian/.test(h));
  return landscape ? (longText ? 8 : 12) : longText ? 10 : 16;
};

const chunk = <T,>(rows: T[], size: number): T[][] => (rows.length ? Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size)) : [[]]);

/** The tables a chapter still prints from the export model (chapters without their own figures yet). */
function chapterTables(no: string, sections: ExportSection[]): ExportTable[] {
  const sources = CHAPTERS.find((c) => c.no === no)?.sources ?? [];
  return sources.flatMap((src) => sections.find((s) => s.no === src)?.tables ?? []);
}

/** Page plan, following the reference report: front matter, ten chapters each opened by a divider, closing pages. */
const SHARED_INLINE = 8;
const STORAGE_INLINE = 12;
const STORAGE_HEADERS = ["Perusahaan", "Kota Gudang", "Kapasitas (m³)", "Stok Terkini (m³)", "Volume Pengajuan (m³)", "Kapasitas Terpakai", "Keputusan Analis"];
const SHARED_HEADERS = ["Merek", "Pemilik Merek", "Perusahaan API-U", "Nomor LHVIU", "Product Line", "Rencana Nilai (Rp)"];

function planPages(sections: ExportSection[], companyRows: (string | number)[][], b2: { hsTable: (string | number)[][]; companyTable: (string | number)[][] }, b3: { countryTable: (string | number)[][]; companyTable: (string | number)[][] }, b4: { pairTable: (string | number)[][]; brandTable: (string | number)[][]; shared: (string | number)[][]; validityRows: (string | number)[][] }, b5: { companyTable: (string | number)[][]; certTable: (string | number)[][] }, b6: { storageTable: (string | number)[][]; companyTable: (string | number)[][] }, b7: { table: (string | number)[][]; withModal: unknown[] }, b9: { table: (string | number)[][] }, b10: { analyticTable: (string | number)[][]; recordedTable: (string | number)[][] }): Plan[] {
  // Pendahuluan runs ~500 words, so it gets two pages rather than overflowing one A4 sheet.
  const plan: Plan[] = [{ kind: "approval" }, { kind: "toc" }, { kind: "glossary" }, { kind: "intro", part: 1 }, { kind: "intro", part: 2 }, { kind: "summary" }];
  CHAPTERS.forEach((chapter, ch) => {
    plan.push({ kind: "divider", ch });
    if (chapter.no === "8.2") {
      plan.push({ kind: "bab1", part: 1 }, { kind: "bab1", part: 2 }, { kind: "bab1", part: 3 });
      const parts = chunk(companyRows, 16);
      parts.forEach((rows, i) => plan.push({ kind: "bab1list", rows, part: i + 1, parts: parts.length }));
      return;
    }
    if (chapter.no === "8.3") {
      plan.push({ kind: "bab2", part: 1 }, { kind: "bab2", part: 2 }, { kind: "bab2", part: 3 });
      const hs = chunk(b2.hsTable, 16);
      hs.forEach((rows, i) => plan.push({ kind: "bab2hs", rows, part: i + 1, parts: hs.length }));
      plan.push({ kind: "bab2", part: 4 }, { kind: "bab2", part: 5 });
      const co = chunk(b2.companyTable, 16);
      co.forEach((rows, i) => plan.push({ kind: "bab2co", rows, part: i + 1, parts: co.length }));
      return;
    }
    if (chapter.no === "8.4") {
      plan.push({ kind: "bab3", part: 1 }, { kind: "bab3", part: 2 }, { kind: "bab3", part: 3 }, { kind: "bab3", part: 4 });
      const ct = chunk(b3.countryTable, 16);
      ct.forEach((rows, i) => plan.push({ kind: "bab3tbl", rows, part: i + 1, parts: ct.length }));
      plan.push({ kind: "bab3", part: 5 }, { kind: "bab3", part: 6 }, { kind: "bab3", part: 7 }, { kind: "bab3", part: 8 });
      const co = chunk(b3.companyTable, 16);
      co.forEach((rows, i) => plan.push({ kind: "bab3co", rows, part: i + 1, parts: co.length }));
      return;
    }
    if (chapter.no === "8.5") {
      const push = (table: "pairs" | "brands" | "shared" | "valid", rows: (string | number)[][], size: number) => {
        const parts = chunk(rows, size);
        parts.forEach((r, i) => plan.push({ kind: "bab4tbl", table, rows: r, part: i + 1, parts: parts.length }));
      };
      plan.push({ kind: "bab4", part: 1 }, { kind: "bab4", part: 2 }, { kind: "bab4", part: 3 }, { kind: "bab4", part: 4 }, { kind: "bab4", part: 5 });
      push("pairs", b4.pairTable, 12);
      plan.push({ kind: "bab4", part: 6 });
      push("brands", b4.brandTable, 12);
      plan.push({ kind: "bab4", part: 7 });
      // A short Tabel 4.4 sits on the 4.7 page (SHARED_INLINE); a long one gets its own pages.
      if (b4.shared.length > SHARED_INLINE) push("shared", b4.shared, 22);
      push("valid", b4.validityRows, 22);
      return;
    }
    if (chapter.no === "8.7") {
      plan.push({ kind: "bab5", part: 1 }, { kind: "bab5", part: 2 }, { kind: "bab5", part: 3 }, { kind: "bab5", part: 4 });
      for (const [table, rows] of [["company", b5.companyTable], ["certs", b5.certTable]] as const) {
        // The first company page also carries the 5.7 heading and paragraph, so it takes fewer rows.
        const parts = table === "company" && rows.length > 8 ? [rows.slice(0, 8), ...chunk(rows.slice(8), 12)] : chunk(rows, 12);
        parts.forEach((r, i) => plan.push({ kind: "bab5tbl", table, rows: r, part: i + 1, parts: parts.length }));
      }
      return;
    }
    if (chapter.no === "8.8") {
      plan.push({ kind: "bab6", part: 1 }, { kind: "bab6", part: 2 }, { kind: "bab6", part: 3 });
      // Tabel 6.1 (kapasitas gudang) shares the 6.4 page when short; Tabel 6.2 opens with the 6.5 heading.
      if (b6.storageTable.length > STORAGE_INLINE) chunk(b6.storageTable, 20).forEach((rows, i, all) => plan.push({ kind: "bab6tbl", table: "storage", rows, part: i + 1, parts: all.length }));
      const co = b6.companyTable.length > 9 ? [b6.companyTable.slice(0, 9), ...chunk(b6.companyTable.slice(9), 13)] : [b6.companyTable];
      co.forEach((rows, i) => plan.push({ kind: "bab6tbl", table: "company", rows, part: i + 1, parts: co.length }));
      return;
    }
    if (chapter.no === "8.9") {
      plan.push({ kind: "bab7", part: 1 }, { kind: "bab7", part: 2 }, { kind: "bab7", part: 3 });
      if (b7.withModal.length) plan.push({ kind: "bab7", part: 4 });
      plan.push({ kind: "bab7", part: 5 });
      // The first page of Tabel 7.1 also carries the 7.6 heading and paragraph.
      const parts = b7.table.length > 9 ? [b7.table.slice(0, 9), ...chunk(b7.table.slice(9), 13)] : [b7.table];
      parts.forEach((rows, i) => plan.push({ kind: "bab7tbl", rows, part: i + 1, parts: parts.length }));
      return;
    }
    if (chapter.no === "8.10") {
      plan.push({ kind: "bab8", part: 1 }, { kind: "bab8", part: 2 }, { kind: "bab8", part: 3 });
      return;
    }
    if (chapter.no === "8.13") {
      plan.push({ kind: "bab10", part: 1 });
      // Findings carry long text: few rows per landscape page; the first analytic page also has the 10.2 heading.
      const an = b10.analyticTable.length > 8 ? [b10.analyticTable.slice(0, 8), ...chunk(b10.analyticTable.slice(8), 11)] : [b10.analyticTable];
      an.forEach((rows, i) => plan.push({ kind: "bab10tbl", table: "analytic", rows, part: i + 1, parts: an.length }));
      plan.push({ kind: "bab10", part: 2 });
      if (b10.recordedTable.length) chunk(b10.recordedTable, 9).forEach((rows, i, all) => plan.push({ kind: "bab10tbl", table: "recorded", rows, part: i + 1, parts: all.length }));
      plan.push({ kind: "bab10", part: 3 });
      return;
    }
    if (chapter.no === "8.12f") {
      plan.push({ kind: "bab9", part: 1 }, { kind: "bab9", part: 2 }, { kind: "bab9", part: 3 }, { kind: "bab9", part: 4 });
      chunk(b9.table, 10).forEach((rows, i, all) => plan.push({ kind: "bab9tbl", rows, part: i + 1, parts: all.length }));
      return;
    }
    chapterTables(chapter.no, sections).forEach((table, tableIndex) => {
      const landscape = table.headers.length > 6;
      const parts = chunk(table.rows, rowsPerPage(table, landscape));
      parts.forEach((rows, i) =>
        plan.push({ kind: "table", ch, table, tableNo: `${ch + 1}.${tableIndex + 1}`, rows, part: i + 1, parts: parts.length, first: tableIndex === 0 && i === 0, landscape }),
      );
    });
  });
  plan.push({ kind: "conclusion" }, { kind: "appendix" });
  return plan;
}

function Shell({ pageNo, total, landscape, dark, label, id, children }: { pageNo: number; total: number; landscape?: boolean; dark?: boolean; label?: string; id?: string; children: ReactNode }) {
  return (
    <section
      className={landscape ? "rd-sheet rd-sheet-landscape" : "rd-sheet"}
      id={id}
      style={{ background: dark ? NAVY : CREAM, color: dark ? "#fff" : INK, padding: "40px 48px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}
    >
      {dark && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: ORANGE_LIGHT }} />}
      <PageHead dark={dark} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, marginTop: 18 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: dark ? "#8a97a8" : MUTED_2, borderTop: `1px solid ${dark ? "#1e2a38" : CARD_BORDER}`, paddingTop: 12, marginTop: 12 }}>
        <div>{label ?? "Laporan Pelaksanaan VIU Barang Konsumsi — Pelaporan Pasal 47"}</div>
        <div>{pageNo} dari {total}</div>
      </div>
    </section>
  );
}

function DataTable({ table, rows }: { table: Pick<ExportTable, "headers" | "rows">; rows: (string | number)[][] }) {
  return (
    <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
        <thead>
          <tr style={{ background: "#f2e9d9" }}>
            <th style={{ padding: "7px 8px", textAlign: "left", color: "#5c5346", fontSize: 9 }}>NO</th>
            {table.headers.map((h) => <th key={h} style={{ padding: "7px 8px", textAlign: "left", color: "#5c5346", fontSize: 9, textTransform: "uppercase" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={table.headers.length + 1} style={{ padding: 16, textAlign: "center", color: MUTED_2 }}>Tidak ada data pada periode ini.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${CARD_BORDER}`, ...(r[0] === "Total" ? { fontWeight: 800, background: "#f2e9d9" } : {}) }}>
              <td style={{ padding: "6px 8px", color: MUTED_2, verticalAlign: "top" }}>{r[0] === "Total" ? "" : (table.rows.indexOf(r) + 1) || i + 1}</td>
              {r.map((c, j) => <td key={j} style={{ padding: "6px 8px", verticalAlign: "top", textAlign: typeof c === "number" ? "right" : "left", fontVariantNumeric: "tabular-nums" }}>{typeof c === "number" ? nf(c) : c || "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", color: ORANGE_TEXT }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: MUTED }}>{sub}</div>}
    </div>
  );
}

export function Pasal47Report({ periodKey }: { periodKey: string | null }) {
  const period: ReportingPeriod = resolvePeriod(periodKey, new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "pasal47", period.from, period.to],
    queryFn: async () => {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47?from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return ((await res.json()) as { data: { dataset: P47Dataset; report: P47Report } }).data;
    },
  });
  const backHref = `/project-manager-workspace/viu/konsumsi/laporan-kemenperin?periode=${period.key}&halaman=kesimpulan`;

  if (isLoading) return <div style={{ padding: 32, textAlign: "center", color: MUTED_2 }}>Menyusun laporan…</div>;
  if (isError || !data) return <div style={{ padding: 32, textAlign: "center", color: "#7a1f14" }}>Laporan gagal dimuat. <Link href={backHref}>Kembali</Link></div>;

  const { dataset: ds, report } = data;
  const sections = buildExportSections(ds, report, EXPORT_PARTS.map(([no]) => no));
  const b1 = bab1(ds);
  const b2 = bab2(ds);
  const b3 = bab3(ds);
  const b4 = bab4(ds);
  const b5 = bab5(ds);
  const b6 = bab6(ds);
  const b7 = bab7(ds);
  const b8 = bab8(ds);
  const b9 = bab9(ds);
  const b10 = bab10(ds, report, kbliNonCompliant(ds));
  const plan = planPages(sections, b1.companyRows, b2, b3, b4, b5, b6, b7, b9, b10);
  const rp = (v: number) => `Rp ${compact(v)}`;
  const pc = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "0%");
  const money = (v: number, cur = b2.currency) => `${sym(cur)} ${compact(v)}`;
  const unitCols = b2.units.map((u) => `Rencana Kebutuhan (${u})`);
  const total = plan.length;
  const pageOf = (pred: (p: Plan) => boolean) => plan.findIndex(pred) + 1;
  const intro = introductionParagraphs(ds, report);
  const INTRO_SPLIT = 4;
  const k = kpis(ds, report);
  const ex = executiveSummary(ds, report);
  const value = planValues(ds);
  const preparedOn = report.updatedAt ?? ds.generatedAt;
  const isApproved = report.status === "APPROVED";
  const badge = STATUS_BADGE[report.status];
  const SOURCE = `data sistem per ${new Date(ds.generatedAt).toLocaleString("id-ID")}, diolah`;
  const h1 = (text: string) => <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px", lineHeight: 1.15 }}>{text}</h1>;
  const lead = (text: string) => <p style={{ fontSize: 12.5, lineHeight: 1.6, color: MUTED, margin: "0 0 10px" }}>{text}</p>;
  const brandsActive = ds.brands.filter((b) => b.registrationNumber).length;

  const tocRows: [string, string, number, string, boolean][] = [
    ["i", "Halaman Persetujuan", pageOf((p) => p.kind === "approval"), "persetujuan", false],
    ["ii", "Daftar Isi", pageOf((p) => p.kind === "toc"), "daftar-isi", false],
    ["iii", "Daftar Istilah dan Singkatan", pageOf((p) => p.kind === "glossary"), "istilah", false],
    ["iv", "Pendahuluan", pageOf((p) => p.kind === "intro"), "pendahuluan", false],
    ["v", "Ringkasan Eksekutif", pageOf((p) => p.kind === "summary"), "ringkasan", false],
    ...CHAPTERS.map((c, ch): [string, string, number, string, boolean] => [String(ch + 1), `Bab ${ch + 1}  ${c.title}`, pageOf((p) => p.kind === "divider" && p.ch === ch), `bab-${ch + 1}`, true]),
    ["K", "Kesimpulan dan Rekomendasi", pageOf((p) => p.kind === "conclusion"), "kesimpulan", true],
    ["L", "Lampiran: Sumber Data dan Keterbatasan", pageOf((p) => p.kind === "appendix"), "lampiran", false],
  ];

  const page = (p: Plan, i: number): ReactNode => {
    const n = i + 1;
    switch (p.kind) {
      case "approval":
        return (
          <Shell key={i} pageNo={n} total={total} id="persetujuan">
            <Eyebrow>HALAMAN PERSETUJUAN</Eyebrow>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 14px" }}>Persetujuan Laporan</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, maxWidth: 640, margin: 0 }}>
              Laporan ini disusun sebagai pelaporan pelaksanaan Verifikasi Importir Umum (VIU) Produk Tekstil sebagai Barang Konsumsi sebagaimana dimaksud dalam Pasal 47 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, berdasarkan data permohonan, hasil verifikasi dokumen, survei lapangan, dan analisis teknis pada periode {fdLong(period.from)} sampai dengan {fdLong(period.to)}.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 36 }}>
              <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, padding: 20, borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: "#4a8c6a", marginBottom: 10 }}>DISUSUN OLEH</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{report.updatedByName ?? "Project Manager"}</div>
                <div style={{ fontSize: 12, color: "#7a7166", marginBottom: 22 }}>Project Manager</div>
                <div style={{ borderTop: "1px dashed #d8cdb8", paddingTop: 10, fontSize: 11, fontWeight: 600, color: GREEN }}>● {fdLong(preparedOn.slice(0, 10))}</div>
              </div>
              <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, padding: 20, borderRadius: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: ORANGE_TEXT, marginBottom: 10 }}>STATUS LAPORAN</div>
                <Badge color={badge.color} bg={badge.bg}>{STATUS_LABEL[report.status]}</Badge>
                <div style={{ fontSize: 12, color: "#7a7166", marginTop: 14 }}>{isApproved ? "Laporan telah disetujui Project Manager dan siap disampaikan kepada Kementerian Perindustrian." : "Laporan belum disetujui; isi dapat berubah mengikuti data dan penelaahan Project Manager."}</div>
              </div>
            </div>
            <div style={{ marginTop: 36 }}>
              <Eyebrow>RIWAYAT DOKUMEN</Eyebrow>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff", borderRadius: 10, overflow: "hidden" }}>
                <thead><tr style={{ background: "#f2e9d9" }}>{["PERIODE", "STATUS", "DIPERBARUI", "KLASIFIKASI"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, color: "#5c5346" }}>{h}</th>)}</tr></thead>
                <tbody><tr>
                  <td style={{ padding: 12 }}>{period.label}</td>
                  <td style={{ padding: 12 }}><Badge color={badge.color} bg={badge.bg}>{STATUS_LABEL[report.status]}</Badge></td>
                  <td style={{ padding: 12 }}>{report.updatedAt ? new Date(report.updatedAt).toLocaleString("id-ID") : "Belum pernah disimpan"}</td>
                  <td style={{ padding: 12, color: ORANGE_TEXT, fontWeight: 600 }}>Internal — Terbatas</td>
                </tr></tbody>
              </table>
            </div>
          </Shell>
        );
      case "toc":
        return (
          <Shell key={i} pageNo={n} total={total} id="daftar-isi">
            <Eyebrow>DAFTAR ISI</Eyebrow>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 18px" }}>Daftar Isi</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tocRows.map(([no, label, pg, anchor, chapter]) => (
                <a key={anchor} href={`#${anchor}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: "6px 14px", textDecoration: "none", color: INK }}>
                  <span style={{ minWidth: 36, height: 22, borderRadius: 11, background: chapter ? ORANGE : NAVY, color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 6px" }}>{no}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{pg}</span>
                </a>
              ))}
            </div>
          </Shell>
        );
      case "glossary":
        return (
          <Shell key={i} pageNo={n} total={total} id="istilah">
            <Eyebrow>DAFTAR ISTILAH DAN SINGKATAN</Eyebrow>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 16px" }}>Daftar Istilah dan Singkatan</h1>
            <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead><tr style={{ background: "#f2e9d9" }}><th style={{ textAlign: "left", padding: "8px 10px", fontSize: 9.5, color: "#5c5346", width: 170 }}>ISTILAH</th><th style={{ textAlign: "left", padding: "8px 10px", fontSize: 9.5, color: "#5c5346" }}>PENGERTIAN DALAM LAPORAN INI</th></tr></thead>
                <tbody>{GLOSSARY.map(([term, meaning]) => <tr key={term} style={{ borderTop: `1px solid ${CARD_BORDER}` }}><td style={{ padding: "8px 10px", verticalAlign: "top" }}><b>{term}</b></td><td style={{ padding: "8px 10px", lineHeight: 1.5 }}>{meaning}</td></tr>)}</tbody>
              </table>
            </div>
          </Shell>
        );
      case "intro": {
        const paragraphs = p.part === 1 ? intro.slice(0, INTRO_SPLIT) : intro.slice(INTRO_SPLIT);
        return (
          <Shell key={i} pageNo={n} total={total} id={p.part === 1 ? "pendahuluan" : undefined}>
            <Eyebrow>{p.part === 1 ? "PENDAHULUAN" : "PENDAHULUAN (LANJUTAN)"}</Eyebrow>
            {p.part === 1 && (
              <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px" }}>
                Pendahuluan Laporan Pelaksanaan VIU
                <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: MUTED, marginTop: 4 }}>Produk Tekstil sebagai Barang Konsumsi</span>
              </h1>
            )}
            {paragraphs.map((text) => (
              <p key={text} style={{ fontSize: 12.5, lineHeight: 1.7, color: INK, margin: "0 0 12px", textAlign: "justify" }}>{text}</p>
            ))}
          </Shell>
        );
      }
      case "summary":
        return (
          <Shell key={i} pageNo={n} total={total} id="ringkasan">
            <Eyebrow>RINGKASAN EKSEKUTIF</Eyebrow>
            {h1("Ringkasan Eksekutif")}
            {lead(ex.lead)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 6 }}>
              <Tile label="API-U" value={k.companies} sub={`${k.applications} permohonan`} />
              <Tile label="LHVIU" value={k.lhviu} sub="telah diterbitkan" />
              <Tile label="POS TARIF/HS" value={k.hs} sub="dalam rencana impor" />
              <Tile label="MEREK" value={k.brands} sub={`${k.countries} negara asal`} />
              <Tile label="PRODUCT LINE" value={k.lines} sub={`${nf(k.relations)} relasi negara`} />
              <Tile label="NILAI RENCANA" value={value.total ? `${sym(value.currency)} ${compact(value.total)}` : "—"} sub={value.unconverted ? `${value.unconverted} product line tanpa kurs` : "kuantitas × harga satuan"} />
              <Tile label="BUKTI MEREK" value={`${brandsActive}/${ds.brands.length}`} sub="sertifikat/tanda pendaftaran" />
              <Tile label="UJI MUTU LENGKAP" value={`${ds.technical.filter((t) => t.status.tone === "ok").length}/${ds.technical.length}`} sub="sertifikat hasil uji mutu" />
            </div>
            {([["TEMUAN UTAMA", ex.findings], ["REKOMENDASI", ex.recs]] as const).map(([title, items]) =>
              items.length ? (
                <div key={title}>
                  <Eyebrow><span style={{ display: "block", marginTop: 14 }}>{title}</span></Eyebrow>
                  <ol style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 11.5, lineHeight: 1.55 }}>{items.map((t) => <li key={t} style={{ margin: "2px 0" }}>{t}</li>)}</ol>
                </div>
              ) : null,
            )}
            <div style={{ background: ORANGE, color: "#fff", padding: "14px 18px", marginTop: 14, borderRadius: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.85 }}>KESIMPULAN</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>{ex.concl}</div>
            </div>
          </Shell>
        );
      case "divider": {
        const chapter = CHAPTERS[p.ch];
        const d = chapterDivider(chapter.no, ds, report);
        return (
          <Shell key={i} pageNo={n} total={total} dark id={`bab-${p.ch + 1}`} label={`Bab ${p.ch + 1} — ${chapter.title}`}>
            <DividerBody n={p.ch + 1} title={chapter.title} lead={d.lead} scope={d.scope} stats={d.stats} />
          </Shell>
        );
      }
      case "bab1":
        if (p.part === 1) {
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 1</Eyebrow>
              {h1(CHAPTERS[0].title)}
              {lead(SECTION_INTRO["8.2"])}
              <Ikhtisar items={b1.highlights} />
              <SubHead num="1.1" title="Profil dan Periode Penerbitan LHVIU" />
              {b1.sub11.map((t) => <Para key={t}>{t}</Para>)}
              <Figure num="1.1" title="Jumlah LHVIU per Bulan Terbit" source={`${SOURCE}. Bulan terbit menurut Tanggal Terbit LHVIU yang dicatat Project Manager.`}>
                <ColumnChart items={b1.months.map((m) => ({ label: m.label, value: m.companies.length }))} />
              </Figure>
            </Shell>
          );
        }
        if (p.part === 2) {
          const issued = b1.months.filter((m) => m.companies.length);
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 1 · LANJUTAN</Eyebrow>
              <TableCaption num="1.1" title="Jumlah LHVIU per Bulan Terbit" />
              <DataTable
                table={{ headers: ["Bulan Terbit", "Jumlah LHVIU", "Perusahaan"], rows: issued.map((m) => [m.label, m.companies.length, m.companies.join("; ")]) }}
                rows={issued.map((m) => [m.label, m.companies.length, m.companies.join("; ")])}
              />
              <div style={{ fontSize: 10, color: MUTED_2, margin: "6px 0 4px" }}>Sumber: {SOURCE} · {issued.length} baris</div>
              <SubHead num="1.2" title="Kesesuaian KBLI terhadap Persyaratan" />
              {b1.sub12.map((t) => <Para key={t}>{t}</Para>)}
            </Shell>
          );
        }
        return (
          <Shell key={i} pageNo={n} total={total}>
            <Eyebrow>BAB 1 · LANJUTAN</Eyebrow>
            <Figure num="1.2" title="Kesesuaian KBLI terhadap Persyaratan Pasal 37" source={`${SOURCE}. KBLI Utama pada profil perusahaan.`}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: ORANGE_TEXT, margin: "0 0 6px" }}>PERUSAHAAN PER KBLI YANG DIPERSYARATKAN</div>
              <HBarList rows={b1.kbli.required.map((r) => ({ key: r.code, desc: r.description || "Tidak dimiliki", value: r.companies.length, muted: !r.companies.length }))} total={b1.kbli.companies.length} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: ORANGE_TEXT, margin: "14px 0 6px" }}>KOMPOSISI SELURUH KBLI YANG DIMILIKI</div>
              <Donut
                size={112}
                center={String(b1.kbli.pairs)}
                sub="KBLI tercatat"
                segs={[
                  { label: "Termasuk KBLI yang dipersyaratkan", value: b1.kbli.requiredPairs, color: C.own },
                  { label: "Kegiatan usaha lain", value: b1.kbli.pairs - b1.kbli.requiredPairs, color: C.na },
                ]}
              />
            </Figure>
            <SubHead num="1.3" title="Daftar Perusahaan API-U dan Status LHVIU" />
            {b1.sub13.map((t) => <Para key={t}>{t}</Para>)}
            <p style={{ fontSize: 12, fontStyle: "italic", color: MUTED, margin: "2px 0 0" }}>→ Tabel 1.2 disajikan pada halaman berikut (orientasi landscape).</p>
            <Limits items={b1.limits} />
          </Shell>
        );
      case "bab1list":
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>BAB 1 · LANJUTAN SUBBAGIAN 1.3</Eyebrow>
            <TableCaption num="1.2" title={`Daftar Perusahaan API-U dan Status LHVIU per ${fdLong(ds.generatedAt.slice(0, 10))}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable
              table={{ headers: ["Perusahaan", "Nomor LHVIU", "Status LHVIU", "Tanggal Terbit", "Berlaku s.d.", "Sisa Masa Berlaku", "NIB", "Jumlah KBLI", "Product Line", "Merek"], rows: b1.companyRows }}
              rows={p.rows}
            />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 8 }}>Sumber: {SOURCE} · {b1.companyRows.length} baris</div>}
          </Shell>
        );
      case "bab2":
        if (p.part === 1) {
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 2</Eyebrow>
              {h1(CHAPTERS[1].title)}
              {lead(SECTION_INTRO["8.3"])}
              <Ikhtisar items={b2.highlights} />
              <SubHead num="2.1" title="Kelompok Komoditas" />
              {b2.sub21.map((t) => <Para key={t}>{t}</Para>)}
              {b2.groups.length > 0 && (
                <Figure num="2.1" title="Komposisi Product Line menurut Kelompok Komoditas" source={SOURCE}>
                  <Donut
                    center={nf(ds.lines.length)}
                    sub="product line"
                    segs={b2.groups.map((g, gi) => ({ label: g.kelompok, value: g.lines, color: SERIES_COLORS[(gi + 2) % SERIES_COLORS.length], note: `${g.hs} HS · ${g.companies} API-U` }))}
                  />
                </Figure>
              )}
            </Shell>
          );
        }
        if (p.part === 2) {
          const volSegs = b2.chapters.filter((c) => c.qty > 0).map((c, ci) => ({ label: c.label, value: c.qty, color: SERIES_COLORS[ci % SERIES_COLORS.length] }));
          const valSegs = b2.chapters.filter((c) => c.value > 0).map((c, ci) => ({ label: c.label, value: Math.round(c.value), color: SERIES_COLORS[ci % SERIES_COLORS.length] }));
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 2 · LANJUTAN</Eyebrow>
              <TableCaption num="2.1" title="Ringkasan Kelompok Komoditas" />
              <DataTable table={{ headers: ["Kelompok Komoditas", "Jumlah Pos Tarif/HS", "Product Line", "Jumlah API-U", ...unitCols], rows: b2.groupTable }} rows={b2.groupTable} />
              <div style={{ fontSize: 10, color: MUTED_2, margin: "6px 0 4px" }}>Sumber: {SOURCE} · baris terakhir merupakan total</div>
              <SubHead num="2.2" title="Sebaran Pos Tarif/HS menurut Bab BTKI" />
              {b2.sub22.map((t) => <Para key={t}>{t}</Para>)}
              <Figure num="2.2" title="Komposisi Rencana Impor per Bab HS" source={`${SOURCE}. Volume dalam satuan ${b2.unit}; nilai dalam Rupiah.`}>
                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: ORANGE_TEXT, marginBottom: 6 }}>RENCANA VOLUME ({b2.unit})</div>
                    <Donut size={104} center={compact(b2.totalQty[0] ?? 0)} sub={b2.unit} segs={volSegs} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: ORANGE_TEXT, marginBottom: 6 }}>RENCANA NILAI (Rp)</div>
                    <Donut size={104} center={compact(b2.totalValue)} sub="Rupiah" segs={valSegs} fmt={rp} />
                  </div>
                </div>
              </Figure>
            </Shell>
          );
        }
        if (p.part === 3) {
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 2 · LANJUTAN</Eyebrow>
              <SubHead num="2.3" title="Rencana Kebutuhan per Pos Tarif/HS" />
              {b2.sub23.map((t) => <Para key={t}>{t}</Para>)}
              <Figure num="2.3" title="Sepuluh Pos Tarif/HS Teratas menurut Rencana Volume dan Rencana Nilai" source={`${SOURCE}. Volume dalam satuan ${b2.unit}; nilai = kuantitas × harga satuan rata-rata, dalam Rupiah.`}>
                <RankColumns
                  cols={[
                    { title: `Volume terbanyak (${b2.unit})`, color: "#b4561a", format: (v) => `${nf(v)} ${b2.unit}`, total: b2.totalQty[0] ?? 0, rows: b2.topVolume },
                    { title: "Nilai terbesar (Rp)", color: "#187a61", format: (v) => money(v), total: b2.totalValue, rows: b2.topValue },
                  ]}
                />
              </Figure>
              <p style={{ fontSize: 12, fontStyle: "italic", color: MUTED, margin: "2px 0 0" }}>→ Tabel 2.2 disajikan pada halaman berikut (orientasi landscape).</p>
            </Shell>
          );
        }
        if (p.part === 4) {
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 2 · LANJUTAN</Eyebrow>
              <SubHead num="2.4" title="Rencana Impor menurut Periode Pelaksanaan VIU" />
              {b2.sub24.map((t) => <Para key={t}>{t}</Para>)}
              <Figure num="2.4" title="Rencana Impor menurut Periode Pelaksanaan VIU" source={`${SOURCE}. Per bulan terbit LHVIU; rencana impor, bukan realisasi impor.`}>
                <ColumnPanels
                  labels={b2.months.map((m) => m.label)}
                  panels={[
                    { title: "Jumlah VIU diselesaikan", color: C.rent, values: b2.months.map((m) => m.viu), format: (v) => String(v) },
                    { title: `Rencana volume (${b2.unit})`, color: C.own, values: b2.months.map((m) => m.qty), format: (v) => compact(v) },
                    { title: "Rencana nilai (Rp)", color: C.c3, values: b2.months.map((m) => m.value), format: (v) => compact(v) },
                  ]}
                />
              </Figure>
            </Shell>
          );
        }
        {
          const dated = b2.months.filter((m) => m.viu);
          const datedValue = dated.reduce((a, m) => a + m.value, 0);
          const monthRows: (string | number)[][] = [
            ...dated.map((m) => [m.label, m.viu, m.lines, m.qty, Math.round(m.value), datedValue ? `${((m.value / datedValue) * 100).toFixed(1).replace(".", ",")}%` : "—"]),
            ...(dated.length ? [["Total", dated.reduce((a, m) => a + m.viu, 0), dated.reduce((a, m) => a + m.lines, 0), dated.reduce((a, m) => a + m.qty, 0), Math.round(datedValue), "100%"]] : []),
          ];
          return (
            <Shell key={i} pageNo={n} total={total}>
              <Eyebrow>BAB 2 · LANJUTAN</Eyebrow>
              <Figure num="2.5" title={`Tren Rencana Volume per Bab HS menurut Periode Pelaksanaan VIU (${b2.unit})`} source={`${SOURCE}. Per bulan terbit LHVIU; rencana impor, bukan realisasi impor.`}>
                <LineSeries labels={b2.months.map((m) => m.label)} series={b2.monthSeries} />
              </Figure>
              <TableCaption num="2.3" title="Rencana Impor menurut Periode Pelaksanaan VIU" />
              <DataTable table={{ headers: ["Bulan Terbit LHVIU", "Jumlah VIU", "Product Line", `Rencana Volume (${b2.unit})`, "Rencana Nilai (Rp)", "Share Nilai"], rows: monthRows }} rows={monthRows} />
              <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE}{b2.undatedViu ? ` · ${b2.undatedViu} VIU belum dicatat tanggal terbit LHVIU-nya` : ""}</div>
            </Shell>
          );
        }
      case "bab2hs":
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>BAB 2 · LANJUTAN SUBBAGIAN 2.3</Eyebrow>
            <TableCaption num="2.2" title={`Rencana Kebutuhan per Pos Tarif/HS${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: ["Pos Tarif/HS", "Uraian Barang", "Kelompok Komoditas", "Jumlah API-U", "Product Line", "Rencana Kebutuhan", "Satuan"], rows: b2.hsTable }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 8 }}>Sumber: {SOURCE} · {b2.hsTable.length} baris · diurutkan menurut rencana volume ({b2.unit})</div>}
          </Shell>
        );
      case "bab2co":
        return (
          <Shell key={i} pageNo={n} total={total}>
            <Eyebrow>BAB 2 · LANJUTAN</Eyebrow>
            {p.part === 1 && <SubHead num="2.5" title="Ragam Komoditas per Perusahaan" />}
            {p.part === 1 && b2.sub25.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num="2.4" title={`Ragam Komoditas per Perusahaan${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: ["Perusahaan", "Product Line", "Pos Tarif/HS", "Kelompok Utama", "Jumlah Kelompok", ...unitCols], rows: b2.companyTable }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {b2.companyTable.length} baris</div>}
            {p.part === p.parts && <Limits items={b2.limits} />}
          </Shell>
        );
      case "bab3": {
        const top = b3.countries[0];
        const head = (title: string) => (
          <>
            <Eyebrow>BAB 3 · LANJUTAN</Eyebrow>
            {title && <SubHead num={title.split(" ")[0]} title={title.slice(title.indexOf(" ") + 1)} />}
          </>
        );
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 3</Eyebrow>
                {h1(CHAPTERS[2].title)}
                {lead(SECTION_INTRO["8.4"])}
                <Ikhtisar items={b3.highlights} />
                <SubHead num="3.1" title="Negara Asal Produk" />
                <Para>{b3.sub31[0]}</Para>
                {top && (
                  <Figure num="3.1" title="Jumlah Negara Asal Produk" source={SOURCE}>
                    <KpiTiles
                      tiles={[
                        [String(b3.countries.length), "NEGARA ASAL", "tercantum dalam rencana impor"],
                        [String(b3.regions.length), "KAWASAN", b3.regions.map((r) => r.region).join(", ")],
                        [nf(b3.relations), "RELASI PRODUCT LINE–NEGARA", `rata-rata ${(b3.relations / Math.max(ds.lines.length, 1)).toFixed(1).replace(".", ",")} negara per product line`],
                        [pc(top.lines, ds.lines.length), `PRODUCT LINE DENGAN ${top.name.toUpperCase()}`.slice(0, 40), `${nf(top.lines)} dari ${nf(ds.lines.length)} product line`],
                      ]}
                    />
                  </Figure>
                )}
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 3 · LANJUTAN</Eyebrow>
                {b3.sub31[1] && <Para>{b3.sub31[1]}</Para>}
                <Figure num="3.2" title="Peta Sebaran Negara Asal Produk" source={`${SOURCE}. Intensitas warna menurut estimasi rencana nilai (alokasi merata). Peta disederhanakan; negara kecil ditandai dengan titik.${b3.unmapped.length ? ` Tidak tergambar: ${b3.unmapped.join(", ")}.` : ""}`}>
                  <WorldMap base={WORLD_BASE} width={MAP_W} height={MAP_H} bins={b3.bins} legendFormat={rp} countries={b3.countries.filter((c) => c.shape).map((c) => ({ name: c.name, path: c.shape!.path, pt: c.shape!.pt, value: c.value }))} />
                </Figure>
                <SubHead num="3.2" title="Rencana Volume, Nilai, dan Share per Negara" />
                {b3.sub32.map((t) => <Para key={t}>{t}</Para>)}
              </Shell>
            );
          case 3: {
            const segs = (key: "value" | "qty") => {
              const top5 = b3.countries.slice(0, 5).map((c, ci) => ({ label: c.name, value: Math.round(c[key]), color: SERIES_COLORS[ci % SERIES_COLORS.length] }));
              const rest = (key === "value" ? b3.totalValue : b3.totalQty) - top5.reduce((a, x) => a + x.value, 0);
              return rest > 0 ? [...top5, { label: "Negara lainnya", value: Math.round(rest), color: C.na }] : top5;
            };
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 3 · LANJUTAN</Eyebrow>
                <Figure num="3.3" title="Komposisi Negara Asal Produk: Share Nilai dan Share Volume (Estimasi)" source={`${SOURCE}. Estimasi alokasi merata; nilai dalam Rupiah, volume dalam ${b3.unit}.`}>
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: ORANGE_TEXT, marginBottom: 6 }}>SHARE RENCANA NILAI</div>
                      <Donut size={104} center={compact(b3.totalValue)} sub="Rupiah" segs={segs("value")} fmt={rp} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: ORANGE_TEXT, marginBottom: 6 }}>SHARE RENCANA VOLUME ({b3.unit.toUpperCase()})</div>
                      <Donut size={104} center={compact(b3.totalQty)} sub={b3.unit} segs={segs("qty")} />
                    </div>
                  </div>
                </Figure>
                <TableCaption num="3.1" title="Share Nilai dan Volume menurut Kawasan (Estimasi)" />
                <DataTable table={{ headers: ["Kawasan", "Jumlah Negara", "Estimasi Nilai (Rp)", "Share Nilai", `Estimasi Volume (${b3.unit})`, "Share Volume"], rows: b3.regionTable }} rows={b3.regionTable} />
                <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE}</div>
              </Shell>
            );
          }
          case 4:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 3 · LANJUTAN</Eyebrow>
                <Figure num="3.4" title="Sepuluh Negara Asal Teratas menurut Rencana Nilai dan Rencana Volume (Estimasi)" source={`${SOURCE}. Estimasi alokasi merata.`}>
                  <RankColumns
                    cols={[
                      { title: "Rencana nilai (Rp)", color: "#187a61", format: rp, total: b3.totalValue, rows: b3.countries.slice(0, 10).map((c) => ({ key: c.name, label: `${c.region} · share ${pc(c.value, b3.totalValue)}`, value: c.value, note: `${c.viu} VIU · ${c.companies} API-U` })) },
                      { title: `Rencana volume (${b3.unit})`, color: "#b4561a", format: (v) => `${nf(Math.round(v))}`, total: b3.totalQty, rows: [...b3.countries].sort((a, b) => b.qty - a.qty).slice(0, 10).map((c) => ({ key: c.name, label: `${c.region} · share ${pc(c.qty, b3.totalQty)}`, value: c.qty, note: `${c.viu} VIU · ${c.companies} API-U` })) },
                    ]}
                  />
                </Figure>
                <p style={{ fontSize: 12, fontStyle: "italic", color: MUTED, margin: "2px 0 0" }}>→ Tabel 3.2 disajikan pada halaman berikut (orientasi landscape).</p>
              </Shell>
            );
          case 5:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {head("3.3 Tren Rencana Impor per Negara")}
                {b3.sub33.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="3.5" title="Tren Estimasi Rencana Nilai Lima Negara Asal Teratas menurut Periode Pelaksanaan VIU" source={`${SOURCE}. Per bulan terbit LHVIU; estimasi alokasi merata; rencana impor, bukan realisasi.`}>
                  <LineSeries labels={b3.months.map((m) => m.label)} series={b3.top5Series} />
                </Figure>
                {b3.top5Table.rows.length > 0 && b3.top5Table.headers.length > 2 && (
                  <>
                    <TableCaption num="3.3" title="Estimasi Rencana Nilai Lima Negara Asal Teratas per Bulan Terbit LHVIU (Rp)" />
                    <DataTable table={b3.top5Table} rows={b3.top5Table.rows} />
                  </>
                )}
              </Shell>
            );
          case 6:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {head("3.4 Produk/Bab HS per Negara")}
                {b3.sub34.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="3.6" title="Negara × Bab HS: Komposisi Produk Sepuluh Negara Asal Teratas menurut Rencana Nilai (Estimasi)" source={`${SOURCE}. Estimasi alokasi merata; angka di kanan adalah estimasi nilai negara.`}>
                  <StackBars rows={b3.stack} segments={[...b3.babs.map(btkiLabel), "Bab lainnya"]} format={rp} />
                </Figure>
              </Shell>
            );
          case 7:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {head("3.5 Profil Negara Asal Utama: Produk dan Importir")}
                {b3.sub35.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="3.7" title="Profil Negara Asal Teratas: Volume, Nilai, Share, Produk, dan Importir (Estimasi)" source={`${SOURCE}. Estimasi alokasi merata.`}>
                  <ProfileCards
                    cards={b3.profiles.map((pr, pi) => ({
                      rank: pi + 1,
                      title: pr.c.name,
                      sub: `${pr.c.region} · ${pr.c.viu} VIU · ${pr.c.companies} API-U · ${pr.c.hs} pos tarif/HS`,
                      kpis: [[`${nf(Math.round(pr.c.qty))}`, `Volume (${b3.unit})`], [rp(pr.c.value), "Nilai"], [pc(pr.c.value, b3.totalValue), "Share nilai"], [pc(pr.c.qty, b3.totalQty), "Share volume"]],
                      listA: { title: "Pos tarif/HS utama", rows: pr.topHs.map((h) => [`${h.hs}${h.label ? ` · ${h.label}` : ""}`, rp(h.value)] as [string, string]) },
                      listB: { title: "Importir utama", rows: pr.topImporters.map(([nm, v]) => [nm, rp(v)] as [string, string]) },
                    }))}
                  />
                </Figure>
              </Shell>
            );
          default: {
            const b1x = b3.buckets[0];
            return (
              <Shell key={i} pageNo={n} total={total}>
                {head("3.6 Pola Pencantuman Negara Asal")}
                {b3.sub36.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="3.8" title="Jumlah Product Line menurut Banyaknya Negara Asal yang Dicantumkan" source={SOURCE}>
                  <KpiTiles
                    tiles={[
                      [nf(b1x.value), "NEGARA TUNGGAL", `${pc(b1x.value, ds.lines.length)} dari seluruh product line`],
                      [nf(b3.multi), "LEBIH DARI SATU NEGARA", `${pc(b3.multi, ds.lines.length)} dari seluruh product line`],
                      [top && b3.singleTopQty ? pc(b3.singleTopQty, b3.totalQty) : "—", "BATAS BAWAH VOLUME PASTI", top ? `negara tunggal ${top.name}` : ""],
                    ]}
                  />
                  <div style={{ height: 12 }} />
                  <HBarList keyWidth={92} rows={b3.buckets.map((b) => ({ key: b.key, desc: `${b.companies} API-U`, value: b.value }))} total={ds.lines.length} />
                </Figure>
              </Shell>
            );
          }
        }
      }
      case "bab3tbl":
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>BAB 3 · LANJUTAN SUBBAGIAN 3.2</Eyebrow>
            <TableCaption num="3.2" title={`Negara Asal dalam Rencana Impor (Estimasi)${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: ["Negara Asal", "Kawasan", "Jumlah VIU", "Jumlah API-U", "Product Line", `Estimasi Volume (${b3.unit})`, "Share Volume", "Estimasi Nilai (Rp)", "Share Nilai"], rows: b3.countryTable }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 8 }}>Sumber: {SOURCE} · {b3.countryTable.length} baris · estimasi alokasi merata</div>}
          </Shell>
        );
      case "bab3co":
        return (
          <Shell key={i} pageNo={n} total={total}>
            <Eyebrow>BAB 3 · LANJUTAN</Eyebrow>
            {p.part === 1 && <SubHead num="3.7" title="Negara Asal menurut Perusahaan" />}
            {p.part === 1 && b3.sub37.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num="3.4" title={`Negara Asal menurut Perusahaan${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: ["Perusahaan", "Product Line", "Jumlah Negara Asal", "Product Line Negara Tunggal", "Rata-rata Negara per Product Line", "Negara Asal Utama"], rows: b3.companyTable }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {b3.companyTable.length} baris</div>}
            {p.part === p.parts && <Limits items={b3.limits} />}
          </Shell>
        );
      case "bab4": {
        const cont = <Eyebrow>BAB 4 · LANJUTAN</Eyebrow>;
        const pairsDonut = (key: "pairs" | "value") => b4.relRows.filter((r) => r[key] > 0).map((r, ri) => ({ label: r.label, value: Math.round(r[key]), color: ri === 3 ? C.na : SERIES_COLORS[ri % SERIES_COLORS.length] }));
        const originColor = (o: string) => (o === "Lokal" ? SERIES_COLORS[0] : o === "Luar negeri" ? SERIES_COLORS[2] : C.na);
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 4</Eyebrow>
                {h1(CHAPTERS[3].title)}
                {lead(SECTION_INTRO["8.5"])}
                <Ikhtisar items={b4.highlights} />
                <SubHead num="4.1" title="Merek dan Pemilik Merek" />
                {b4.sub41.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.1" title="Ringkasan Struktur Merek" source={`${SOURCE}. Merek dan pemilik dari Merek Management.`}>
                  <KpiTiles
                    tiles={[
                      [String(b4.brands.length), "MEREK", "pada rencana impor"],
                      [String(b4.owners.filter((o) => o.owner !== "Tidak diisi").length), "PEMILIK MEREK", "pemilik merek tercatat"],
                      [String(b4.pairs.length), "PASANGAN MEREK–PEMOHON", "merek × Pemohon VIU"],
                      [String(b4.originRows.find((o) => o.origin === "Luar negeri")?.brands ?? 0), "MEREK LUAR NEGERI", "pemilik berdomisili di luar negeri"],
                    ]}
                  />
                </Figure>
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <Figure num="4.2" title="Pemilik dengan Jumlah Merek Terbanyak" source={`${SOURCE}. Keterangan menunjukkan merek milik pemilik tersebut.`}>
                  <HBarList keyWidth={190} rows={b4.owners.slice(0, 8).map((o) => ({ key: o.owner, desc: `${o.brands.slice(0, 3).join(", ")}${o.brands.length > 3 ? ` +${o.brands.length - 3}` : ""} · ${rp(o.value)}`, value: o.brands.length }))} total={b4.brands.length} />
                </Figure>
                <SubHead num="4.2" title="Asal Merek: Lokal dan Luar Negeri" />
                {b4.sub42.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.3" title="Komposisi Merek Lokal dan Luar Negeri" source={`${SOURCE}. Asal merek menurut domisili pemilik merek.`}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Donut size={96} center={String(b4.brands.length)} sub="merek" segs={b4.originRows.map((o) => ({ label: o.origin, value: o.brands, color: originColor(o.origin) }))} />
                    <Donut size={96} center={compact(b4.totalValue)} sub="Rupiah" fmt={rp} segs={b4.originRows.map((o) => ({ label: o.origin, value: Math.round(o.value), color: originColor(o.origin) }))} />
                  </div>
                </Figure>
              </Shell>
            );
          case 3:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <Figure num="4.4" title="Negara Asal Merek (Domisili Pemilik Merek)" source={SOURCE}>
                  <HBarList keyWidth={150} rows={b4.domiciles.map((d) => ({ key: d.country, desc: `${d.brands.slice(0, 4).join(", ")}${d.brands.length > 4 ? ` +${d.brands.length - 4}` : ""}`, value: d.brands.length }))} total={b4.brands.length} />
                </Figure>
                <SubHead num="4.3" title="Status Pendaftaran Merek" />
                {b4.sub43.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.5" title="Status Pendaftaran Merek" source={`${SOURCE}. Jenis bukti merek pada Merek Management.`}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Donut size={96} center={String(b4.brands.length)} sub="merek" segs={b4.evidenceRows.map((e, ei) => ({ label: e.evidence, value: e.brands, color: /^Tidak/i.test(e.evidence) ? C.na : SERIES_COLORS[ei % SERIES_COLORS.length] }))} />
                    <Donut size={96} center={compact(b4.totalValue)} sub="Rupiah" fmt={rp} segs={b4.evidenceRows.map((e, ei) => ({ label: e.evidence, value: Math.round(e.value), color: /^Tidak/i.test(e.evidence) ? C.na : SERIES_COLORS[ei % SERIES_COLORS.length] }))} />
                  </div>
                </Figure>
                <Figure num="4.6" title="Komposisi Status Pendaftaran Merek menurut Asal Merek" source={`${SOURCE}. Jumlah merek; angka di kanan adalah jumlah merek per asal.`}>
                  <StackBars rows={b4.evidenceByOrigin} segments={b4.evidenceKinds} format={(v) => `${v} merek`} />
                </Figure>
              </Shell>
            );
          case 4:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="4.4" title="Hubungan Pemohon VIU dengan Pemilik Merek" />
                {b4.sub44.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.7" title="Struktur Data Hubungan Merek dan Pemohon VIU" source={`${SOURCE}. Peran dipilih pemohon pada permohonan; status dokumen dari verifikasi dokumen.`}>
                  <KpiTiles
                    tiles={[
                      [String(b4.brands.length), "MEREK", "nama merek"],
                      [String(b4.owners.filter((o) => o.owner !== "Tidak diisi").length), "PEMILIK MEREK", "pemilik tercatat"],
                      [String(new Set(b4.pairs.map((x) => x.company)).size), "PEMOHON VIU", "Perusahaan API-U"],
                      [`${b4.relRows[0].pairs} / ${b4.pairs.length - b4.relRows[0].pairs}`, "PEMILIK / PIHAK LAIN", "jenis hubungan"],
                      [`${b4.pairs.filter((x) => x.doc === "Valid").length}/${b4.pairs.length}`, "DOKUMEN VALID", "dokumen hubungan merek"],
                    ]}
                  />
                </Figure>
                <Figure num="4.8" title="Jenis Hubungan Pemohon VIU dengan Pemilik Merek" source={SOURCE}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Donut size={96} center={String(b4.pairs.length)} sub="pasangan" segs={pairsDonut("pairs")} />
                    <Donut size={96} center={compact(b4.pairs.reduce((a, x) => a + x.value, 0))} sub="Rupiah" fmt={rp} segs={pairsDonut("value")} />
                  </div>
                </Figure>
              </Shell>
            );
          case 5: {
            const pairTotal = b4.relRows.reduce((a, r) => a + r.value, 0);
            const relTable: (string | number)[][] = [
              ...b4.relRows.map((r) => [r.label, r.basis, r.pairs, Math.round(r.value), pc(r.value, pairTotal), `${r.valid}/${r.pairs}`]),
              ["Total", "", b4.pairs.length, Math.round(pairTotal), "100%", `${b4.pairs.filter((x) => x.doc === "Valid").length}/${b4.pairs.length}`],
            ];
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <TableCaption num="4.1" title="Jenis Hubungan, Dasar Dokumen, dan Rencana Impor" />
                <DataTable table={{ headers: ["Jenis Hubungan", "Dasar Dokumen yang Diperlukan", "Jumlah Pasangan", "Rencana Nilai (Rp)", "Share Nilai", "Dokumen Valid"], rows: relTable }} rows={relTable} />
                <div style={{ fontSize: 10, color: MUTED_2, margin: "6px 0 2px" }}>Sumber: {SOURCE} · rincian per pasangan pada Tabel 4.2 (halaman berikut, lanskap)</div>
                <SubHead num="4.5" title="Kelas Merek" />
                {b4.sub45.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.9" title="Jumlah Merek menurut Kelas Merek (Klasifikasi Nice)" source={`${SOURCE}. Kelas yang dicatat pada Merek Management; satu merek dapat terdaftar pada lebih dari satu kelas.`}>
                  <HBarList keyWidth={84} rows={b4.classRows.slice(0, 8).map((c) => ({ key: c.cls, desc: `${c.label} · ${rp(c.value)}`, value: c.brands.length }))} total={b4.brands.length} />
                </Figure>
              </Shell>
            );
          }
          case 6:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="4.6" title="Rencana Impor per Merek dan Importir" />
                {b4.sub46.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.10" title="Sepuluh Merek Teratas menurut Rencana Nilai dan Rencana Volume" source={`${SOURCE}. Nilai dalam Rupiah; volume dalam ${b4.unit}.`}>
                  <RankColumns
                    cols={[
                      { title: "Rencana nilai (Rp)", color: "#187a61", format: rp, total: b4.totalValue, rows: b4.brands.slice(0, 10).map((b) => ({ key: b.name, label: `${b.origin} · ${b.evidence}`, value: b.value, note: `${b.importers.length} API-U · ${b.lines} product line` })) },
                      { title: `Rencana volume (${b4.unit})`, color: "#b4561a", format: (v) => nf(Math.round(v)), total: b4.brands.reduce((a, b) => a + b.qty, 0), rows: [...b4.brands].sort((a, b) => b.qty - a.qty).slice(0, 10).map((b) => ({ key: b.name, label: `${b.origin} · ${b.evidence}`, value: b.qty, note: `${b.importers.length} API-U · ${b.lines} product line` })) },
                    ]}
                  />
                </Figure>
                <p style={{ fontSize: 12, fontStyle: "italic", color: MUTED, margin: "2px 0 0" }}>→ Tabel 4.3 disajikan pada halaman berikut (orientasi landscape).</p>
              </Shell>
            );
          default:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="4.7" title="Tren Jumlah Merek menurut Periode Pelaksanaan VIU" />
                {b4.sub47.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="4.11" title="Jumlah Merek per Bulan Terbit LHVIU dan Kumulatif" source={`${SOURCE}. Per bulan terbit LHVIU.`}>
                  <LineSeries labels={b4.months.map((m) => m.label)} series={[{ label: "Merek dalam VIU yang diselesaikan per bulan", values: b4.months.map((m) => m.count) }, { label: "Jumlah merek kumulatif", values: b4.months.map((m) => m.cumulative) }]} />
                </Figure>
                {b4.shared.length <= SHARED_INLINE && (
                  <>
                    <SubHead num="4.8" title="Merek yang Digunakan oleh Lebih dari Satu Importir" />
                    {b4.sub48.map((t) => <Para key={t}>{t}</Para>)}
                    {b4.shared.length > 0 && (
                      <>
                        <TableCaption num="4.4" title="Merek yang Digunakan oleh Lebih dari Satu Importir" />
                        <DataTable table={{ headers: SHARED_HEADERS, rows: b4.shared }} rows={b4.shared} />
                        <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {b4.shared.length} baris</div>
                      </>
                    )}
                  </>
                )}
              </Shell>
            );
        }
      }
      case "bab4tbl": {
        const spec = {
          pairs: { num: "4.2", sub: "4.4", title: "Merek, Pemilik Merek, Pemohon VIU, Jenis Hubungan, dan Dasar Dokumen", landscape: true, headers: ["Merek", "Pemilik Merek", "Jenis Pemilik", "Pemohon VIU", "Jenis Hubungan", "Dasar Penunjukan", "Status Dokumen Hubungan", "Bukti Merek", `Rencana Volume (${b4.unit})`, "Rencana Nilai (Rp)"], all: b4.pairTable },
          brands: { num: "4.3", sub: "4.6", title: "Struktur Merek dalam Rencana Impor", landscape: true, headers: ["Merek", "Pemilik Merek", "Asal Merek", "Status Pendaftaran", "Kelas", "Importir (API-U)", "Jumlah VIU", `Rencana Volume (${b4.unit})`, "Rencana Nilai (Rp)", "Share Nilai"], all: b4.brandTable },
          shared: { num: "4.4", sub: "", title: "Merek yang Digunakan oleh Lebih dari Satu Importir", landscape: false, headers: SHARED_HEADERS, all: b4.shared },
          valid: { num: "4.5", sub: "", title: `Bukti Kepemilikan Merek per ${fdLong(ds.period.to)}`, landscape: false, headers: ["Merek", "Jenis Bukti", "Nomor Pendaftaran", "Tanggal Pendaftaran", "Berlaku s.d.", "Status"], all: b4.validityRows },
        }[p.table];
        return (
          <Shell key={i} pageNo={n} total={total} landscape={spec.landscape}>
            <Eyebrow>{spec.sub ? `BAB 4 · LANJUTAN SUBBAGIAN ${spec.sub}` : "BAB 4 · LANJUTAN"}</Eyebrow>
            {p.part === 1 && p.table === "shared" && <SubHead num="4.8" title="Merek yang Digunakan oleh Lebih dari Satu Importir" />}
            {p.part === 1 && p.table === "shared" && b4.sub48.map((t) => <Para key={t}>{t}</Para>)}
            {p.part === 1 && p.table === "valid" && <SubHead num="4.9" title="Bukti Kepemilikan Merek" />}
            {p.part === 1 && p.table === "valid" && b4.sub49.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num={spec.num} title={`${spec.title}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: spec.headers, rows: spec.all }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {spec.all.length} baris</div>}
            {p.part === p.parts && p.table === "valid" && <Limits items={b4.limits} />}
          </Shell>
        );
      }
      case "bab5": {
        const cont = <Eyebrow>BAB 5 · LANJUTAN</Eyebrow>;
        const toneColor = (label: string, idx: number) =>
          label === "Lengkap" || label === "Berlaku" || label === "Terverifikasi" ? SERIES_COLORS[1]
          : label === "Tidak dicatat" || label === "Tidak tercatat" || label === "Belum Diverifikasi" ? C.na
          : /Kedaluwarsa|Ditolak|Tidak Lengkap/.test(label) ? SERIES_COLORS[2] : SERIES_COLORS[(idx + 3) % SERIES_COLORS.length];
        const completeCount = b5.certs.filter((c) => c.status.tone === "ok").length;
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 5</Eyebrow>
                {h1(CHAPTERS[4].title)}
                {lead(SECTION_INTRO["8.7"])}
                <Ikhtisar items={b5.highlights} />
                <SubHead num="5.1" title="Ketentuan dan Cakupan Bukti Pemenuhan" />
                {b5.sub51.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="5.1" title="Ringkasan Bukti Pemenuhan Persyaratan Teknis" source={`${SOURCE}. Sertifikat dikaitkan ke product line menurut permohonan, merek, dan sub kelompok.`}>
                  <KpiTiles
                    tiles={[
                      [`${nf(b5.covered.length)}/${nf(ds.lines.length)}`, "PRODUCT LINE TERCAKUP", "sesuai merek dan sub kelompok"],
                      [String(b5.certs.length), "SERTIFIKAT UJI MUTU", "merek × sub kelompok"],
                      [String(b5.labs.filter((l) => l.lab !== "Tidak dicatat").length), "LABORATORIUM", "penerbit sertifikat"],
                      [`${completeCount}/${b5.certs.length}`, "SERTIFIKAT LENGKAP", "hasil verifikasi"],
                      [pc(b5.coveredValue, b5.totalValue), "NILAI TERCAKUP", rp(b5.coveredValue)],
                    ]}
                  />
                </Figure>
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="5.2" title="Status Sertifikat Hasil Uji Mutu" />
                {b5.sub52.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="5.2" title="Status Sertifikat menurut Jumlah Sertifikat dan Product Line" source={`${SOURCE}. Status dari verifikasi dokumen dan pemeriksaan sistem.`}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Donut size={96} center={String(b5.certs.length)} sub="sertifikat" segs={b5.statusRows.map((r, ri) => ({ label: r.label, value: r.certs, color: toneColor(r.label, ri) }))} />
                    <Donut size={96} center={nf(b5.covered.length)} sub="product line" segs={b5.statusRows.map((r, ri) => ({ label: r.label, value: r.lines, color: toneColor(r.label, ri) }))} />
                  </div>
                </Figure>
                <SubHead num="5.3" title="Laboratorium Penguji" />
                {b5.sub53.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="5.3" title="Sertifikat menurut Laboratorium Penguji" source={`${SOURCE}. Keterangan menunjukkan jumlah perusahaan dan product line yang tercakup.`}>
                  <HBarList keyWidth={230} rows={b5.labs.slice(0, 8).map((l) => ({ key: l.lab, desc: `${l.companies.length} perusahaan · ${nf(l.lines)} product line`, value: l.certs, muted: l.lab === "Tidak dicatat" }))} total={b5.certs.length} />
                </Figure>
              </Shell>
            );
          case 3:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="5.4" title="Masa Berlaku dan Batas Pengajuan" />
                {b5.sub54.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="5.4" title={`Masa Berlaku Sertifikat per ${fdLong(ds.period.to)}`} source={`${SOURCE}. Segera berakhir: tersisa 3 bulan atau kurang.`}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Donut size={96} center={String(b5.certs.length)} sub="sertifikat" segs={b5.validityRows.map((r, ri) => ({ label: r.label, value: r.certs, color: toneColor(r.label, ri) }))} />
                    <Donut size={96} center={nf(b5.covered.length)} sub="product line" segs={b5.validityRows.map((r, ri) => ({ label: r.label, value: r.lines, color: toneColor(r.label, ri) }))} />
                  </div>
                </Figure>
                <SubHead num="5.5" title="Satu Sertifikat untuk Beberapa Product Line" />
                {b5.sub55.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="5.5" title="Product Line dan Sertifikat per Perusahaan" source={`${SOURCE}. Panjang batang: jumlah product line; keterangan: jumlah sertifikat dan rata-rata product line per sertifikat, atau product line yang belum tercakup.`}>
                  <HBarList keyWidth={200} rows={b5.companies.slice(0, 12).map((c) => ({ key: c.company, desc: !c.certs ? "Belum ada sertifikat" : c.uncovered ? `${c.certs} sertifikat · ${c.uncovered} line belum tercakup` : `${c.certs} sertifikat · ${(c.covered / c.certs).toFixed(1).replace(".", ",")} line/sertifikat`, value: c.lines, muted: !c.certs }))} total={ds.lines.length} />
                </Figure>
              </Shell>
            );
          default:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <TableCaption num="5.1" title="Sertifikat yang Mencakup Lima Product Line atau Lebih" />
                {b5.multiTable.length ? (
                  <>
                    <DataTable table={{ headers: ["Nomor Sertifikat", "Perusahaan", "Merek", "Sub Kelompok", "Product Line", "Pos Tarif/HS", "Rencana Nilai (Rp)"], rows: b5.multiTable }} rows={b5.multiTable.slice(0, 12)} />
                    <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE}{b5.multiTable.length > 12 ? ` · 12 dari ${b5.multiTable.length} sertifikat dengan cakupan terbesar; selengkapnya pada Tabel 5.3` : ` · ${b5.multiTable.length} baris`}</div>
                  </>
                ) : (
                  <Para>Tidak ada sertifikat yang mencakup lima product line atau lebih.</Para>
                )}
                <SubHead num="5.6" title="Label Berbahasa Indonesia" />
                {b5.sub56.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="5.6" title="Status Surat Pernyataan Label Berbahasa Indonesia" source={`${SOURCE}. Per permohonan; status dari verifikasi dokumen.`}>
                  <Donut size={110} center={String(b5.labels.reduce((a, l) => a + l.apps, 0))} sub="permohonan" segs={b5.labels.map((l, li) => ({ label: l.label, value: l.apps, color: l.ok ? SERIES_COLORS[1] : toneColor(l.label, li), note: l.ok ? undefined : l.companies.slice(0, 3).join(", ") }))} />
                </Figure>
              </Shell>
            );
        }
      }
      case "bab5tbl": {
        const spec = {
          company: { num: "5.2", title: "Bukti Pemenuhan Persyaratan Teknis per Perusahaan API-U", headers: ["Perusahaan", "Product Line", "Sertifikat", "Line Tercakup", "Line Tanpa Sertifikat", "Line per Sertifikat", "Sertifikat Lengkap", "Kedaluwarsa / ≤3 Bulan", "Surat Pernyataan Label", "Rencana Nilai (Rp)"], all: b5.companyTable },
          certs: { num: "5.3", title: "Daftar Sertifikat Hasil Uji Mutu", headers: ["Perusahaan", "Merek", "Sub Kelompok", "Laboratorium", "Nomor Sertifikat", "Tanggal Terbit", "Berlaku s.d.", "Product Line", "Verifikasi Dokumen", "Status"], all: b5.certTable },
        }[p.table];
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>BAB 5 · LANJUTAN SUBBAGIAN 5.7</Eyebrow>
            {p.part === 1 && p.table === "company" && <SubHead num="5.7" title="Rincian per Perusahaan" />}
            {p.part === 1 && p.table === "company" && b5.sub57.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num={spec.num} title={`${spec.title}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: spec.headers, rows: spec.all }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {spec.all.length} baris</div>}
            {p.part === p.parts && p.table === "certs" && <Limits items={b5.limits} />}
          </Shell>
        );
      }
      case "bab6": {
        const cont = <Eyebrow>BAB 6 · LANJUTAN</Eyebrow>;
        const withStock = b6.companies.filter((c) => c.stocked > 0);
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 6</Eyebrow>
                {h1(CHAPTERS[5].title)}
                {lead(SECTION_INTRO["8.8"])}
                <Ikhtisar items={b6.highlights} />
                <SubHead num="6.1" title="Ringkasan Persediaan" />
                {b6.sub61.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="6.1" title="Ringkasan Persediaan yang Dilaporkan" source={`${SOURCE}. Persediaan per product line yang dilaporkan pada permohonan.`}>
                  <KpiTiles
                    tiles={[
                      [nf(Math.round(b6.stockByUnit[0] ?? 0)), `TOTAL PERSEDIAAN (${b6.unit.toUpperCase()})`, `dari ${nf(ds.lines.length)} product line`],
                      [nf(b6.stocked.length), "LINE BERSTOK", "persediaan > 0"],
                      [pc(b6.zero.length, ds.lines.length), "LINE STOK NOL", `${nf(b6.zero.length)} product line`],
                      [`${withStock.length}/${b6.companies.length}`, "API-U DENGAN STOK", "memiliki persediaan > 0"],
                      [pc(b6.stockByUnit[0] ?? 0, b6.planByUnit[0] ?? 0), "STOK TERHADAP RENCANA", `persediaan ÷ rencana (${b6.unit})`],
                    ]}
                  />
                </Figure>
                {b6.units.length > 1 && (
                  <div style={{ fontSize: 10.5, color: MUTED_2, marginTop: -4 }}>
                    Persediaan satuan lain: {b6.units.slice(1).map((u, ui) => `${nf(Math.round(b6.stockByUnit[ui + 1]))} ${u}`).join(" · ")}.
                  </div>
                )}
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="6.2" title="Persediaan per Perusahaan" />
                {b6.sub62.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="6.2" title={`Persediaan per Perusahaan API-U (${b6.unit})`} source={`${SOURCE}. Perusahaan dengan persediaan lebih dari nol; persentase terhadap total persediaan ${b6.unit}.`}>
                  {withStock.length ? (
                    <HBarList keyWidth={200} rows={withStock.slice(0, 12).map((c) => ({ key: c.company, desc: `${c.stocked} dari ${c.lines} line berstok${c.ratio !== null ? ` · ${pc(c.stock[0], c.plan[0])} dari rencana` : ""}`, value: Math.round(c.stock[0]) }))} total={b6.stockByUnit[0]} />
                  ) : (
                    <Para>Tidak ada perusahaan dengan persediaan lebih dari nol.</Para>
                  )}
                </Figure>
                {b6.sub63.length > 0 && (
                  <>
                    <SubHead num="6.3" title="Persediaan menurut Kelompok Komoditas" />
                    {b6.sub63.map((t) => <Para key={t}>{t}</Para>)}
                    <Figure num="6.3" title={`Persediaan menurut Kelompok Komoditas (${b6.unit})`} source={`${SOURCE}. Keterangan menunjukkan product line berstok dari seluruh product line kelompok dan persediaan dalam satuan lain.`}>
                      <HBarList keyWidth={220} rows={b6.groups.slice(0, 8).map((g) => ({ key: g.kelompok, desc: `${g.stocked} dari ${g.lines} line berstok${g.other ? ` · ${g.other}` : ""}`, value: Math.round(g.stock), muted: !g.stock }))} total={b6.stockByUnit[0]} />
                    </Figure>
                  </>
                )}
              </Shell>
            );
          default: {
            const analysed = b6.storage.filter((s) => s.used !== null);
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="6.4" title="Kapasitas Gudang" />
                {b6.sub64.map((t) => <Para key={t}>{t}</Para>)}
                {analysed.length > 0 && (
                  <Figure num="6.4" title="Kapasitas Gudang Terpakai per Permohonan" source={`${SOURCE}. (Stok terkini + volume pengajuan impor) ÷ kapasitas gudang, dari analisis Technical Analyst. Angka di kanan: kapasitas terpakai (%).`}>
                    <HBarList keyWidth={200} rows={analysed.slice(0, 12).map((s) => ({ key: s.company, desc: `${(s.used ?? 0) > 1 ? "Melebihi kapasitas · " : ""}${nf(Math.round(((s.stock ?? 0) + (s.plan ?? 0)) * 100) / 100)} dari ${nf(s.capacity ?? 0)} m³ · ${s.decision}`, value: Math.round((s.used ?? 0) * 100) }))} />
                  </Figure>
                )}
                {b6.storageTable.length <= STORAGE_INLINE && (
                  <>
                    <TableCaption num="6.1" title="Kapasitas Gudang menurut Analisis Technical Analyst" />
                    <DataTable table={{ headers: STORAGE_HEADERS, rows: b6.storageTable }} rows={b6.storageTable} />
                    <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {b6.storageTable.length} baris</div>
                  </>
                )}
              </Shell>
            );
          }
        }
      }
      case "bab6tbl": {
        const spec = {
          storage: { num: "6.1", sub: "6.4", title: "Kapasitas Gudang menurut Analisis Technical Analyst", headers: STORAGE_HEADERS, all: b6.storageTable, landscape: false },
          company: { num: "6.2", sub: "6.5", title: "Persediaan dan Rencana Impor per Perusahaan API-U", headers: b6.companyHeaders, all: b6.companyTable, landscape: true },
        }[p.table];
        return (
          <Shell key={i} pageNo={n} total={total} landscape={spec.landscape}>
            <Eyebrow>{`BAB 6 · LANJUTAN SUBBAGIAN ${spec.sub}`}</Eyebrow>
            {p.part === 1 && p.table === "company" && <SubHead num="6.5" title="Rincian per Perusahaan" />}
            {p.part === 1 && p.table === "company" && b6.sub65.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num={spec.num} title={`${spec.title}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: spec.headers, rows: spec.all }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {spec.all.length} baris</div>}
            {p.part === p.parts && p.table === "company" && <Limits items={b6.limits} />}
          </Shell>
        );
      }
      case "bab7": {
        const cont = <Eyebrow>BAB 7 · LANJUTAN</Eyebrow>;
        const ratioText = (r: number) => `${(r * 100).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
        const bn = (v: number) => Math.round(v / 1e8) / 10;
        const over = b7.withModal.filter((r) => (r.ratio ?? 0) > 1);
        const ratios = b7.withModal.map((r) => r.ratio ?? 0).sort((a, b) => a - b);
        const median = ratios.length ? (ratios.length % 2 ? ratios[(ratios.length - 1) / 2] : (ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2]) / 2) : null;
        const agg = b7.totalModal ? b7.withModal.reduce((a, r) => a + r.plan, 0) / b7.totalModal : null;
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 7</Eyebrow>
                {h1(CHAPTERS[6].title)}
                {lead(SECTION_INTRO["8.9"])}
                <Ikhtisar items={b7.highlights} />
                <SubHead num="7.1" title="Ringkasan Modal Operasi dan Rencana Nilai Impor" />
                {b7.sub71.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="7.1" title="Ringkasan Modal Operasi dan Rencana Nilai Impor" source={`${SOURCE}. Modal operasi dari Surat Pernyataan Kepemilikan Modal Kerja; nilai dalam Rupiah.`}>
                  <KpiTiles
                    tiles={[
                      [rp(b7.totalPlan), "RENCANA NILAI IMPOR", `${b7.rows.length} permohonan VIU`],
                      [rp(b7.totalModal), "MODAL OPERASI", `${b7.withModal.length}/${b7.rows.length} permohonan tercatat`],
                      [agg === null ? "—" : ratioText(agg), "RASIO AGREGAT", "rencana nilai ÷ modal"],
                      [median === null ? "—" : ratioText(median), "MEDIAN RASIO", "per permohonan"],
                      [String(over.length), "RASIO > 100%", "rencana melebihi modal"],
                    ]}
                  />
                </Figure>
              </Shell>
            );
          case 2: {
            const byModal = [...b7.withModal].sort((a, b) => (b.modal ?? 0) - (a.modal ?? 0));
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="7.2" title="Distribusi Modal Operasi Pemohon" />
                {b7.sub72.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="7.2" title="Distribusi Permohonan berdasarkan Rentang Modal Operasi" source={`${SOURCE}. Jumlah permohonan per rentang modal operasi.`}>
                  <ColumnChart items={b7.modalBuckets} height={150} />
                </Figure>
                {byModal.length > 0 && (
                  <Figure num="7.3" title="Sepuluh Permohonan dengan Modal Operasi Terbesar (Rp miliar)" source={`${SOURCE}. Keterangan menunjukkan rencana nilai impor dan rasionya.`}>
                    <HBarList keyWidth={200} rows={byModal.slice(0, 10).map((r) => ({ key: r.company, desc: `rencana ${rp(r.plan)} · rasio ${ratioText(r.ratio ?? 0)}`, value: bn(r.modal ?? 0) }))} />
                  </Figure>
                )}
              </Shell>
            );
          }
          case 3:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="7.3" title="Rencana Nilai Impor per Pemohon" />
                {b7.sub73.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="7.4" title="Sepuluh Permohonan dengan Rencana Nilai Impor Terbesar (Rp miliar)" source={`${SOURCE}. Persentase terhadap total rencana nilai impor.`}>
                  <HBarList keyWidth={200} rows={b7.rows.slice(0, 10).map((r) => ({ key: r.company, desc: r.modal === null ? "modal operasi belum tercatat" : `modal ${rp(r.modal)} · rasio ${ratioText(r.ratio ?? 0)}`, value: bn(r.plan) }))} total={bn(b7.totalPlan)} />
                </Figure>
              </Shell>
            );
          case 4:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                {b7.sub74.length > 0 && (
                  <>
                    <SubHead num="7.4" title="Modal Operasi dan Rencana Nilai Impor" />
                    {b7.sub74.map((t) => <Para key={t}>{t}</Para>)}
                    <Figure num="7.5" title="Modal Operasi vs Rencana Nilai Impor per Permohonan" source={`${SOURCE}. Skala logaritmik; label pada tiga permohonan dengan rasio tertinggi.`}>
                      <ScatterLog
                        xLabel="Modal operasi (Rp)"
                        yLabel="Rencana nilai impor (Rp)"
                        points={b7.withModal.map((r) => ({ label: r.company, x: r.modal ?? 0, y: r.plan, tag: [...b7.withModal].sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0)).slice(0, 3).includes(r) }))}
                      />
                    </Figure>
                  </>
                )}
              </Shell>
            );
          default: {
            const trend = b7.months.filter((m) => m.median !== null);
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="7.5" title="Rasio Rencana Impor terhadap Modal Operasi" />
                {b7.sub75.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="7.6" title="Distribusi Rasio Rencana Impor terhadap Modal Operasi" source={`${SOURCE}. Jumlah permohonan per kelompok rasio.`}>
                  <ColumnChart items={b7.ratioBuckets} height={140} color={SERIES_COLORS[0]} />
                </Figure>
                {trend.length > 0 && (
                  <Figure num="7.7" title="Median Rasio Rencana Impor terhadap Modal Operasi menurut Bulan Terbit LHVIU (%)" source={`${SOURCE}. Bulan tanpa permohonan bermodal tercatat tidak ditampilkan.`}>
                    <LineSeries labels={trend.map((m) => m.label)} series={[{ label: "Median rasio rencana impor ÷ modal operasi (%)", values: trend.map((m) => Math.round((m.median ?? 0) * 1000) / 10) }]} />
                  </Figure>
                )}
              </Shell>
            );
          }
        }
      }
      case "bab7tbl":
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>BAB 7 · LANJUTAN SUBBAGIAN 7.6</Eyebrow>
            {p.part === 1 && <SubHead num="7.6" title="Penilaian Modal dan Rincian per Pemohon" />}
            {p.part === 1 && b7.sub76.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num="7.1" title={`Modal Operasi, Rencana Nilai Impor, dan Rasio per Permohonan VIU${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: ["Pemohon VIU", "Nomor LHVIU", "Bulan Terbit", "Mata Uang", "Modal Operasi (Rp)", "Rencana Nilai Impor (Rp)", "Rasio Rencana/Modal", "Kelompok Rasio", "Keputusan Analis"], rows: b7.table }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {b7.table.length} baris</div>}
            {p.part === p.parts && <Limits items={b7.limits} />}
          </Shell>
        );
      case "bab8": {
        const cont = <Eyebrow>BAB 8 · LANJUTAN</Eyebrow>;
        const share = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;
        const tile = (d: (typeof b8.dims)[number]): [string, string, string] => [nf(d.hhi), d.label.toUpperCase(), `CR3 ${share(d.cr3)} · konsentrasi ${d.level.toLowerCase()}`];
        const col = (d: (typeof b8.dims)[number], color: string, label: (key: string) => string) => ({
          title: d.label, color, format: rp, total: d.total,
          rows: d.items.slice(0, 5).map((it) => ({ key: it.label, label: label(it.label), value: it.value, note: `${nf(it.lines)} product line` })),
        });
        const brandsOf = (pick: (l: (typeof ds.lines)[number]) => string) => (key: string) => {
          const names = [...new Set(ds.lines.filter((l) => pick(l) === key).map((l) => l.brandName))];
          return `${names.length} merek: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ", …" : ""}`;
        };
        const ownerById = new Map(ds.brands.map((b) => [b.id, b.owner.trim() || "Tidak diisi"]));
        const [company, owner, brand, hs] = b8.dims;
        const ownerOf = new Map(ds.brands.map((b) => [b.name, b.owner.trim() || "Tidak diisi"]));
        const hsDesc = new Map(ds.lines.map((l) => [l.hs, l.hsDescription]));
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 8</Eyebrow>
                {h1(CHAPTERS[7].title)}
                {lead(SECTION_INTRO["8.10"])}
                <Ikhtisar items={b8.highlights} />
                <SubHead num="8.1" title="Metode Pengukuran Konsentrasi" />
                {b8.sub81.map((t) => <Para key={t}>{t}</Para>)}
                <SubHead num="8.2" title="Indeks Konsentrasi per Dimensi" />
                {b8.sub82.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="8.1" title="Herfindahl-Hirschman Index (HHI) Rencana Nilai Impor per Dimensi" source={`${SOURCE}. HHI < 1.500 rendah, 1.500–2.500 sedang, > 2.500 tinggi; negara asal menurut estimasi alokasi merata.`}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <KpiTiles tiles={b8.byHhi.slice(0, 3).map(tile)} />
                    <KpiTiles tiles={b8.byHhi.slice(3, 6).map(tile)} />
                  </div>
                </Figure>
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <TableCaption num="8.1" title="Indeks Konsentrasi Rencana Nilai Impor per Dimensi" />
                <DataTable table={{ headers: ["Dimensi", "Jumlah Entitas", "Entitas Terbesar", "CR1", "CR3", "CR5", "HHI", "Tingkat Konsentrasi"], rows: b8.table }} rows={b8.table} />
                <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · rencana nilai impor dalam Rupiah</div>
                <SubHead num="8.3" title="Entitas dengan Pangsa Terbesar" />
                {b8.sub83.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="8.2" title="Lima Pemohon VIU dan Lima Pemilik Merek dengan Rencana Nilai Impor Terbesar" source={`${SOURCE}. Persentase terhadap total rencana nilai impor.`}>
                  <RankColumns cols={[col(company, "#187a61", brandsOf((l) => l.company)), col(owner, "#b4561a", brandsOf((l) => ownerById.get(l.brandId) ?? "Tidak diisi"))]} />
                </Figure>
              </Shell>
            );
          default:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <Figure num="8.3" title="Lima Merek dan Lima Pos Tarif/HS dengan Rencana Nilai Impor Terbesar" source={`${SOURCE}. Persentase terhadap total rencana nilai impor.`}>
                  <RankColumns cols={[col(brand, "#245a9e", (l) => ownerOf.get(l) ?? ""), col(hs, "#7a4fb0", (l) => hsDesc.get(l) ?? "")]} />
                </Figure>
                <Limits items={b8.limits} />
              </Shell>
            );
        }
      }
      case "bab9": {
        const cont = <Eyebrow>BAB 9 · LANJUTAN</Eyebrow>;
        const color = (label: string, idx: number) =>
          label === "Milik Sendiri" || label === "TDG" || label === "Sesuai" ? SERIES_COLORS[0]
          : label === "Sewa" ? SERIES_COLORS[2] : /Tidak diisi|Belum/.test(label) ? C.na : label === "Tidak Sesuai" ? "#c2417a" : SERIES_COLORS[(idx + 1) % SERIES_COLORS.length];
        const segs = (xs: { label: string; value: number }[]) => xs.filter((x) => x.value > 0).map((x, xi) => ({ label: x.label, value: x.value, color: color(x.label, xi) }));
        const provinceRows = (xs: typeof b9.kantorProvinces) => xs.slice(0, 8).map((p) => ({ key: p.province, desc: p.cities.slice(0, 4).join(", ") + (p.cities.length > 4 ? ", …" : ""), value: p.count, muted: p.province === "Tidak diisi" }));
        const areas = b9.gudang.map((g) => g.area).filter((v): v is number => typeof v === "number" && v > 0);
        const dense = b9.rows.filter((r) => r.perArea !== null).sort((a, b) => (b.perArea ?? 0) - (a.perArea ?? 0));
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 9</Eyebrow>
                {h1(CHAPTERS[8].title)}
                {lead(SECTION_INTRO["8.12f"])}
                <Ikhtisar items={b9.highlights} />
                <SubHead num="9.1" title="Ringkasan Fasilitas Pemohon VIU" />
                {b9.sub91.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="9.1" title="Ringkasan Fasilitas Kantor dan Gudang" source={`${SOURCE}. Lokasi dari data lokasi permohonan; luas dari verifikasi lapangan.`}>
                  <KpiTiles
                    tiles={[
                      [String(b9.rows.length), "PEMOHON VIU", "dengan rencana impor"],
                      [String(b9.kantor.length), "KANTOR", `${b9.kantorProvinces.filter((x) => x.province !== "Tidak diisi").length} provinsi`],
                      [String(b9.gudang.length), "GUDANG", `${b9.gudangProvinces.filter((x) => x.province !== "Tidak diisi").length} provinsi`],
                      [pc(b9.gudang.filter((g) => g.ownership === "Milik Sendiri").length, b9.gudang.length), "GUDANG MILIK SENDIRI", "dari seluruh gudang"],
                      [`${b9.gudang.filter((g) => g.registration).length}/${b9.gudang.length}`, "BERTANDA DAFTAR", "TDG / Gudang Berikat / TPS"],
                      [areas.length ? nf(Math.round(areas.reduce((a, v) => a + v, 0) / areas.length)) : "—", "RATA-RATA LUAS (m²)", `${areas.length} gudang terukur`],
                    ]}
                  />
                </Figure>
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="9.2" title="Kantor: Kepemilikan dan Lokasi" />
                {b9.sub92.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="9.2" title="Kepemilikan Kantor" source={`${SOURCE}. Status bangunan kantor pada data lokasi.`}>
                  <Donut size={110} center={String(b9.kantor.length)} sub="kantor" segs={segs(b9.ownership.kantor)} />
                </Figure>
                <Figure num="9.3" title="Sebaran Lokasi Kantor menurut Provinsi dan Kota" source={`${SOURCE}. Keterangan menunjukkan kota/kabupaten.`}>
                  <HBarList keyWidth={170} rows={provinceRows(b9.kantorProvinces)} total={b9.kantor.length} />
                </Figure>
              </Shell>
            );
          case 3:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="9.3" title="Gudang: Kepemilikan, Lokasi, dan Legalitas" />
                {b9.sub93.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="9.4" title="Kepemilikan Gudang" source={`${SOURCE}. Status bangunan gudang pada data lokasi.`}>
                  <Donut size={100} center={String(b9.gudang.length)} sub="gudang" segs={segs(b9.ownership.gudang)} />
                </Figure>
                <Figure num="9.5" title="Sebaran Lokasi Gudang menurut Provinsi dan Kota" source={`${SOURCE}. Keterangan menunjukkan kota/kabupaten.`}>
                  <HBarList keyWidth={170} rows={provinceRows(b9.gudangProvinces)} total={b9.gudang.length} />
                </Figure>
              </Shell>
            );
          default:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <Figure num="9.6" title="Legalitas Gudang dan Kesimpulan Verifikasi Lapangan" source={`${SOURCE}. Tanda daftar gudang per gudang; kesimpulan surveyor per lokasi kantor dan gudang.`}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Donut size={96} center={String(b9.gudang.length)} sub="gudang" segs={segs(b9.registrations)} />
                    <Donut size={96} center={String(b9.kantor.length + b9.gudang.length)} sub="lokasi" segs={segs(b9.conclusions)} />
                  </div>
                </Figure>
                <SubHead num="9.4" title="Luas Gudang dan Keterkaitan dengan Rencana Impor" />
                {b9.sub94.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="9.7" title="Distribusi Luas Gudang" source={`${SOURCE}. Luas total terukur pada verifikasi lapangan.`}>
                  <ColumnChart items={b9.areaBuckets} height={120} />
                </Figure>
                {dense.length > 0 && (
                  <Figure num="9.8" title={`Rencana Volume Impor per m² Luas Gudang (${b9.unit}/m²)`} source={`${SOURCE}. Rencana volume dalam ${b9.unit} dibagi luas gudang terukur; keterangan: luas dan rencana volume.`}>
                    <HBarList keyWidth={200} rows={dense.slice(0, 8).map((r) => ({ key: r.company, desc: `${nf(Math.round(r.area ?? 0))} m² · ${nf(Math.round(r.plan))} ${b9.unit}`, value: Math.round(r.perArea ?? 0) }))} />
                  </Figure>
                )}
              </Shell>
            );
        }
      }
      case "bab10": {
        const cont = <Eyebrow>BAB 10 · LANJUTAN</Eyebrow>;
        const count = (pr: string) => b10.analytic.filter((x) => x.priority === pr).length;
        const material = b10.materiality.find((m) => m.label === "Material")?.value ?? 0;
        switch (p.part) {
          case 1:
            return (
              <Shell key={i} pageNo={n} total={total}>
                <Eyebrow>BAB 10</Eyebrow>
                {h1(CHAPTERS[9].title)}
                {lead(SECTION_INTRO["8.13"])}
                <Ikhtisar items={b10.highlights} />
                <SubHead num="10.1" title="Dasar Penetapan Temuan dan Prioritas" />
                {b10.sub101.map((t) => <Para key={t}>{t}</Para>)}
                <Figure num="10.1" title="Jumlah Temuan menurut Prioritas dan Sumber" source={`${SOURCE}. Temuan analitis dari Bab 1–9; temuan verifikasi dari surveyor, verifikator, dan Technical Analyst.`}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <KpiTiles tiles={[[String(b10.analytic.length), "TEMUAN ANALITIS", "hasil penelaahan data"], [String(count("Tinggi")), "PRIORITAS TINGGI", "nilai material / dokumen persyaratan"], [String(count("Sedang")), "PRIORITAS SEDANG", "memerlukan klarifikasi data"]]} />
                    <KpiTiles tiles={[[String(count("Rendah")), "PRIORITAS RENDAH", "perbaikan administrasi data"], [String(ds.findings.length), "TEMUAN VERIFIKASI", "survei, dokumen, produk, teknis"], [String(material), "ISU MATERIAL", "ditetapkan Project Manager"]]} />
                  </div>
                </Figure>
              </Shell>
            );
          case 2:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="10.3" title="Temuan Pelaksanaan Verifikasi" />
                {b10.sub103.map((t) => <Para key={t}>{t}</Para>)}
                {ds.findings.length > 0 && (
                  <Figure num="10.2" title="Temuan Pelaksanaan Verifikasi menurut Sumber, Tingkat Keparahan, dan Materialitas" source={`${SOURCE}. Materialitas ditetapkan Project Manager; yang belum ditetapkan dihitung Needs Review.`}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, alignItems: "center" }}>
                      <StackBars rows={b10.recorded.map((r) => ({ label: r.source, parts: r.counts, total: r.total }))} segments={b10.severities} format={(v) => `${v} temuan`} />
                      <Donut size={100} center={String(ds.findings.length)} sub="temuan" segs={b10.materiality.map((m) => ({ label: m.label, value: m.value, color: m.label === "Material" ? "#c2417a" : m.label === "Needs Review" ? SERIES_COLORS[2] : C.na }))} />
                    </div>
                  </Figure>
                )}
              </Shell>
            );
          default:
            return (
              <Shell key={i} pageNo={n} total={total}>
                {cont}
                <SubHead num="10.4" title="Kebutuhan Data" />
                {b10.sub104.map((t) => <Para key={t}>{t}</Para>)}
                <TableCaption num="10.3" title="Kebutuhan Data untuk Melengkapi Analisis" />
                <DataTable table={{ headers: ["Data", "Kegunaan", "Bab Terkait", "Status"], rows: b10.needsTable }} rows={b10.needsTable} />
                <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · status kelengkapan pada saat laporan dibuat</div>
                <Limits items={b10.limits} />
              </Shell>
            );
        }
      }
      case "bab10tbl": {
        const spec = {
          analytic: { num: "10.1", sub: "10.2", title: "Temuan Analitis dan Rekomendasi Tindak Lanjut", headers: ["Area", "Temuan", "Rujukan", "Prioritas", "Rekomendasi"], all: b10.analyticTable },
          recorded: { num: "10.2", sub: "10.3", title: "Temuan Pelaksanaan Verifikasi", headers: ["API-U", "Sumber", "Area", "Temuan", "Severity", "Materialitas", "Status", "Tindak Lanjut"], all: b10.recordedTable },
        }[p.table];
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>{`BAB 10 · LANJUTAN SUBBAGIAN ${spec.sub}`}</Eyebrow>
            {p.part === 1 && p.table === "analytic" && <SubHead num="10.2" title="Temuan Analitis dan Rekomendasi" />}
            {p.part === 1 && p.table === "analytic" && b10.sub102.map((t) => <Para key={t}>{t}</Para>)}
            <TableCaption num={spec.num} title={`${spec.title}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: spec.headers, rows: spec.all }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {spec.all.length} baris</div>}
          </Shell>
        );
      }
      case "bab9tbl":
        return (
          <Shell key={i} pageNo={n} total={total} landscape>
            <Eyebrow>BAB 9 · LANJUTAN SUBBAGIAN 9.4</Eyebrow>
            <TableCaption num="9.1" title={`Fasilitas Kantor dan Gudang per Pemohon VIU${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={{ headers: ["Pemohon VIU", "Kota/Provinsi Kantor", "Status Kantor", "Kota/Provinsi Gudang", "Status Gudang", "Luas Gudang (m²)", "Bertanda Daftar", "Sewa s.d.", "Verifikasi Lapangan", `Rencana Volume (${b9.unit})`], rows: b9.table }} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {SOURCE} · {b9.table.length} baris</div>}
            {p.part === p.parts && <Limits items={b9.limits} />}
          </Shell>
        );
      case "table": {
        const chapter = CHAPTERS[p.ch];
        return (
          <Shell key={i} pageNo={n} total={total} landscape={p.landscape}>
            <Eyebrow>BAB {p.ch + 1}{p.first ? "" : " · LANJUTAN"}</Eyebrow>
            {p.first && h1(chapter.title)}
            {p.first && lead(SECTION_INTRO[chapter.no] ?? "")}
            <TableCaption num={p.tableNo} title={`${p.table.title ?? chapter.title}${p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}`} />
            <DataTable table={p.table} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 8 }}>Sumber: {SOURCE} · {p.table.rows.length} baris</div>}
          </Shell>
        );
      }
      case "conclusion": {
        const blocks: [string, string[]][] = [
          ["1. Ringkasan Pelaksanaan", [ex.lead]],
          ["2. Temuan Utama", ex.findings],
          ["3. Rekomendasi", ex.recs],
          ["4. Keterbatasan Data", ex.limits],
          ["5. Kesimpulan", [ex.concl]],
        ];
        return (
          <Shell key={i} pageNo={n} total={total} id="kesimpulan">
            <Eyebrow>KESIMPULAN DAN REKOMENDASI</Eyebrow>
            {h1("Kesimpulan dan Rekomendasi")}
            {blocks.filter(([, items]) => items.length).map(([title, items]) => (
              <div key={title} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{title}</div>
                {items.length > 1 ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, lineHeight: 1.55 }}>{items.map((t) => <li key={t}>{t}</li>)}</ul> : <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: MUTED }}>{items[0]}</p>}
              </div>
            ))}
            <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: "12px 16px", marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>6. Catatan Project Manager</div>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: report.pmNote ? INK : MUTED_2, whiteSpace: "pre-wrap" }}>{report.pmNote || "Belum ada catatan Project Manager."}</p>
            </div>
          </Shell>
        );
      }
      case "appendix":
        return (
          <Shell key={i} pageNo={n} total={total} id="lampiran">
            <Eyebrow>LAMPIRAN</Eyebrow>
            {h1("Sumber Data dan Keterbatasan")}
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.75, color: MUTED }}>
              <li>Permohonan dihitung bila Tanggal Pengajuan berada dalam periode laporan; draf dan permohonan yang ditarik tidak dihitung.</li>
              <li>Data perusahaan, KBLI, dan lokasi diambil dari profil perusahaan; product line, merek, HS, negara asal, kuantitas, dan nilai dari Product Information permohonan.</li>
              <li>Nomor dan Tanggal Terbit LHVIU dicatat Project Manager pada tab LHVIU; masa berlaku dihitung 1 (satu) tahun sejak tanggal terbit (Pasal 39 ayat (6)).</li>
              <li>Bukti merek dari Merek Management; sertifikat uji mutu dan label dari dokumen permohonan beserta status verifikasinya.</li>
              <li>Kapasitas gudang, kurs, dan keputusan modal kerja dari Analisis Teknis.</li>
              <li>Temuan berasal dari survei lapangan, verifikasi dokumen, verifikasi produk, dan analisis teknis. Severity non-survei dipetakan dari keputusan reviewer; materialitas ditetapkan Project Manager.</li>
              <li>Kuantitas tidak dijumlahkan lintas satuan dan nilai tidak dijumlahkan lintas mata uang.</li>
              <li>Data realisasi impor aktual dan distribusi hilir belum tersedia pada sistem.</li>
            </ul>
          </Shell>
        );
    }
  };

  return (
    <div className="report-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <div className="rd-topbar">
        <Link href={backHref} className="rd-back">
          <MaterialIcon name="arrow_back" className="text-base" />
          Kembali ke Laporan Kemenperin
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Laporan Pelaksanaan VIU <span className="rd-topbar-sub">&middot; {period.label} &middot; {STATUS_LABEL[report.status]}</span>
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => window.print()}><MaterialIcon name="print" className="text-[16px]" />Cetak</button>
          <button type="button" className="rd-btn rd-btn-primary" onClick={() => window.print()}><MaterialIcon name="download" className="text-[16px]" />Unduh PDF</button>
        </div>
      </div>
      <main className="rd-main">
        <section className="rd-sheet" style={{ background: NAVY, color: "#fff", position: "relative", padding: "48px 56px", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: ORANGE_LIGHT }} />
          <PageHead dark />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18 }}>
            <div style={{ display: "inline-flex", background: ORANGE_LIGHT, color: NAVY, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", padding: "6px 14px", width: "fit-content", borderRadius: 20 }}>PELAPORAN PASAL 47</div>
            <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>Laporan Pelaksanaan VIU</h1>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Produk Tekstil sebagai <span style={{ color: ORANGE_LIGHT }}>Barang Konsumsi</span></div>
            <div style={{ border: "1px solid #2d3a4a", padding: "22px 26px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px 24px", marginTop: 8, borderRadius: 14 }}>
              {[
                ["NOMOR DOKUMEN", `LP47/VIU-K/${period.key}`],
                ["PERIODE", `${fdLong(period.from)} – ${fdLong(period.to)}`],
                ["DASAR HUKUM", "Pasal 47 Permenperin No. 27 Tahun 2025"],
                [isApproved ? "TANGGAL TERBIT" : "TANGGAL PENYUSUNAN", fdLong(preparedOn.slice(0, 10))],
                ["DISUSUN OLEH", report.updatedByName ?? "Project Manager"],
                ["STATUS", STATUS_LABEL[report.status]],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, letterSpacing: "0.05em", color: ORANGE_LIGHT, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8a97a8", borderTop: "1px solid #1e2a38", paddingTop: 14, marginTop: 24 }}>
            <div>{TITLE}</div>
            <div>Dokumen Rahasia — Distribusi Terbatas</div>
          </div>
        </section>
        {plan.map(page)}
      </main>
    </div>
  );
}
