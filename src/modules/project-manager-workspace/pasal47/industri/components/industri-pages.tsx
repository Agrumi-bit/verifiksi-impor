"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { lhviuStatus, type ReportingPeriod } from "../../derive";
import { MaterialIcon } from "../../../components/material-icon";
import { DataTable } from "../../components/data-table";
import { PrintView } from "../../components/page-export";
import { Badge, Banner, Card, COLOR, H2, HBar, Kpi, Na, Seg, StackBar } from "../../components/ui";
import { fd, fdLong, nf, topN, countBy, uniq } from "../../format";
import { MATERIALITY_LABEL, materialityOf } from "../../summary";
import type { Materiality, P47Finding, P47Report, ReportStatus } from "../../types";
import { buildIndustriSections, industriAlerts, industriConclusion, industriHsRows, industriKpis, INDUSTRI_PARTS } from "../report";
import type { IndustriDataset } from "../types";
import { kbliRows } from "../../company-chapter";

export type IndustriPageProps = {
  ds: IndustriDataset;
  report: P47Report;
  period: ReportingPeriod;
  saving: boolean;
  saveReport: (patch: { status?: ReportStatus; pmNote?: string; materiality?: Record<string, Materiality> }) => Promise<void>;
  go: (page: string) => void;
  reportHref: string;
};

const SEV_ORDER = { Minor: 1, Major: 2, Critical: 3 } as const;
const TITLE = "Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Industri";
const rp = (n: number | null) => (n === null ? "" : `Rp ${nf(n)}`);

export function RingkasanPage({ ds, report, go }: IndustriPageProps) {
  const k = industriKpis(ds, report);
  const analysis = countBy(ds.analysis, (a) => a.status.label);
  const own = (places: string[]) => {
    const m = countBy(places, (x) => x || "Belum diisi");
    return [
      { label: "Milik Sendiri", v: m.get("Milik Sendiri") ?? 0, color: COLOR.ok },
      { label: "Sewa", v: m.get("Sewa") ?? 0, color: COLOR.na },
      ...(m.get("Belum diisi") ? [{ label: "Belum diisi", v: m.get("Belum diisi")!, color: COLOR.warn }] : []),
    ];
  };
  return (
    <>
      <div className="grid g4" style={{ marginTop: 14 }}>
        <Kpi label="Jumlah API-U" value={k.companies} sub={`${k.applications} permohonan`} tip="Perusahaan API-U dengan permohonan VIU Bahan Baku Industri yang Tanggal Terbit LHVIU-nya (atau tanggal pengajuan bila belum dicatat) di dalam periode." />
        <Kpi label="Jumlah LHVIU" value={k.lhviu} sub={`dari ${k.applications} permohonan`} />
        <Kpi label="Pos Tarif/HS" value={k.hs} sub={`${k.lines} bahan baku/penolong`} />
        <Kpi label="Partner Industri" value={k.partners} sub={`${ds.partners.flatMap((p) => p.uses).length} relasi dengan API-U`} />
        <Kpi label="Gudang" value={ds.warehouses.length} sub={`${ds.warehouses.filter((w) => w.capacity !== null).length} dengan data kapasitas`} />
        <Kpi label="Analisis Teknis" value={`${analysis.get("Sesuai") ?? 0} / ${ds.analysis.length}`} sub="modul dinyatakan Sesuai" />
        <Kpi label="Jumlah Temuan" value={k.findings} sub={`${ds.findings.filter((f) => f.status.tone !== "ok").length} belum selesai ditinjau`} />
        <Kpi label="Isu Material" value={k.material} sub="ditetapkan Project Manager" tone={k.material ? "bad" : undefined} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="Distribusi API-U per KBLI" caption="Jumlah perusahaan menurut KBLI Utama">
          <HBar items={kbliRows(ds.applications, "industri").slice(0, 6).map((r) => ({ label: `${r.code} · ${r.description}`, v: r.companies.length }))} />
        </Card>
        <Card title="Top Pos Tarif/HS" caption={`Share dari ${k.lines} bahan baku`} right={<button className="btn sm ghost" type="button" onClick={() => go("bahan")}>Lihat semua →</button>}>
          <HBar total={k.lines} items={industriHsRows(ds.lines).slice(0, 5).map((r) => ({ label: `${r.hs}${r.description ? ` · ${r.description}` : ""}`, v: r.lines }))} />
        </Card>
        <Card title="Partner Industri" caption="Jumlah API-U per Partner Industri" right={<button className="btn sm ghost" type="button" onClick={() => go("partner")}>Lihat partner →</button>}>
          <HBar items={ds.partners.map((p) => ({ label: p.name, v: uniq(p.uses.map((u) => u.applicationId)).length }))} empty="Belum ada Partner Industri." />
        </Card>
        <Card title="Kepemilikan Lokasi" caption="Status kepemilikan kantor dan gudang">
          <StackBar label="Kantor" unit="lokasi" segments={own(ds.applications.flatMap((a) => (a.kantor ? [a.kantor.ownership] : [])))} />
          <StackBar label="Gudang" unit="lokasi" segments={own(ds.applications.flatMap((a) => a.gudang.map((g) => g.ownership)))} />
        </Card>
        <Card title="Hasil Analisis Teknis" caption="Keputusan Technical Analyst per modul">
          <HBar items={topN(countBy(ds.analysis, (a) => `${a.module}: ${a.status.label}`), 9).map(([l, v]) => ({ label: l, v }))} empty="Belum ada analisis teknis." />
        </Card>
        <Card title="Catatan Kualitas Data">
          <div className="alerts">{industriAlerts(ds).map((a) => <div key={a.text} className={`alert ${a.tone}`}><MaterialIcon name={a.tone === "bad" ? "error" : a.tone === "na" ? "do_not_disturb_on" : "warning"} className="text-[18px]" /><span>{a.text}</span></div>)}</div>
        </Card>
      </div>
    </>
  );
}

