"use client";

import { useState } from "react";

import { fdLong, uniq } from "../format";
import { conclusionSections, kpis, MATERIALITY_LABEL, materialityOf } from "../summary";
import type { Materiality, P47Finding, ReportStatus } from "../types";
import { usePasal47 } from "./context";
import { DataTable } from "./data-table";
import { KV } from "./drawers";
import { Badge, Banner, H2, Kpi } from "./ui";

const SEV_ORDER = { Minor: 1, Major: 2, Critical: 3 } as const;

function MaterialitySelect({ finding }: { finding: P47Finding }) {
  const { report, saveReport, saving } = usePasal47();
  return (
    <select aria-label="Reporting materiality" value={materialityOf(report, finding.key)} disabled={saving} onClick={(e) => e.stopPropagation()}
      onChange={(e) => saveReport({ materiality: { [finding.key]: e.target.value as Materiality } })}>
      {(Object.keys(MATERIALITY_LABEL) as Materiality[]).map((m) => <option key={m} value={m}>{MATERIALITY_LABEL[m]}</option>)}
    </select>
  );
}

export function TemuanPage() {
  const { ds, report, openDrawer } = usePasal47();
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
      <Banner kind="info" title="Dua ukuran terpisah.">Operational Severity berasal dari temuan surveyor, atau dipetakan dari keputusan verifikator dan analis (Ditolak/Tidak Sesuai = Major, Perlu Revisi = Minor). Reporting Materiality ditetapkan Project Manager di kolom tabel dan tersimpan untuk periode ini; temuan Critical tidak otomatis Material.</Banner>
      <DataTable exportName="Temuan dan Isu Material" rows={ds.findings} rowKey={(r) => r.key} pageSize={10}
        groups={[["", 4], ["Operational Severity", 1, "g-sev"], ["Reporting Materiality", 1, "g-mat"], ["", 3]]}
        onRowClick={(f) => openDrawer({ title: f.area, sub: `${f.company} · ${f.applicationNumber}`, body: <KV pairs={[["Sumber", f.source], ["Temuan", f.text], ["Severity", <Badge key="s" tone="sev">{f.severity}</Badge>], ["Materialitas", MATERIALITY_LABEL[materialityOf(report, f.key)]], ["Status", <Badge key="t" tone={f.status.tone}>{f.status.label}</Badge>], ["Tindak lanjut", f.followUp], ["PIC", f.pic]]} /> })}
        columns={[
          { key: "c", label: "API-U", value: (r) => r.company },
          { key: "src", label: "Sumber", value: (r) => r.source },
          { key: "a", label: "Area Verifikasi", value: (r) => r.area },
          { key: "t", label: "Temuan", value: (r) => r.text, render: (r) => <span style={{ display: "block", minWidth: 230 }}>{r.text}</span> },
          { key: "sev", label: "Severity", value: (r) => SEV_ORDER[r.severity], render: (r) => <Badge tone="sev">{r.severity}</Badge> },
          { key: "mat", label: "Materiality", value: (r) => MATERIALITY_LABEL[materialityOf(report, r.key)], render: (r) => <MaterialitySelect finding={r} /> },
          { key: "st", label: "Status", value: (r) => r.status.label, render: (r) => <Badge tone={r.status.tone}>{r.status.label}</Badge> },
          { key: "f", label: "Tindak Lanjut", value: (r) => r.followUp },
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
      <textarea id="p47-pm-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis catatan Project Manager…" aria-label="Catatan Project Manager" />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn primary" type="button" disabled={saving || note === saved} onClick={() => onSave(note)}>{saving ? "Menyimpan…" : "Simpan catatan"}</button>
      </div>
    </>
  );
}

const STATUSES: [ReportStatus, string][] = [["DRAFT", "Draft"], ["REVIEWED", "Reviewed"], ["APPROVED", "Approved"]];

export function KesimpulanPage() {
  const { ds, report, saveReport, saving, period } = usePasal47();
  const k = kpis(ds, report);
  const idx = STATUSES.findIndex(([s]) => s === report.status);
  return (
    <>
      <H2 title="Kesimpulan Pelaksanaan VIU" sub="Draf disusun otomatis dari data modul lain. Project Manager menelaah, menambahkan catatan, lalu menyetujui."
        right={<div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><a className="btn primary" href={`/project-manager-workspace/viu/konsumsi/laporan-kemenperin/laporan?periode=${period.key}`} target="_blank" rel="noopener noreferrer">Generate Laporan</a><div className="steps" role="group" aria-label="Status laporan">{STATUSES.map(([s, l], i) => <button key={s} type="button" className={`s${i}`} aria-pressed={report.status === s} disabled={saving} onClick={() => saveReport({ status: s })}>{l}</button>)}</div></div>} />
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label="Periode" value={period.label.replace(/^01 /, "").replace(" – 30 ", " – ")} />
        <Kpi label="API-U" value={k.companies} sub={`${k.lhviu} LHVIU`} />
        <Kpi label="HS / Merek" value={`${k.hs} / ${k.brands}`} sub={`${k.countries} negara asal · ${k.lines} product line`} />
        <Kpi label="Temuan Material" value={k.material} sub={`dari ${k.findings} temuan`} tone={k.material ? "bad" : undefined} />
      </div>
      <article className="report">
        <span className="draft-mark">{STATUSES[idx][1].toUpperCase()}{report.status === "DRAFT" ? " · DIHASILKAN OTOMATIS" : ""}</span>
        <h3 className="rtitle">Laporan Pelaksanaan VIU – Produk Tekstil sebagai Barang Konsumsi</h3>
        <div className="rmeta">Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025 · Periode {fdLong(period.from)} – {fdLong(period.to)}{report.updatedAt ? ` · diperbarui ${new Date(report.updatedAt).toLocaleString("id-ID")}${report.updatedByName ? ` oleh ${report.updatedByName}` : ""}` : ""}</div>
        {conclusionSections(ds, report).map((s) => (
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
