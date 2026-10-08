"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { buildExportSections, EXPORT_PARTS, type ExportSection } from "../export-sections";
import { usePasal47 } from "./context";
import { H2, Seg } from "./ui";

const TYPES: [string, string, string, string[]][] = [
  ["full", "Full Report", "Seluruh bagian 8.2–8.14", EXPORT_PARTS.map(([no]) => no)],
  ["exec", "Executive Summary", "Kesimpulan dan temuan", ["8.13", "8.14"]],
  ["data", "Data Detail", "Tabel rinci 8.2–8.11", EXPORT_PARTS.map(([no]) => no).filter((no) => !["8.12", "8.13", "8.14"].includes(no))],
  ["lamp", "Lampiran", "Bukti merek, uji mutu, gudang", ["8.6", "8.7", "8.8"]],
];

const sheetName = (s: ExportSection) => `${s.no} ${s.title}`.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

/** Print view: the selected sections as plain tables; only this block is visible when printing. */
export function PrintView({ sections, title, meta }: { sections: ExportSection[]; title: string; meta: string }) {
  return (
    <div className="p47-print" aria-hidden="true">
      <h1>{title}</h1>
      <div>{meta}</div>
      {sections.map((s) => (
        <section key={s.no}>
          <h2>{s.no} {s.title}</h2>
          {s.tables.map((t, i) => (
            <div key={i}>
              {t.title && <b>{t.title}</b>}
              <table>
                <thead><tr>{t.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{t.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{typeof c === "number" ? c.toLocaleString("id-ID") : c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function ExportPage() {
  const { ds, report, period, activeFilters } = usePasal47();
  const [type, setType] = useState("full");
  const [fmt, setFmt] = useState<"pdf" | "xlsx">("pdf");
  const [parts, setParts] = useState<string[]>(TYPES[0][3]);
  const sections = useMemo(() => buildExportSections(ds, report, parts), [ds, report, parts]);
  const title = "Laporan Pelaksanaan VIU – Produk Tekstil sebagai Barang Konsumsi";
  const meta = `Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025 · ${period.label}${activeFilters.length ? ` · filter: ${activeFilters.map(([k, v]) => `${k} ${v}`).join(", ")}` : ""} · status ${report.status}`;

  function run() {
    if (!sections.length) return toast.error("Pilih minimal satu bagian laporan.");
    if (fmt === "pdf") {
      window.print();
      return;
    }
    const book = XLSX.utils.book_new();
    const cover = XLSX.utils.aoa_to_sheet([[title], [meta], [], ["Bagian", "Judul"], ...sections.map((s) => [s.no, s.title])]);
    XLSX.utils.book_append_sheet(book, cover, "Sampul");
    for (const s of sections) {
      const aoa: (string | number)[][] = [];
      s.tables.forEach((t, i) => { if (i) aoa.push([]); if (t.title) aoa.push([t.title]); aoa.push(t.headers, ...t.rows); });
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(aoa), sheetName(s));
    }
    XLSX.writeFile(book, `Pelaporan Pasal 47 ${period.from} sd ${period.to}.xlsx`);
    toast.success("File Excel dibuat.");
  }

  return (
    <>
      <H2 title="Export Laporan" sub="Atur isi laporan, lalu export. Isi mengikuti periode dan filter aktif." />
      <div className="ex">
        <div className="card" style={{ display: "grid", gap: 14 }}>
          <div className="fld"><span className="lbl">Periode</span><span>{period.label} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>(ubah di pemilih periode di atas)</span></span></div>
          <div className="fld"><span className="lbl">Jenis laporan</span>
            <div className="opt-cards">{TYPES.map(([v, l, d, p]) => <button key={v} type="button" className="opt" aria-pressed={type === v} onClick={() => { setType(v); setParts(p); }}><b>{l}</b><span>{d}</span></button>)}</div>
          </div>
          <div className="fld"><span className="lbl">Filter aktif</span><span style={{ fontSize: 12.5 }}>{activeFilters.length ? activeFilters.map(([k, v]) => `${k}: ${v}`).join(" · ") : "Tidak ada filter aktif (seluruh data periode)"}</span></div>
          <div className="fld">
            <span className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Bagian yang disertakan</span>
              <span><button className="btn sm ghost" type="button" onClick={() => setParts(EXPORT_PARTS.map(([no]) => no))}>Pilih semua</button><button className="btn sm ghost" type="button" onClick={() => setParts([])}>Kosongkan</button></span>
            </span>
            <div className="checks">
              {EXPORT_PARTS.map(([no, l]) => (
                <label key={no}><input type="checkbox" checked={parts.includes(no)} onChange={(e) => setParts((p) => (e.target.checked ? [...p, no] : p.filter((x) => x !== no)))} /><span className="no">{no}</span>{l}</label>
              ))}
            </div>
          </div>
          <div className="fld"><span className="lbl">Format</span><Seg label="Format" value={fmt} onChange={setFmt} options={[["pdf", "PDF / Print"], ["xlsx", "Excel"]]} /></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn primary" type="button" onClick={run} disabled={!parts.length}>{fmt === "pdf" ? "Cetak / Simpan PDF" : "Unduh Excel"}</button>
            {fmt === "pdf" && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Pilih &quot;Save as PDF&quot; di dialog cetak untuk menyimpan PDF.</span>}
          </div>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Pratinjau</div>
          <div className="paper">
            <h5>{title}</h5>
            <div className="pm">{meta}</div>
            <ol>
              {sections.length ? sections.map((s) => <li key={s.no}><span className="mono" style={{ width: 34 }}>{s.no}</span><span>{s.title}</span><em>{s.tables.reduce((a, t) => a + t.rows.length, 0)} baris</em></li>) : <li>Pilih minimal satu bagian.</li>}
            </ol>
          </div>
        </div>
      </div>
      <PrintView sections={sections} title={title} meta={meta} />
    </>
  );
}