export function ApiuPage({ ds }: IndustriPageProps) {
  return (
    <>
      <H2 title="API-U, KBLI & LHVIU" sub="Perusahaan API-U pada periode, KBLI Utama, lokasi, dan status LHVIU." />
      <DataTable exportName="API-U Industri" rows={ds.applications} rowKey={(r) => r.id}
        columns={[
          { key: "c", label: "Perusahaan", value: (r) => r.company },
          { key: "n", label: "NIB", value: (r) => r.nib, mono: true },
          { key: "k", label: "KBLI Utama", value: (r) => r.kbli.map((x) => x.code).join(", "), mono: true },
          { key: "a", label: "Nomor Permohonan", value: (r) => r.applicationNumber, mono: true },
          { key: "d", label: "Tanggal Pengajuan", value: (r) => r.submittedAt, render: (r) => fd(r.submittedAt) },
          { key: "kc", label: "Kota Kantor", value: (r) => r.kantor?.city ?? "" },
          { key: "ko", label: "Kepemilikan Kantor", value: (r) => r.kantor?.ownership ?? "" },
          { key: "gc", label: "Kota Gudang", value: (r) => r.gudang.map((g) => g.city).join(", ") },
          { key: "l", label: "LHVIU", value: (r) => lhviuStatus(r).label, render: (r) => <Badge tone={lhviuStatus(r).tone}>{lhviuStatus(r).label}</Badge> },
          { key: "ln", label: "No. LHVIU", value: (r) => r.lhviu?.number ?? "", render: (r) => r.lhviu?.number ?? <Na>belum dicatat</Na>, hidden: true },
        ]} />
    </>
  );
}

