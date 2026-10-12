"use client";

/* Mesin laporan khusus VKI — salinan terpisah; perubahan di sini tidak memengaruhi skema lain. */

import type { ReactNode } from "react";
import Link from "next/link";

import { MaterialIcon } from "../../../components/material-icon";
import { PdfDownloadButton } from "../../components/pdf-download-button";
import { C, ColumnChart, DividerBody, Donut, Figure, HBarList, Ikhtisar, KpiTiles, Limits, Para, SERIES_COLORS, SubHead, TableCaption } from "./report-figures";
import { Badge, CARD_BORDER, CREAM, Eyebrow, GREEN, INK, MUTED, MUTED_2, NAVY, ORANGE, ORANGE_LIGHT, ORANGE_TEXT, PageHead } from "@/modules/verifikator-workspace/components/report/document-verification-report";
import type { ReportingPeriod } from "../../derive";
import { fdLong, nf } from "../../format";
import type { P47Report } from "../../types";
import type { Block, Chapter, ChapterReportModel, Fig, Seg } from "./model";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";

/** What differs between the chapter reports: names on the cover, footer and approval page, PDF scheme and appendix. */
export type ChapterReportMeta = {
  /** Full title, e.g. "Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Non Industri". */
  title: string;
  /** Page footer. */
  footer: string;
  /** Verification name and subject for the approval page, e.g. "Verifikasi Importir Umum (VIU) Bahan Baku/…". */
  approvalSubject: string;
  /** Cover: "Laporan Pelaksanaan VIU" and the subject line split into plain and accent parts. */
  coverTitle: string;
  coverSubject: [string, string];
  docNumber: string;
  topbarTitle: string;
  introHeading: string;
  introSub: string;
  pdfScheme: Parameters<typeof PdfDownloadButton>[0]["scheme"];
  appendix: string[];
};
const STATUS_LABEL = { DRAFT: "Draf", REVIEWED: "Ditelaah", APPROVED: "Disetujui" } as const;
const STATUS_BADGE = { DRAFT: { color: "#7a4a10", bg: "#ffebce" }, REVIEWED: { color: "#1a3a6b", bg: "#dbe8fa" }, APPROVED: { color: "#0e3d24", bg: "#d2f6dd" } } as const;
const SEG_COLOR: Record<string, string> = {
  Sesuai: "#1f9a7a", "Tidak Sesuai": "#c1361f", "Belum Dianalisis": C.na, "Belum disimpulkan": C.na, Terbit: "#1f9a7a", "Belum Diunggah": "#e0a43a", "Dalam Proses": C.na,
  "Milik Sendiri": C.own, Sewa: C.rent, "Tidak diisi": C.na, Material: "#c1361f", "Needs Review": "#e0a43a", "Non-Material": "#1f9a7a", Critical: "#8a1c10", Major: "#c1361f", Minor: "#e0a43a",
};
const colored = (segs: Seg[]) => segs.filter((s) => s.value > 0).map((s, i) => ({ ...s, color: SEG_COLOR[s.label] ?? SERIES_COLORS[i % SERIES_COLORS.length] }));

/*
 * Pages are packed from the chapter blocks by estimated height (px) on a content-box A4 sheet
 * (794 × 1123 px of content): long tables continue on the next page with their header repeated.
 */
const PAGE_BUDGET = 1005;
const lineCount = (text: string, perLine: number) => Math.max(1, Math.ceil(text.length / perLine));
const textOf = (v: string | number) => (typeof v === "number" ? nf(v) : v || "—");
const CHAR = 5.1; // average glyph width (px) of the 9.5px table text
const TABLE_TEXT_WIDTH = 746; // table width minus the NO column
/**
 * Row height estimator for one table, mimicking the browser's auto table layout: columns get their
 * content width when everything fits on one line, otherwise width proportional to their longest text
 * (never narrower than their longest word); a row is as tall as its most-wrapped cell.
 */
