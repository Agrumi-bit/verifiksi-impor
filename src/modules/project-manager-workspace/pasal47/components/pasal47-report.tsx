"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../../components/material-icon";
import {
  Badge, CARD_BORDER, CREAM, Eyebrow, GREEN, INK, MUTED, MUTED_2, NAVY, ORANGE, ORANGE_LIGHT, ORANGE_TEXT, PageHead,
} from "@/modules/verifikator-workspace/components/report/document-verification-report";
import { companyChapterNarrative } from "../company-chapter";
import { resolvePeriod, type ReportingPeriod } from "../derive";
import { buildExportSections, EXPORT_PARTS, type ExportSection, type ExportTable } from "../export-sections";
import { compact, fdLong, nf, sym } from "../format";
import { bab1, chapterDivider, CHAPTERS, executiveSummary, GLOSSARY, planValues } from "../report-model";
import { introductionParagraphs, kpis } from "../summary";
import type { P47Dataset, P47Report } from "../types";
import { C, ColumnChart, DividerBody, Donut, Figure, HBarList, Ikhtisar, Limits, Para, SubHead, TableCaption } from "./report-figures";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";

const TITLE = "Laporan Pelaksanaan VIU – Produk Tekstil sebagai Barang Konsumsi";
const STATUS_LABEL = { DRAFT: "Draf", REVIEWED: "Ditelaah", APPROVED: "Disetujui" } as const;
const STATUS_BADGE = { DRAFT: { color: "#7a4a10", bg: "#ffebce" }, REVIEWED: { color: "#1a3a6b", bg: "#dbe8fa" }, APPROVED: { color: "#0e3d24", bg: "#d2f6dd" } } as const;

/** Why each section is in the report — printed under its title. */
const SECTION_INTRO: Record<string, string> = {
  "8.2": "Bab ini menyajikan profil Perusahaan pemegang Angka Pengenal Importir Umum (API-U) yang mengajukan Verifikasi Importir Umum (VIU) Produk Tekstil sebagai Barang Konsumsi pada periode laporan: periode penerbitan Laporan Hasil Verifikasi Importir Umum (LHVIU), kesesuaian KBLI terhadap persyaratan Pasal 37, serta daftar perusahaan dan status LHVIU. Sebaran kantor dan gudang dibahas pada Bab 9.",
  "8.3": "Pos tarif/HS dan komoditas Produk Tekstil yang diajukan. Rencana kebutuhan dijumlahkan hanya di dalam satu HS dengan satuan yang sama.",
  "8.4": "Negara asal produk menurut jumlah relasi product line. Volume per negara tidak dicantumkan karena sebagian product line memiliki lebih dari satu negara asal tanpa alokasi kuantitas.",
  "8.5": "Merek yang diimpor dan hubungan setiap Perusahaan API-U dengan merek tersebut, termasuk status kelengkapan dokumen hubungan merek.",
  "8.6": "Pemilik merek, perwakilan resmi, dan bukti merek (sertifikat atau tanda pendaftaran) beserta masa berlakunya pada akhir periode.",
  "8.7": "Sertifikat Hasil Uji Mutu per merek dan sub kelompok komoditas serta Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia.",
  "8.8": "Gudang yang digunakan Perusahaan API-U, status kepemilikannya, serta kapasitas dan stok sebagaimana dinilai Technical Analyst.",
  "8.9": "Nilai rencana impor per Perusahaan dan per HS, dicatat terpisah per mata uang, dibandingkan dengan modal kerja yang dinyatakan perusahaan.",
  "8.10": "Konsentrasi kebutuhan menurut HS, merek, negara asal, dan perusahaan, dihitung dari jumlah product line (analisis tambahan, bukan indikator regulasi).",
  "8.11": "Rencana kebutuhan impor per bulan menurut tanggal pengajuan permohonan, per satuan. Data realisasi impor belum tersedia pada sistem.",
  "8.12": "Status ketersediaan data pada setiap tahap rantai pasok merek, dari pemilik merek hingga konsumen. Tahap hilir tidak diverifikasi oleh VIU.",
  "8.13": "Temuan pelaksanaan verifikasi dengan tingkat keparahan operasional dan materialitas pelaporan yang ditetapkan Project Manager.",
  "8.12f": "Lokasi kantor dan gudang Pemohon VIU beserta status kepemilikannya, sebagaimana dicatat pada permohonan.",
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
  | { kind: "facility" }
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
  if (no === "8.12f") return sections.find((s) => s.no === "8.2")?.tables.slice(1, 2) ?? [];
  const sources = CHAPTERS.find((c) => c.no === no)?.sources ?? [];
  return sources.flatMap((src) => sections.find((s) => s.no === src)?.tables ?? []);
}

/** Page plan, following the reference report: front matter, ten chapters each opened by a divider, closing pages. */
function planPages(sections: ExportSection[], companyRows: (string | number)[][]): Plan[] {
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
    if (chapter.no === "8.12f") plan.push({ kind: "facility" });
    chapterTables(chapter.no, sections).forEach((table, tableIndex) => {
      const landscape = table.headers.length > 6;
      const parts = chunk(table.rows, rowsPerPage(table, landscape));
      parts.forEach((rows, i) =>
        plan.push({ kind: "table", ch, table, tableNo: `${ch + 1}.${tableIndex + 1}`, rows, part: i + 1, parts: parts.length, first: tableIndex === 0 && i === 0 && chapter.no !== "8.12f", landscape }),
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
            <tr key={i} style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
              <td style={{ padding: "6px 8px", color: MUTED_2, verticalAlign: "top" }}>{(table.rows.indexOf(r) + 1) || i + 1}</td>
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
  const plan = planPages(sections, b1.companyRows);
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
              <Tile label="NILAI RENCANA" value={value.total ? `${sym(value.currency)} ${compact(value.total)}` : "—"} sub={value.otherCurrencies.length ? `+ ${value.otherCurrencies.join(", ")}` : "kuantitas × harga satuan"} />
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
      case "facility": {
        const paras = companyChapterNarrative(ds).filter((t) => /kantor|gudang/i.test(t) && !t.startsWith("Bab ini") && !t.startsWith("Status Laporan"));
        return (
          <Shell key={i} pageNo={n} total={total}>
            <Eyebrow>BAB {CHAPTERS.findIndex((c) => c.no === "8.12f") + 1}</Eyebrow>
            {h1(CHAPTERS.find((c) => c.no === "8.12f")!.title)}
            {lead(SECTION_INTRO["8.12f"])}
            {paras.map((t) => <Para key={t}>{t}</Para>)}
          </Shell>
        );
      }
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