export function BahanPage({ ds }: IndustriPageProps) {
  return (
    <>
      <H2 title="Bahan Baku & Pos Tarif/HS" sub="Rencana kebutuhan dijumlahkan hanya di dalam satu HS dengan satuan yang sama." />
      <DataTable exportName="HS Bahan Baku" rows={industriHsRows(ds.lines)} rowKey={(r) => r.hs} pageSize={6}
        columns={[
          { key: "h", label: "HS", value: (r) => r.hs, mono: true },
          { key: "d", label: "Uraian Barang", value: (r) => r.description },
          { key: "c", label: "Jumlah API-U", value: (r) => r.companies, num: true },
          { key: "l", label: "Bahan Baku", value: (r) => r.lines, num: true },
          { key: "q", label: "Rencana Kebutuhan", value: (r) => (Number.isNaN(r.quantity) ? "" : r.quantity), render: (r) => (Number.isNaN(r.quantity) ? <Na>Satuan berbeda</Na> : nf(r.quantity)), num: true },
          { key: "u", label: "Satuan", value: (r) => r.unit },
        ]} />
      <div style={{ height: 16 }} />
      <DataTable exportName="Bahan Baku" rows={ds.lines} rowKey={(r) => r.id}
        columns={[
          { key: "c", label: "Perusahaan", value: (r) => r.company },
          { key: "m", label: "Bahan Baku/Penolong", value: (r) => r.material },
          { key: "h", label: "HS", value: (r) => r.hs, mono: true },
          { key: "q", label: "Volume", value: (r) => r.quantity, num: true },
          { key: "u", label: "Satuan", value: (r) => r.unit },
          { key: "i", label: "Peruntukan", value: (r) => r.intendedUse },
          { key: "p", label: "Partner Industri", value: (r) => r.partnerName },
        ]} />
    </>
  );
}

export function PartnerPage({ ds }: IndustriPageProps) {
  const rows = ds.partners.flatMap((p) => p.uses.map((u) => ({ p, u })));
  return (
    <>
      <H2 title="Partner Industri & LHVKI" sub="Partner tujuan penggunaan bahan baku dan LHVKI yang dilampirkan Perusahaan API-U." />
      <DataTable exportName="Partner Industri" rows={rows} rowKey={(r) => `${r.p.id}:${r.u.applicationId}`}
        columns={[
          { key: "p", label: "Partner Industri", value: (r) => r.p.name },
          { key: "n", label: "NIB", value: (r) => r.p.nib, mono: true },
          { key: "k", label: "Kontrak", value: (r) => r.p.contractNumber },
          { key: "e", label: "Berlaku s.d.", value: (r) => r.p.contractEnd, render: (r) => fd(r.p.contractEnd) },
          { key: "c", label: "Perusahaan API-U", value: (r) => r.u.company },
          { key: "l", label: "No. LHVKI", value: (r) => r.u.lhvki },
          { key: "d", label: "Dokumen LHVKI", value: (r) => (r.u.lhvkiPath ? "Ada" : "Belum ada"), render: (r) => <Badge tone={r.u.lhvkiPath ? "ok" : "bad"}>{r.u.lhvkiPath ? "Ada" : "Belum ada"}</Badge> },
          { key: "b", label: "Bahan Baku", value: (r) => r.u.lines, num: true },
        ]} />
    </>
  );
}

export function GudangPage({ ds }: IndustriPageProps) {
  return (
    <>
      <H2 title="Persediaan & Gudang" sub="Gudang dari permohonan; kapasitas, stok, dan rencana impor dari modul Kapasitas Gudang Technical Analyst." />
      <DataTable exportName="Gudang Industri" rows={ds.warehouses} rowKey={(r) => r.id}
        columns={[
          { key: "c", label: "API-U", value: (r) => r.company },
          { key: "a", label: "Alamat Gudang", value: (r) => r.place.address },
          { key: "k", label: "Kota", value: (r) => r.place.city },
          { key: "o", label: "Kepemilikan", value: (r) => r.place.ownership },
          { key: "cap", label: "Kapasitas (analis)", value: (r) => r.capacity, num: true, render: (r) => (r.capacity === null ? <Na>belum dianalisis</Na> : nf(r.capacity)) },
          { key: "s", label: "Stok (analis)", value: (r) => r.analystStock, num: true, render: (r) => (r.analystStock === null ? "" : nf(r.analystStock)) },
          { key: "p", label: "Rencana Impor (analis)", value: (r) => r.analystPlan, num: true, render: (r) => (r.analystPlan === null ? "" : nf(r.analystPlan)) },
          { key: "d", label: "Keputusan", value: (r) => r.analystDecision },
        ]} />
    </>
  );
}