function rowHeights(headers: string[], rows: (string | number)[][]) {
  const cols = headers.length;
  const longest = headers.map((h, j) => Math.max(h.length * 1.1, ...rows.map((r) => textOf(r[j]).length)));
  const word = headers.map((h, j) => Math.max(...h.split(/\s+/).map((w) => w.length * 1.1), ...rows.map((r) => Math.max(...textOf(r[j]).split(/\s+/).map((w) => w.length)))));
  const natural = longest.map((l) => l * CHAR + 16);
  let widths = natural;
  if (sum(natural) > TABLE_TEXT_WIDTH) {
    const minW = word.map((w) => Math.min(w * CHAR + 16, TABLE_TEXT_WIDTH / cols));
    const free = Math.max(0, TABLE_TEXT_WIDTH - sum(minW));
    const weight = longest.map((l, j) => Math.max(0, l * CHAR + 16 - minW[j]));
    widths = minW.map((m, j) => m + (sum(weight) ? (free * weight[j]) / sum(weight) : 0));
  }
  return (row: (string | number)[]) => 12 + 12 * Math.max(...row.map((c, j) => lineCount(textOf(c), Math.max(4, Math.floor((widths[j] - 16) / CHAR)))));
}
function figHeight(f: Fig) {
  switch (f.k) {
    case "kpis": return 80;
    case "hbar": return f.rows.length * 21;
    case "columns": return 185;
    case "donuts": return Math.ceil(f.items.length / 2) * (22 + Math.max(96, Math.max(...f.items.map((d) => d.segs.filter((s) => s.value > 0).length)) * 21)) + Math.max(0, Math.ceil(f.items.length / 2) - 1) * 14;
  }
}
function blockHeight(b: Block): number {
  switch (b.t) {
    case "sub": return 74;
    case "p": return lineCount(b.text, 118) * 20 + 10;
    case "fig": return figHeight(b.fig) + 78;
    case "table": return TABLE_FIXED + (b.rows.length ? sum(b.rows.map(rowHeights(b.headers, b.rows))) : 24);
    case "highlights": return 40 + sum(b.items.map((t) => lineCount(t, 112) * 19.5));
    case "limits": return 62 + sum(b.items.map((t) => lineCount(t, 115) * 18.5));
  }
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const TABLE_FIXED = 100;

type TablePiece = Extract<Block, { t: "table" }> & { cont?: boolean; last?: boolean; offset?: number };
type Piece = Exclude<Block, { t: "table" }> | TablePiece;
type Page =
  | { kind: "approval" | "toc" | "intro" | "summary" | "conclusion" | "appendix" }
  | { kind: "divider"; chapter: Chapter }
  | { kind: "content"; chapter: Chapter; first: boolean; pieces: Piece[] };

function packChapter(chapter: Chapter): Page[] {
  const pages: Page[] = [];
  let pieces: Piece[] = [];
  let used = 90; // chapter heading + lead on the first page
  const flush = () => {
    pages.push({ kind: "content", chapter, first: pages.length === 0, pieces });
    pieces = [];
    used = 0;
  };
  chapter.blocks.forEach((b, i) => {
    if (b.t === "table") {
      let rows = b.rows;
      let part = 1;
      const rowHeight = rowHeights(b.headers, b.rows);
      for (;;) {
        const fixed = TABLE_FIXED;
        let fit = 0;
        let h = fixed;
        while (fit < rows.length && used + h + rowHeight(rows[fit]) <= PAGE_BUDGET) h += rowHeight(rows[fit++]);
        if (rows.length === 0) fit = used + fixed + 40 <= PAGE_BUDGET ? 0 : -1;
        if (fit === -1 || (fit < Math.min(3, rows.length) && pieces.length)) {
          flush();
          continue;
        }
        if (fit === 0 && rows.length) fit = 1; // a single row taller than the page still goes somewhere
        pieces.push({ ...b, rows: rows.slice(0, Math.max(fit, 0)), cont: part > 1, last: fit >= rows.length });
        used += rows.length ? sum(rows.slice(0, fit).map(rowHeight)) + fixed : fixed + 40;
        rows = rows.slice(Math.max(fit, 0));
        part++;
        if (!rows.length) break;
        flush();
      }
      return;
    }
    let h = blockHeight(b);
    // Keep a sub-head with the block after it.
    const next = chapter.blocks[i + 1];
    if (b.t === "sub" && next) h += next.t === "table" ? TABLE_FIXED + sum(next.rows.slice(0, 3).map(rowHeights(next.headers, next.rows))) : Math.min(blockHeight(next), 200);
    if (pieces.length && used + h > PAGE_BUDGET) flush();
    pieces.push(b);
    used += blockHeight(b);
  });
  if (pieces.length) flush();
  return pages;
}

function Shell({ pageNo, total, landscape, dark, id, label, footer, children }: { pageNo: number; total: number; landscape?: boolean; dark?: boolean; id?: string; label?: string; footer: string; children: ReactNode }) {
  return (
    <section className={landscape ? "rd-sheet rd-sheet-landscape rd-p47" : "rd-sheet rd-p47"} id={id} style={{ background: dark ? NAVY : CREAM, color: dark ? "#fff" : INK, padding: "40px 48px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {dark && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: ORANGE_LIGHT }} />}
      <PageHead dark={dark} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, marginTop: 18 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: dark ? "#8a97a8" : MUTED_2, borderTop: `1px solid ${dark ? "#1e2a38" : CARD_BORDER}`, paddingTop: 12, marginTop: 12 }}>
        <div>{label ?? footer}</div>
        <div>{pageNo} dari {total}</div>
      </div>
    </section>
  );
}

function DataTable({ headers, rows, start }: { headers: string[]; rows: (string | number)[][]; start: number }) {
  return (
    <div style={{ border: `1px solid ${CARD_BORDER}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
        <thead>
          <tr style={{ background: "#f2e9d9" }}>
            <th style={{ padding: "7px 8px", textAlign: "left", color: "#5c5346", fontSize: 9, width: 28 }}>NO</th>
            {headers.map((h) => <th key={h} style={{ padding: "7px 8px", textAlign: "left", color: "#5c5346", fontSize: 9, textTransform: "uppercase" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length + 1} style={{ padding: 16, textAlign: "center", color: MUTED_2 }}>Tidak ada data pada periode ini.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
              <td style={{ padding: "6px 8px", color: MUTED_2, verticalAlign: "top" }}>{start + i + 1}</td>
              {r.map((c, j) => <td key={j} style={{ padding: "6px 8px", verticalAlign: "top", textAlign: typeof c === "number" ? "right" : "left", fontVariantNumeric: "tabular-nums" }}>{textOf(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FigureBody({ fig }: { fig: Fig }) {
  switch (fig.k) {
    case "kpis": return <KpiTiles tiles={fig.tiles} />;
    case "hbar": return <HBarList rows={fig.rows} total={fig.total} keyWidth={fig.keyWidth} />;
    case "columns": return <ColumnChart items={fig.items} />;
    case "donuts":
      return (
        <div style={{ display: "grid", gridTemplateColumns: fig.items.length > 1 ? "1fr 1fr" : "1fr", gap: 14 }}>
          {fig.items.map((d) => (
            <div key={d.cap} style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{d.cap}</div>
              <Donut size={96} center={d.center} sub={d.sub} segs={colored(d.segs)} />
            </div>
          ))}
        </div>
      );
  }
}

function PieceView({ b }: { b: Piece }) {
  switch (b.t) {
    case "sub": return <SubHead num={b.num} title={b.title} />;
    case "p": return <Para>{b.text}</Para>;
    case "fig": return <Figure num={b.num} title={b.title} source={b.source}><FigureBody fig={b.fig} /></Figure>;
    case "highlights": return <Ikhtisar items={b.items} />;
    case "limits": return <Limits items={b.items} />;
    case "table":
      return (
        <div style={{ margin: "4px 0 12px" }}>
          <TableCaption num={b.num} title={`${b.title}${b.cont ? " (lanjutan)" : ""}`} />
          <DataTable headers={b.headers} rows={b.rows} start={b.offset ?? 0} />
          {b.last !== false && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 6 }}>Sumber: {b.source}</div>}
        </div>
      );
  }
}

/** The printable chapter report (Pelaporan Pasal 47) for one period. */
export function ChapterReportView({ model, report, period, backHref, generatedAt, meta }: { model: ChapterReportModel; report: P47Report; period: ReportingPeriod; backHref: string; generatedAt: string; meta: ChapterReportMeta }) {
  const pages: Page[] = [{ kind: "approval" }, { kind: "toc" }, { kind: "intro" }, { kind: "summary" }];
  for (const chapter of model.chapters) pages.push({ kind: "divider", chapter }, ...packChapter(chapter));
  pages.push({ kind: "conclusion" }, { kind: "appendix" });
  // Row numbers continue across the parts of a table.
  const offsets = new Map<Piece, number>();
  const seen = new Map<string, number>();
  for (const p of pages) if (p.kind === "content") for (const b of p.pieces) if (b.t === "table") {
    const k = `${p.chapter.n}:${b.num}`;
    offsets.set(b, seen.get(k) ?? 0);
    seen.set(k, (seen.get(k) ?? 0) + b.rows.length);
  }
  const total = pages.length + 1;
  const preparedOn = report.preparedAt ?? report.updatedAt ?? generatedAt;
  const isApproved = report.status === "APPROVED";
  const badge = STATUS_BADGE[report.status];
  const pageOf = (pred: (p: Page) => boolean) => pages.findIndex(pred) + 2;
  const toc: [string, string, number, string, boolean][] = [
    ["i", "Halaman Persetujuan", pageOf((p) => p.kind === "approval"), "persetujuan", false],
    ["ii", "Pendahuluan", pageOf((p) => p.kind === "intro"), "pendahuluan", false],
    ["iii", "Ringkasan Eksekutif", pageOf((p) => p.kind === "summary"), "ringkasan", false],
    ...model.chapters.map((c) => [String(c.n), c.title, pageOf((p) => p.kind === "divider" && p.chapter === c), `bab-${c.n}`, true] as [string, string, number, string, boolean]),
    ["", "Kesimpulan", pageOf((p) => p.kind === "conclusion"), "kesimpulan", false],
    ["", "Lampiran: Sumber Data dan Keterbatasan", pageOf((p) => p.kind === "appendix"), "lampiran", false],
  ];
  const h1 = (t: string) => <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "0 0 14px" }}>{t}</h1>;

  const page = (p: Page, i: number) => {
    const n = i + 2;
    switch (p.kind) {
      case "approval":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} id="persetujuan">
            <Eyebrow>HALAMAN PERSETUJUAN</Eyebrow>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 14px" }}>Persetujuan Laporan</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, maxWidth: 640, margin: 0 }}>
              Laporan ini disusun sebagai pelaporan pelaksanaan {meta.approvalSubject} sebagaimana dimaksud dalam Pasal 47 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, berdasarkan data permohonan, hasil verifikasi dokumen, survei lapangan dan analisis teknis yang tercatat pada sistem.
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
          </Shell>
        );
      case "toc":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} id="daftar-isi">
            <Eyebrow>DAFTAR ISI</Eyebrow>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 18px" }}>Daftar Isi</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {toc.map(([no, label, pg, anchor, chapter]) => (
                <a key={anchor} href={`#${anchor}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: "8px 14px", textDecoration: "none", color: INK }}>
                  <span style={{ minWidth: 36, height: 22, borderRadius: 11, background: chapter ? ORANGE : NAVY, color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 6px" }}>{no || "•"}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{chapter ? `Bab ${no} — ${label}` : label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{pg}</span>
                </a>
              ))}
            </div>
          </Shell>
        );
      case "intro":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} id="pendahuluan">
            <Eyebrow>PENDAHULUAN</Eyebrow>
            <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px" }}>
              {meta.introHeading}
              <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: MUTED, marginTop: 4 }}>{meta.introSub}</span>
            </h1>
            {model.intro.map((t) => <p key={t} style={{ fontSize: 12.5, lineHeight: 1.7, color: INK, margin: "0 0 12px", textAlign: "justify" }}>{t}</p>)}
          </Shell>
        );
      case "summary":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} id="ringkasan">
            <Eyebrow>RINGKASAN EKSEKUTIF</Eyebrow>
            {h1("Ringkasan Eksekutif")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {model.summary.tiles.map(([v, l, s], ti) => (
                <div key={l} style={{ border: `1px solid ${ti ? CARD_BORDER : "#b4561a"}`, background: ti ? "#fff" : "#b4561a", color: ti ? INK : "#fff", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: v.length > 7 ? 18 : 26, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.07em", color: ti ? ORANGE_TEXT : "#fff", marginTop: 6 }}>{l}</div>
                  <div style={{ fontSize: 10.5, color: ti ? MUTED : "#fff", marginTop: 2 }}>{s}</div>
                </div>
              ))}
            </div>
            {model.summary.highlights.length > 0 && (
              <>
                <Eyebrow><span style={{ display: "block", marginTop: 18 }}>POKOK HASIL PER BAB</span></Eyebrow>
                <ol style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 12, lineHeight: 1.6 }}>{model.summary.highlights.map((t) => <li key={t} style={{ margin: "3px 0" }}>{t}</li>)}</ol>
              </>
            )}
            {model.summary.alerts.length > 0 && (
              <div style={{ border: `1px solid ${CARD_BORDER}`, borderLeft: "3px solid #e0a43a", borderRadius: "0 12px 12px 0", background: "#fff", padding: "12px 16px", marginTop: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: ORANGE_TEXT, marginBottom: 6 }}>PERLU DIPERHATIKAN SEBELUM DISAMPAIKAN</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>{model.summary.alerts.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            )}
          </Shell>
        );
      case "divider":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} dark id={`bab-${p.chapter.n}`} label={`Bab ${p.chapter.n} — ${p.chapter.title}`}>
            <DividerBody n={p.chapter.n} title={p.chapter.title} lead={p.chapter.lead} scope={p.chapter.scope} stats={p.chapter.stats} />
          </Shell>
        );
      case "content":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer}>
            <Eyebrow>{p.first ? `BAB ${p.chapter.n}` : `BAB ${p.chapter.n} · LANJUTAN`}</Eyebrow>
            {p.first && h1(p.chapter.title)}
            {p.first && <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, margin: "0 0 4px" }}>{p.chapter.lead}</p>}
            {p.pieces.map((b, j) => <PieceView key={j} b={b.t === "table" ? { ...b, offset: offsets.get(b) ?? 0 } : b} />)}
          </Shell>
        );
      case "conclusion":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} id="kesimpulan">
            <Eyebrow>KESIMPULAN</Eyebrow>
            {h1("Kesimpulan Pelaksanaan VIU")}
            {model.conclusion.map((s) => (
              <div key={s.title} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, margin: "8px 0 6px" }}>{s.title}</div>
                {s.paragraphs.length > 1 ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.65 }}>{s.paragraphs.map((t) => <li key={t}>{t}</li>)}</ul> : s.paragraphs.map((t) => <Para key={t}>{t}</Para>)}
              </div>
            ))}
          </Shell>
        );
      case "appendix":
        return (
          <Shell key={i} pageNo={n} total={total} footer={meta.footer} id="lampiran">
            <Eyebrow>LAMPIRAN</Eyebrow>
            {h1("Sumber Data dan Keterbatasan")}
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.75, color: MUTED }}>{meta.appendix.map((t) => <li key={t}>{t}</li>)}</ul>
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
            {meta.topbarTitle} <span className="rd-topbar-sub">&middot; {period.label} &middot; {STATUS_LABEL[report.status]}</span>
          </div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => window.print()}><MaterialIcon name="print" className="text-[16px]" />Cetak</button>
          <PdfDownloadButton scheme={meta.pdfScheme} periodKey={period.key} />
        </div>
      </div>
      <main className="rd-main">
        <section className="rd-sheet rd-p47 rd-p47-cover" style={{ background: NAVY, color: "#fff", position: "relative", padding: "48px 56px", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: ORANGE_LIGHT }} />
          <PageHead dark />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18 }}>
            <div style={{ display: "inline-flex", background: ORANGE_LIGHT, color: NAVY, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", padding: "6px 14px", width: "fit-content", borderRadius: 20 }}>PELAPORAN PASAL 47</div>
            <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>{meta.coverTitle}</h1>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{meta.coverSubject[0]} <span style={{ color: ORANGE_LIGHT }}>{meta.coverSubject[1]}</span></div>
            <div style={{ border: "1px solid #2d3a4a", padding: "22px 26px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px 24px", marginTop: 8, borderRadius: 14 }}>
              {[
                ["NOMOR DOKUMEN", meta.docNumber],
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
            <div>{meta.title}</div>
            <div>Dokumen Rahasia — Distribusi Terbatas</div>
          </div>
        </section>
        {pages.map(page)}
      </main>
    </div>
  );
}
