"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MaterialIcon } from "../../../components/material-icon";
import { PdfDownloadButton } from "../../components/pdf-download-button";
import { Badge, CARD_BORDER, CREAM, Eyebrow, GREEN, INK, MUTED, MUTED_2, NAVY, ORANGE, ORANGE_LIGHT, ORANGE_TEXT, PageHead } from "@/modules/verifikator-workspace/components/report/document-verification-report";
import { resolvePeriod, type ReportingPeriod } from "../../derive";
import type { ExportSection, ExportTable } from "../sections";
import { fdLong, nf } from "../../format";
import type { P47Report } from "../../types";
import { buildIndustriSections, industriAlerts, industriConclusion, industriIntroduction, industriKpis, INDUSTRI_PARTS, INDUSTRI_SECTION_INTRO } from "../report";
import type { IndustriDataset } from "../types";
import "@/modules/surveyor-workspace/components/report/office-report-preview.css";

const TITLE = "Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Industri";
const STATUS_LABEL = { DRAFT: "Draf", REVIEWED: "Ditelaah", APPROVED: "Disetujui" } as const;
const STATUS_BADGE = { DRAFT: { color: "#7a4a10", bg: "#ffebce" }, REVIEWED: { color: "#1a3a6b", bg: "#dbe8fa" }, APPROVED: { color: "#0e3d24", bg: "#d2f6dd" } } as const;

type Plan =
  | { kind: "approval" }
  | { kind: "toc" }
  | { kind: "intro" }
  | { kind: "summary" }
  | { kind: "narrative"; section: ExportSection }
  | { kind: "table"; section: ExportSection; table: ExportTable; tableIndex: number; rows: (string | number)[][]; part: number; parts: number; first: boolean; landscape: boolean }
  | { kind: "conclusion" }
  | { kind: "appendix" };

const rowsPerPage = (t: ExportTable, landscape: boolean) => {
  const longText = t.headers.some((h) => /Temuan|Isi|Alamat|Uraian|Kesimpulan|Peruntukan/.test(h));
  return landscape ? (longText ? 8 : 12) : longText ? 10 : 16;
};

/** Page plan: approval, contents, introduction, summary, one or more pages per section table, conclusion, appendix. */
function planPages(sections: ExportSection[]): Plan[] {
  const plan: Plan[] = [{ kind: "approval" }, { kind: "toc" }, { kind: "intro" }, { kind: "summary" }];
  for (const section of sections.filter((s) => s.no !== "8.9")) {
    if (section.narrative?.length) plan.push({ kind: "narrative", section });
    section.tables.forEach((table, tableIndex) => {
      const landscape = table.headers.length > 6;
      const size = rowsPerPage(table, landscape);
      const chunks = table.rows.length ? Array.from({ length: Math.ceil(table.rows.length / size) }, (_, i) => table.rows.slice(i * size, (i + 1) * size)) : [[]];
      chunks.forEach((rows, i) => plan.push({ kind: "table", section, table, tableIndex, rows, part: i + 1, parts: chunks.length, first: tableIndex === 0 && i === 0, landscape }));
    });
  }
  plan.push({ kind: "conclusion" }, { kind: "appendix" });
  return plan;
}