export function AnalisisPage({ ds }: IndustriPageProps) {
  return (
    <>
      <H2 title="Analisis Teknis" sub="Keputusan Technical Analyst: HS Code & volume terhadap LHVKI, kapasitas gudang, dan kepemilikan modal." />
      <DataTable exportName="Analisis Teknis Industri" rows={ds.analysis} rowKey={(r) => `${r.applicationId}:${r.moduleKey}`}
        columns={[
          { key: "c", label: "Perusahaan", value: (r) => r.company },
          { key: "m", label: "Modul Analisis", value: (r) => r.module },
          { key: "s", label: "Keputusan", value: (r) => r.status.label, render: (r) => <Badge tone={r.status.tone}>{r.status.label}</Badge> },
          { key: "k", label: "Kesimpulan", value: (r) => r.conclusion, render: (r) => <span style={{ display: "block", minWidth: 240 }}>{r.conclusion || <Na>belum ada</Na>}</span> },
        ]} />
    </>
  );
}

export function ModalPage({ ds }: IndustriPageProps) {
  return (
    <>
      <H2 title="Modal Kerja & Nilai Impor" sub="Nilai impor dari analisis teknis dibandingkan dengan modal kerja pada Surat Pernyataan. Seluruhnya dalam Rupiah." />
      <Banner kind="na" title="Harga bahan baku tidak dicatat pada permohonan.">Nilai impor hanya tersedia bila Technical Analyst mengisinya pada modul Kepemilikan Modal.</Banner>
      <DataTable exportName="Modal Kerja Industri" rows={ds.values} rowKey={(r) => r.applicationId}
        columns={[
          { key: "c", label: "Perusahaan", value: (r) => r.company },
          { key: "n", label: "Nilai Impor (Rp)", value: (r) => r.nilaiImpor, num: true, render: (r) => (r.nilaiImpor === null ? <Na>belum diisi</Na> : rp(r.nilaiImpor)) },
          { key: "m", label: "Modal Kerja (Rp)", value: (r) => r.modalKerja, num: true, render: (r) => (r.modalKerja === null ? <Na>belum diisi</Na> : rp(r.modalKerja)) },
          { key: "d", label: "Keputusan", value: (r) => r.decision.label, render: (r) => <Badge tone={r.decision.tone}>{r.decision.label}</Badge> },
        ]} />
    </>
  );
}

function MaterialitySelect({ finding, report, saving, saveReport }: { finding: P47Finding } & Pick<IndustriPageProps, "report" | "saving" | "saveReport">) {
  return (
    <select aria-label="Reporting materiality" value={materialityOf(report, finding.key)} disabled={saving}
      onChange={(e) => saveReport({ materiality: { [finding.key]: e.target.value as Materiality } })}>
      {(Object.keys(MATERIALITY_LABEL) as Materiality[]).map((m) => <option key={m} value={m}>{MATERIALITY_LABEL[m]}</option>)}
    </select>
  );
}

export function TemuanPage(props: IndustriPageProps) {
  const { ds, report } = props;
  const sev = (s: P47Finding["severity"]) => ds.findings.filter((f) => f.severity === s).length;
  const mat = (m: Materiality) => ds.findings.filter((f) => materialityOf(report, f.key) === m).length;
  return (
    <>
      <div className="grid g6" style={{ marginBottom: 14 }}>
        <Kpi label="Total Temuan" value={ds.findings.length} sub={`${uniq(ds.findings.map((f) => f.source)).length} sumber`} />
        <Kpi label="Minor" value={sev("Minor")} sub="severity" />
        <Kpi label="Major" value={sev("Major")} sub="severity" />
        <Kpi label="Critical" value={sev("Critical")} sub="severity" tone={sev("Critical") ? "bad" : undefined} />
        <Kpi label="Material" value={mat("MATERIAL")} sub="materialitas" tone={mat("MATERIAL") ? "bad" : undefined} />
        <Kpi label="Needs Review" value={mat("NEEDS_REVIEW")} sub="belum diklasifikasi" tone={mat("NEEDS_REVIEW") ? "warn" : undefined} />
      </div>
      <Banner kind="info" title="Dua ukuran terpisah.">Operational Severity berasal dari temuan surveyor, atau dipetakan dari keputusan verifikator dan analis (Ditolak/Tidak Sesuai = Major, Perlu Revisi = Minor). Reporting Materiality ditetapkan Project Manager dan tersimpan untuk periode ini.</Banner>
      <DataTable exportName="Temuan Industri" rows={ds.findings} rowKey={(r) => r.key} pageSize={10}
        columns={[
          { key: "c", label: "API-U", value: (r) => r.company },
          { key: "src", label: "Sumber", value: (r) => r.source },
          { key: "a", label: "Area Verifikasi", value: (r) => r.area },
          { key: "t", label: "Temuan", value: (r) => r.text, render: (r) => <span style={{ display: "block", minWidth: 230 }}>{r.text}</span> },
          { key: "sev", label: "Severity", value: (r) => SEV_ORDER[r.severity], render: (r) => <Badge tone="sev">{r.severity}</Badge> },
          { key: "mat", label: "Materiality", value: (r) => MATERIALITY_LABEL[materialityOf(report, r.key)], render: (r) => <MaterialitySelect finding={r} report={report} saving={props.saving} saveReport={props.saveReport} /> },
          { key: "st", label: "Status", value: (r) => r.status.label, render: (r) => <Badge tone={r.status.tone}>{r.status.label}</Badge> },
          { key: "p", label: "PIC", value: (r) => r.pic },
        ]} />
    </>
  );
}

/** Keyed by the saved note, so a saved or reloaded note resets the draft without an effect. */
function NoteEditor({ saved, saving, onSave }: { saved: string; saving: boolean; onSave: (note: string) => void }) {
  const [note, setNote] = useState(saved);
  return (
    <>
      <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis catatan Project Manager…" aria-label="Catatan Project Manager" />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn primary" type="button" disabled={saving || note === saved} onClick={() => onSave(note)}>{saving ? "Menyimpan…" : "Simpan catatan"}</button>
      </div>
    </>
  );
}

const STATUSES: [ReportStatus, string][] = [["DRAFT", "Draft"], ["REVIEWED", "Reviewed"], ["APPROVED", "Approved"]];

export function KesimpulanPage({ ds, report, period, saving, saveReport, reportHref }: IndustriPageProps) {
  const k = industriKpis(ds, report);
  const idx = STATUSES.findIndex(([s]) => s === report.status);
  return (
    <>
      <H2 title="Kesimpulan Pelaksanaan VIU" sub="Draf disusun otomatis dari data modul lain. Project Manager menelaah, menambahkan catatan, lalu menyetujui."
        right={<div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><a className="btn primary" href={reportHref} target="_blank" rel="noopener noreferrer">Generate Laporan</a><div className="steps" role="group" aria-label="Status laporan">{STATUSES.map(([s, l], i) => <button key={s} type="button" className={`s${i}`} aria-pressed={report.status === s} disabled={saving} onClick={() => saveReport({ status: s })}>{l}</button>)}</div></div>} />
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label="Periode" value={period.label.replace(/^01 /, "").replace(" – 30 ", " – ")} />
        <Kpi label="API-U" value={k.companies} sub={`${k.lhviu} LHVIU`} />
        <Kpi label="HS / Partner" value={`${k.hs} / ${k.partners}`} sub={`${k.lines} bahan baku`} />
        <Kpi label="Temuan Material" value={k.material} sub={`dari ${k.findings} temuan`} tone={k.material ? "bad" : undefined} />
      </div>
      <article className="report">
        <span className="draft-mark">{STATUSES[idx][1].toUpperCase()}{report.status === "DRAFT" ? " · DIHASILKAN OTOMATIS" : ""}</span>
        <h3 className="rtitle">{TITLE}</h3>
        <div className="rmeta">Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025 · Periode {fdLong(period.from)} – {fdLong(period.to)}{report.updatedAt ? ` · diperbarui ${new Date(report.updatedAt).toLocaleString("id-ID")}${report.updatedByName ? ` oleh ${report.updatedByName}` : ""}` : ""}</div>
        {industriConclusion(ds, report).map((s) => (
          <section key={s.title}>
            <h4>{s.title}</h4>
            {s.paragraphs.length > 1 ? <ul>{s.paragraphs.map((p) => <li key={p}>{p}</li>)}</ul> : <p>{s.paragraphs[0]}</p>}
          </section>
        ))}
        <h4>7. Catatan Project Manager</h4>
        <NoteEditor key={report.pmNote} saved={report.pmNote} saving={saving} onSave={(pmNote) => saveReport({ pmNote })} />
      </article>
    </>
  );
}