function Shell({ pageNo, total, landscape, id, children }: { pageNo: number; total: number; landscape?: boolean; id?: string; children: ReactNode }) {
  return (
    <section className={landscape ? "rd-sheet rd-sheet-landscape rd-p47" : "rd-sheet rd-p47"} id={id} style={{ background: CREAM, color: INK, padding: "40px 48px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHead />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, marginTop: 18 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED_2, borderTop: `1px solid ${CARD_BORDER}`, paddingTop: 12, marginTop: 12 }}>
        <div>Laporan Pelaksanaan VIU Bahan Baku Industri — Pelaporan Pasal 47</div>
        <div>{pageNo} dari {total}</div>
      </div>
    </section>
  );
}

function DataTable({ table, rows }: { table: ExportTable; rows: (string | number)[][] }) {
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

export function IndustriReport({ periodKey }: { periodKey: string | null }) {
  const period: ReportingPeriod = resolvePeriod(periodKey, new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "pasal47", "industri", period.from, period.to],
    queryFn: async () => {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47?scheme=industri&from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return ((await res.json()) as { data: { dataset: IndustriDataset; report: P47Report } }).data;
    },
  });
  const backHref = `/project-manager-workspace/viu/industri/laporan-kemenperin?periode=${period.key}&halaman=kesimpulan`;

  if (isLoading) return <div style={{ padding: 32, textAlign: "center", color: MUTED_2 }}>Menyusun laporan…</div>;
  if (isError || !data) return <div style={{ padding: 32, textAlign: "center", color: "#7a1f14" }}>Laporan gagal dimuat. <Link href={backHref}>Kembali</Link></div>;

  const { dataset: ds, report } = data;
  const sections = buildIndustriSections(ds, report, INDUSTRI_PARTS.map(([no]) => no));
  const plan = planPages(sections);
  const total = plan.length;
  const startPage = (no: string) => plan.findIndex((p) => (p.kind === "narrative" && p.section.no === no) || (p.kind === "table" && p.section.no === no && p.first)) + 1;
  const pageOf = (kind: Plan["kind"]) => plan.findIndex((p) => p.kind === kind) + 1;
  const k = industriKpis(ds, report);
  const preparedOn = report.preparedAt ?? report.updatedAt ?? ds.generatedAt;
  const isApproved = report.status === "APPROVED";
  const badge = STATUS_BADGE[report.status];
  const body = sections.filter((s) => s.no !== "8.9");

  const page = (p: Plan, i: number): ReactNode => {
    const n = i + 1;
    switch (p.kind) {
      case "approval":
        return (
          <Shell key={i} pageNo={n} total={total} id="persetujuan">
            <Eyebrow>HALAMAN PERSETUJUAN</Eyebrow>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 14px" }}>Persetujuan Laporan</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, maxWidth: 640, margin: 0 }}>
              Laporan ini disusun sebagai pelaporan pelaksanaan Verifikasi Importir Umum (VIU) Bahan Baku/Penolong Perusahaan Industri sebagaimana dimaksud dalam Pasal 47 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, berdasarkan data permohonan, hasil verifikasi dokumen, survei lapangan, dan analisis teknis pada periode {fdLong(period.from)} sampai dengan {fdLong(period.to)}.
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
          <Shell key={i} pageNo={n} total={total} id="daftar-isi">
            <Eyebrow>DAFTAR ISI</Eyebrow>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 20px" }}>Daftar Isi</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["1", "Halaman Persetujuan", 1, "persetujuan", NAVY], ["2", "Daftar Isi", 2, "daftar-isi", NAVY], ["3", "Pendahuluan", pageOf("intro"), "pendahuluan", NAVY], ["4", "Ringkasan Eksekutif", pageOf("summary"), "ringkasan", NAVY],
                ...body.map((s) => [s.no, s.title, startPage(s.no), `bab-${s.no}`, ORANGE]),
                ["8.9", "Kesimpulan Pelaksanaan VIU", pageOf("conclusion"), "kesimpulan", ORANGE], ["A", "Lampiran: Sumber Data & Keterbatasan", pageOf("appendix"), "lampiran", NAVY],
              ].map(([no, label, pg, anchor, color]) => (
                <a key={String(anchor)} href={`#${anchor}`} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 10, padding: "9px 16px", textDecoration: "none" }}>
                  <div style={{ minWidth: 34, height: 22, borderRadius: 11, background: String(color), color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{no}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a3a6b", flex: 1 }}>{label}</div>
                  <div style={{ fontSize: 12, color: MUTED_2 }}>{String(pg).padStart(2, "0")}</div>
                </a>
              ))}
            </div>
          </Shell>
        );
      case "intro":
        return (
          <Shell key={i} pageNo={n} total={total} id="pendahuluan">
            <Eyebrow>PENDAHULUAN</Eyebrow>
            <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px" }}>
              Pendahuluan Laporan Pelaksanaan VIU
              <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: MUTED, marginTop: 4 }}>Bahan Baku/Penolong Perusahaan Industri</span>
            </h1>
            {industriIntroduction(ds, report).map((text) => <p key={text} style={{ fontSize: 12.5, lineHeight: 1.7, color: INK, margin: "0 0 12px", textAlign: "justify" }}>{text}</p>)}
          </Shell>
        );
      case "summary":
        return (
          <Shell key={i} pageNo={n} total={total} id="ringkasan">
            <Eyebrow>RINGKASAN EKSEKUTIF</Eyebrow>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 12px" }}>Ringkasan Eksekutif</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED, maxWidth: 680, margin: 0 }}>{industriConclusion(ds, report)[0].paragraphs[0]}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 22 }}>
              <Tile label="API-U" value={k.companies} sub={`${k.applications} permohonan`} />
              <Tile label="LHVIU" value={k.lhviu} sub="telah diterbitkan" />
              <Tile label="POS TARIF/HS" value={k.hs} sub={`${k.lines} bahan baku`} />
              <Tile label="PARTNER INDUSTRI" value={k.partners} sub="terdaftar pada sistem" />
              <Tile label="TEMUAN" value={k.findings} sub="seluruh sumber" />
              <Tile label="ISU MATERIAL" value={k.material} sub="ditetapkan Project Manager" />
              <Tile label="ANALISIS SESUAI" value={ds.analysis.filter((a) => a.status.tone === "ok").length} sub={`dari ${ds.analysis.length} modul`} />
              <Tile label="GUDANG" value={ds.warehouses.length} sub={`${ds.warehouses.filter((w) => w.capacity !== null).length} dengan data kapasitas`} />
            </div>
            <div style={{ background: ORANGE, color: "#fff", padding: "18px 22px", marginTop: 22, borderRadius: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.85 }}>KESIMPULAN</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6 }}>{industriConclusion(ds, report).find((s) => s.title.startsWith("6."))?.paragraphs[0]}</div>
            </div>
            <Eyebrow><span style={{ display: "block", marginTop: 22 }}>CATATAN KUALITAS DATA</span></Eyebrow>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: MUTED }}>{industriAlerts(ds).map((a) => <li key={a.text}>{a.text}</li>)}</ul>
          </Shell>
        );
      case "narrative": {
        const idx = body.findIndex((s) => s.no === p.section.no);
        return (
          <Shell key={i} pageNo={n} total={total} id={`bab-${p.section.no}`}>
            <Eyebrow>BAB {idx + 1} · BAGIAN {p.section.no}</Eyebrow>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>{p.section.title}</h1>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: MUTED, margin: "0 0 14px" }}>{INDUSTRI_SECTION_INTRO[p.section.no]}</p>
            {p.section.narrative?.map((text) => <p key={text} style={{ fontSize: 12, lineHeight: 1.65, color: INK, margin: "0 0 10px", textAlign: "justify" }}>{text}</p>)}
          </Shell>
        );
      }
      case "table": {
        const idx = body.findIndex((s) => s.no === p.section.no);
        return (
          <Shell key={i} pageNo={n} total={total} landscape={p.landscape} id={p.first && !p.section.narrative ? `bab-${p.section.no}` : undefined}>
            <Eyebrow>BAB {idx + 1} · BAGIAN {p.section.no}</Eyebrow>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>{p.section.title}{p.parts > 1 || p.tableIndex > 0 ? <span style={{ fontSize: 13, color: MUTED_2, fontWeight: 600 }}> {p.table.title ? `· ${p.table.title}` : ""}{p.parts > 1 ? ` (${p.part}/${p.parts})` : ""}</span> : null}</h1>
            {p.first && !p.section.narrative && <p style={{ fontSize: 12, lineHeight: 1.6, color: MUTED, margin: "0 0 14px", maxWidth: 820 }}>{INDUSTRI_SECTION_INTRO[p.section.no]}</p>}
            {p.table.title && p.tableIndex === 0 && p.part === 1 && <div style={{ fontSize: 11, fontWeight: 700, color: ORANGE_TEXT, marginBottom: 6 }}>{p.table.title}</div>}
            <DataTable table={p.table} rows={p.rows} />
            {p.part === p.parts && <div style={{ fontSize: 10, color: MUTED_2, marginTop: 8 }}>{p.table.rows.length} baris · sumber: data sistem per {new Date(ds.generatedAt).toLocaleString("id-ID")}</div>}
          </Shell>
        );
      }
      case "conclusion":
        return (
          <Shell key={i} pageNo={n} total={total} id="kesimpulan">
            <Eyebrow>BAGIAN 8.9</Eyebrow>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 12px" }}>Kesimpulan Pelaksanaan VIU</h1>
            {industriConclusion(ds, report).map((s) => (
              <div key={s.title} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{s.title}</div>
                {s.paragraphs.length > 1 ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: MUTED }}>{s.paragraphs.map((t) => <li key={t}>{t}</li>)}</ul> : <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: MUTED }}>{s.paragraphs[0]}</p>}
              </div>
            ))}
            <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: "14px 16px", marginTop: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>7. Catatan Project Manager</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: report.pmNote ? INK : MUTED_2, whiteSpace: "pre-wrap" }}>{report.pmNote || "Belum ada catatan Project Manager."}</p>
            </div>
          </Shell>
        );
      case "appendix":
        return (
          <Shell key={i} pageNo={n} total={total} id="lampiran">
            <Eyebrow>LAMPIRAN</Eyebrow>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 12px" }}>Sumber Data & Keterbatasan</h1>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: MUTED }}>
              <li>Permohonan dihitung bila Tanggal Terbit LHVIU berada dalam periode, atau Tanggal Pengajuan bila tanggal terbit belum dicatat; draf dan permohonan yang ditarik tidak dihitung.</li>
              <li>Data perusahaan, KBLI, dan lokasi diambil dari profil perusahaan; bahan baku, HS, volume, dan peruntukan dari Product Information permohonan.</li>
              <li>Partner Industri dan LHVKI dari data Partner dan lampiran permohonan; nilai modal kerja dari Surat Pernyataan Kepemilikan Modal Kerja.</li>
              <li>Kapasitas gudang, kesesuaian HS dan volume terhadap LHVKI, serta keputusan modal kerja dari Analisis Teknis.</li>
              <li>Temuan berasal dari survei lapangan, verifikasi dokumen, verifikasi produk, dan analisis teknis. Severity non-survei dipetakan dari keputusan reviewer; materialitas ditetapkan Project Manager.</li>
              <li>Kuantitas tidak dijumlahkan lintas satuan. Harga, negara asal, dan data realisasi impor bahan baku belum tersedia pada sistem.</li>
            </ul>
          </Shell>
        );
    }
  };

  return (
    <div className="report-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <div className="rd-topbar">
        <Link href={backHref} className="rd-back"><MaterialIcon name="arrow_back" className="text-base" />Kembali ke Laporan Kemenperin</Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">Laporan Pelaksanaan VIU <span className="rd-topbar-sub">&middot; Industri &middot; {period.label} &middot; {STATUS_LABEL[report.status]}</span></div>
        </div>
        <div className="rd-topbar-actions">
          <button type="button" className="rd-btn" onClick={() => window.print()}><MaterialIcon name="print" className="text-[16px]" />Cetak</button>
          <PdfDownloadButton scheme="industri" periodKey={period.key} />
        </div>
      </div>
      <main className="rd-main">
        <section className="rd-sheet rd-p47 rd-p47-cover" style={{ background: NAVY, color: "#fff", position: "relative", padding: "48px 56px", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: ORANGE_LIGHT }} />
          <PageHead dark />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 18 }}>
            <div style={{ display: "inline-flex", background: ORANGE_LIGHT, color: NAVY, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", padding: "6px 14px", width: "fit-content", borderRadius: 20 }}>PELAPORAN PASAL 47</div>
            <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>Laporan Pelaksanaan VIU</h1>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Bahan Baku/Penolong <span style={{ color: ORANGE_LIGHT }}>Perusahaan Industri</span></div>
            <div style={{ border: "1px solid #2d3a4a", padding: "22px 26px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px 24px", marginTop: 8, borderRadius: 14 }}>
              {[
                ["NOMOR DOKUMEN", `LP47/VIU-I/${period.key}`],
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