export function ExportPage({ ds, report, period }: IndustriPageProps) {
  const [fmt, setFmt] = useState<"pdf" | "xlsx">("pdf");
  const [parts, setParts] = useState<string[]>(INDUSTRI_PARTS.map(([no]) => no));
  const sections = useMemo(() => buildIndustriSections(ds, report, parts), [ds, report, parts]);
  const meta = `Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025 · ${period.label} · status ${report.status}`;

  function run() {
    if (!sections.length) return toast.error("Pilih minimal satu bagian laporan.");
    if (fmt === "pdf") return window.print();
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([[TITLE], [meta], [], ["Bagian", "Judul"], ...sections.map((s) => [s.no, s.title])]), "Sampul");
    for (const s of sections) {
      const aoa: (string | number)[][] = [];
      s.tables.forEach((t, i) => { if (i) aoa.push([]); if (t.title) aoa.push([t.title]); aoa.push(t.headers, ...t.rows); });
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(aoa), `${s.no} ${s.title}`.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
    }
    XLSX.writeFile(book, `Pelaporan Pasal 47 Industri ${period.from} sd ${period.to}.xlsx`);
    toast.success("File Excel dibuat.");
  }

  return (
    <>
      <H2 title="Export Laporan" sub="Atur isi laporan, lalu export. Isi mengikuti periode yang dipilih." />
      <div className="ex">
        <div className="card" style={{ display: "grid", gap: 14 }}>
          <div className="fld"><span className="lbl">Periode</span><span>{period.label}</span></div>
          <div className="fld">
            <span className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Bagian yang disertakan</span>
              <span><button className="btn sm ghost" type="button" onClick={() => setParts(INDUSTRI_PARTS.map(([no]) => no))}>Pilih semua</button><button className="btn sm ghost" type="button" onClick={() => setParts([])}>Kosongkan</button></span>
            </span>
            <div className="checks">
              {INDUSTRI_PARTS.map(([no, l]) => (
                <label key={no}><input type="checkbox" checked={parts.includes(no)} onChange={(e) => setParts((p) => (e.target.checked ? [...p, no] : p.filter((x) => x !== no)))} /><span className="no">{no}</span>{l}</label>
              ))}
            </div>
          </div>
          <div className="fld"><span className="lbl">Format</span><Seg label="Format" value={fmt} onChange={setFmt} options={[["pdf", "PDF / Print"], ["xlsx", "Excel"]]} /></div>
          <div><button className="btn primary" type="button" onClick={run} disabled={!parts.length}>{fmt === "pdf" ? "Cetak / Simpan PDF" : "Unduh Excel"}</button></div>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 8 }}>Pratinjau</div>
          <div className="paper">
            <h5>{TITLE}</h5>
            <div className="pm">{meta}</div>
            <ol>{sections.length ? sections.map((s) => <li key={s.no}><span className="mono" style={{ width: 34 }}>{s.no}</span><span>{s.title}</span><em>{s.tables.reduce((a, t) => a + t.rows.length, 0)} baris</em></li>) : <li>Pilih minimal satu bagian.</li>}</ol>
          </div>
        </div>
      </div>
      <PrintView sections={sections} title={TITLE} meta={meta} />
    </>
  );
}
