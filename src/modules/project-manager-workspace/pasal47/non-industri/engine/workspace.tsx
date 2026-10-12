"use client";

/* Mesin laporan khusus VIU Non Industri — salinan terpisah; perubahan di sini tidak memengaruhi skema lain. */

import { Fragment, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { MaterialIcon } from "../../../components/material-icon";
import { DataTable } from "../../components/data-table";
import { PdfDownloadButton } from "../../components/pdf-download-button";
import { Badge, Banner, Card, H2, HBar, Kpi } from "../../components/ui";
import { customPeriod, reportingPeriods, resolvePeriod, type ReportingPeriod } from "../../derive";
import { fdLong, nf, uniq } from "../../format";
import { MATERIALITY_LABEL, materialityOf } from "../../summary";
import type { Materiality, P47Finding, P47Report, ReportStatus } from "../../types";
import { GenerateReportButton } from "./generate-dialog";
import type { Block, Chapter, ChapterReportModel } from "./model";
import "../../components/pasal47.css";

/** What differs between the chapter-report workspaces (VIU Non Industri, VKI). */
export type ChapterWorkspaceMeta = {
  /** Report title, e.g. "Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Non Industri". */
  title: string;
  /** Breadcrumb / nav label of the scheme, e.g. "VIU Non Industri". */
  scheme: string;
  /** Short label under "Pelaporan Pasal 47" in the side nav, e.g. "Non Industri". */
  navLabel: string;
  api: string;
  pdfScheme: Parameters<typeof PdfDownloadButton>[0]["scheme"];
  /** Shown when the period has no application. */
  emptyText: string;
  /** File-name stem of the Excel export. */
  fileStem: string;
};
type Dataset = { applications: unknown[]; findings: P47Finding[] };
const SEV_ORDER = { Minor: 1, Major: 2, Critical: 3 } as const;
const STATUSES: [ReportStatus, string][] = [["DRAFT", "Draft"], ["REVIEWED", "Reviewed"], ["APPROVED", "Approved"]];
type Patch = { status?: ReportStatus; pmNote?: string; materiality?: Record<string, Materiality>; preparedAt?: string | null };
type PageProps = { ds: Dataset; report: P47Report; model: ChapterReportModel; meta: ChapterWorkspaceMeta; period: ReportingPeriod; saving: boolean; saveReport: (patch: Patch) => Promise<void>; go: (page: string) => void; reportHref: string };

function RingkasanPage({ ds, model, go }: PageProps) {
  return (
    <>
      <div className="grid g3" style={{ marginTop: 14 }}>
        {model.summary.tiles.map(([v, l, s]) => <Kpi key={l} label={l.charAt(0) + l.slice(1).toLowerCase()} value={v} sub={s} />)}
      </div>
      {model.summary.alerts.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Banner kind="warn" title="Perlu diperhatikan sebelum disampaikan.">{model.summary.alerts.join(" ")}</Banner>
        </div>
      )}
      <div className="grid g2" style={{ marginTop: 14 }}>
        {model.chapters.map((c) => {
          const highlights = c.blocks.find((b): b is Extract<Block, { t: "highlights" }> => b.t === "highlights")?.items ?? [];
          return (
            <Card key={c.n} title={`Bab ${c.n} — ${c.title}`} caption={c.lead} right={<button className="btn sm ghost" type="button" onClick={() => go(`bab-${c.n}`)}>Buka →</button>}>
              {highlights.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>{highlights.map((t) => <li key={t}>{t}</li>)}</ul> : <div className="na-t">{ds.applications.length ? "Tidak ada ikhtisar." : "Belum ada data pada periode ini."}</div>}
            </Card>
          );
        })}
      </div>
    </>
  );
}

/** One chapter as it reads in the report: paragraphs, bar figures and sortable, exportable tables. */
function ChapterPage({ chapter }: { chapter: Chapter }) {
  return (
    <>
      <H2 title={`Bab ${chapter.n} — ${chapter.title}`} sub={chapter.lead} />
      {chapter.blocks.map((b, i) => {
        switch (b.t) {
          case "sub": return <h3 key={i} style={{ fontSize: 15, fontWeight: 800, margin: "18px 0 8px" }}>{b.num} {b.title}</h3>;
          case "p": return <p key={i} style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 10px" }}>{b.text}</p>;
          case "highlights": return <Banner key={i} kind="info" title="Ikhtisar bab.">{b.items.join(" ")}</Banner>;
          case "limits": return <div key={i} className="na-t" style={{ fontSize: 12, marginTop: 12 }}>Keterbatasan data: {b.items.join(" ")}</div>;
          case "fig":
            if (b.fig.k === "hbar") return <Card key={i} title={`Gambar ${b.num} ${b.title}`} caption={`Sumber: ${b.source}`}><HBar items={b.fig.rows.map((r) => ({ label: r.desc ? `${r.key} · ${r.desc}` : r.key, v: r.value }))} total={b.fig.total} /></Card>;
            if (b.fig.k === "donuts") return <Card key={i} title={`Gambar ${b.num} ${b.title}`} caption={`Sumber: ${b.source}`}><div className="grid g3">{b.fig.items.map((d) => <div key={d.cap}><b style={{ fontSize: 12 }}>{d.cap}</b><HBar items={d.segs.map((s) => ({ label: s.label, v: s.value }))} /></div>)}</div></Card>;
            return null;
          case "table":
            return (
              <div key={i} style={{ margin: "8px 0 14px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, margin: "6px 0" }}>Tabel {b.num} {b.title}</div>
                <DataTable exportName={`Tabel ${b.num} ${b.title}`} rows={b.rows.map((cells, idx) => ({ idx, cells }))} rowKey={(r) => String(r.idx)} pageSize={10}
                  columns={b.headers.map((h, j) => ({ key: String(j), label: h, value: (r: { cells: (string | number)[] }) => r.cells[j], render: (r: { cells: (string | number)[] }) => (typeof r.cells[j] === "number" ? nf(r.cells[j] as number) : r.cells[j] || "—") }))} />
              </div>
            );
        }
      })}
    </>
  );
}

function MaterialitySelect({ finding, report, saving, saveReport }: { finding: P47Finding } & Pick<PageProps, "report" | "saving" | "saveReport">) {
  return (
    <select aria-label="Reporting materiality" value={materialityOf(report, finding.key)} disabled={saving}
      onChange={(e) => saveReport({ materiality: { [finding.key]: e.target.value as Materiality } })}>
      {(Object.keys(MATERIALITY_LABEL) as Materiality[]).map((m) => <option key={m} value={m}>{MATERIALITY_LABEL[m]}</option>)}
    </select>
  );
}

function TemuanPage({ ds, report, meta, saving, saveReport }: PageProps) {
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
      <DataTable exportName={`Temuan ${meta.navLabel}`} rows={ds.findings} rowKey={(r) => r.key} pageSize={10}
        columns={[
          { key: "c", label: "API-U", value: (r) => r.company },
          { key: "src", label: "Sumber", value: (r) => r.source },
          { key: "a", label: "Area Verifikasi", value: (r) => r.area },
          { key: "t", label: "Temuan", value: (r) => r.text, render: (r) => <span style={{ display: "block", minWidth: 230 }}>{r.text}</span> },
          { key: "sev", label: "Severity", value: (r) => SEV_ORDER[r.severity], render: (r) => <Badge tone="sev">{r.severity}</Badge> },
          { key: "mat", label: "Materiality", value: (r) => MATERIALITY_LABEL[materialityOf(report, r.key)], render: (r) => <MaterialitySelect finding={r} report={report} saving={saving} saveReport={saveReport} /> },
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

function KesimpulanPage({ report, model, meta, period, saving, saveReport, reportHref }: PageProps) {
  const idx = STATUSES.findIndex(([s]) => s === report.status);
  return (
    <>
      <H2 title="Kesimpulan Pelaksanaan VIU" sub="Draf disusun otomatis dari data bab lain. Project Manager menelaah, menambahkan catatan, lalu menyetujui."
        right={<div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><GenerateReportButton report={report} reportHref={reportHref} saveReport={saveReport} disabled={saving}>Generate Laporan</GenerateReportButton><div className="steps" role="group" aria-label="Status laporan">{STATUSES.map(([s, l], i) => <button key={s} type="button" className={`s${i}`} aria-pressed={report.status === s} disabled={saving} onClick={() => saveReport({ status: s })}>{l}</button>)}</div></div>} />
      <article className="report">
        <span className="draft-mark">{STATUSES[idx][1].toUpperCase()}{report.status === "DRAFT" ? " · DIHASILKAN OTOMATIS" : ""}</span>
        <h3 className="rtitle">{meta.title}</h3>
        <div className="rmeta">Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025 · Periode {fdLong(period.from)} – {fdLong(period.to)}{report.updatedAt ? ` · diperbarui ${new Date(report.updatedAt).toLocaleString("id-ID")}${report.updatedByName ? ` oleh ${report.updatedByName}` : ""}` : ""}</div>
        {model.conclusion.filter((s) => s.title !== "Catatan Project Manager").map((s) => (
          <section key={s.title}>
            <h4>{s.title}</h4>
            {s.paragraphs.length > 1 ? <ul>{s.paragraphs.map((p) => <li key={p}>{p}</li>)}</ul> : <p>{s.paragraphs[0]}</p>}
          </section>
        ))}
        <h4>Catatan Project Manager</h4>
        <NoteEditor key={report.pmNote} saved={report.pmNote} saving={saving} onSave={(pmNote) => saveReport({ pmNote })} />
      </article>
    </>
  );
}

function ExportPage({ model, meta, period, report, saving, saveReport, reportHref }: PageProps) {
  function excel() {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([[meta.title], [`Pelaporan Pasal 47 · ${period.label}`], [], ["Bab", "Judul"], ...model.chapters.map((c) => [c.n, c.title])]), "Sampul");
    for (const c of model.chapters) {
      const aoa: (string | number)[][] = [];
      for (const b of c.blocks) if (b.t === "table") { if (aoa.length) aoa.push([]); aoa.push([`Tabel ${b.num} ${b.title}`], b.headers, ...b.rows); }
      if (aoa.length) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(aoa), `Bab ${c.n} ${c.title}`.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
    }
    XLSX.writeFile(book, `${meta.fileStem} ${period.from} sd ${period.to}.xlsx`);
    toast.success("File Excel dibuat.");
  }
  return (
    <>
      <H2 title="Export Laporan" sub={`Laporan lengkap ${model.chapters.length} bab untuk periode ${period.label}.`} />
      <div className="card" style={{ display: "grid", gap: 14, maxWidth: 640 }}>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>Laporan PDF berisi sampul, halaman persetujuan, daftar isi, pendahuluan, ringkasan eksekutif, sepuluh bab, kesimpulan dan lampiran. Excel berisi seluruh tabel per bab.</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <GenerateReportButton report={report} reportHref={reportHref} saveReport={saveReport} disabled={saving}><MaterialIcon name="description" className="text-[16px]" />Buka Laporan</GenerateReportButton>
          <PdfDownloadButton scheme={meta.pdfScheme} periodKey={period.key} />
          <button className="btn" type="button" onClick={excel}><MaterialIcon name="table_view" className="text-[16px]" />Unduh Excel</button>
        </div>
      </div>
    </>
  );
}

/** Laporan Kemenperin workspace (Pelaporan Pasal 47) of a chapter-based report, for the Project Manager. */
export function ChapterWorkspace<D extends Dataset>({ meta, build }: { meta: ChapterWorkspaceMeta; build: (ds: D, report: P47Report) => ChapterReportModel }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const periods = useMemo(() => reportingPeriods(new Date()), []);
  const period = resolvePeriod(params.get("periode"), new Date());
  const isPreset = periods.some((p) => p.key === period.key);
  const [rangeFrom, setRangeFrom] = useState(period.from);
  const [rangeTo, setRangeTo] = useState(period.to);
  const [syncedKey, setSyncedKey] = useState(period.key);
  if (syncedKey !== period.key) {
    setSyncedKey(period.key);
    setRangeFrom(period.from);
    setRangeTo(period.to);
  }
  const rangeInvalid = Boolean(rangeFrom && rangeTo && rangeFrom > rangeTo);
  const [saving, setSaving] = useState(false);

  const setParams = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) sp.set(k, v);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  function applyRange(from: string, to: string) {
    const next = customPeriod(from, to);
    if (!next || next.key === period.key) return;
    const preset = periods.find((p) => p.from === next.from && p.to === next.to);
    setParams({ periode: preset ? preset.key : next.key });
  }

  const queryKey = ["project-manager-workspace", "pasal47", meta.api, period.from, period.to];
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${meta.api}?from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat data laporan");
      return ((await res.json()) as { data: { dataset: D; report: P47Report } }).data;
    },
  });
  const model = useMemo(() => (data ? build(data.dataset, data.report) : null), [data, build]);

  async function saveReport(patch: Patch) {
    setSaving(true);
    try {
      const res = await fetch(meta.api, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: period.from, to: period.to, ...patch }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Gagal menyimpan");
      const { data: report } = (await res.json()) as { data: P47Report };
      queryClient.setQueryData(queryKey, (old: typeof data) => (old ? { ...old, report } : old));
      toast.success("Tersimpan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const nav: [string, string][] = [["ringkasan", "Ringkasan"], ...(model?.chapters ?? []).map((c) => [`bab-${c.n}`, `${c.n}. ${c.title}`] as [string, string]), ["temuan", "Temuan & Materialitas"], ["kesimpulan", "Kesimpulan Pelaksanaan VIU"], ["export", "Export Laporan"]];
  const requested = params.get("halaman") ?? "";
  const page = nav.some(([id]) => id === requested) ? requested : "ringkasan";
  const label = nav.find(([id]) => id === page)?.[1] ?? "Ringkasan";
  const reportHref = `${pathname}/laporan?periode=${period.key}`;

  return (
    <div className="p47">
      <div className="crumbs"><span>Project Manager Workspace</span><span>/</span><span>{meta.scheme}</span><span>/</span><span>Laporan Kemenperin</span><span>/</span><b>{label}</b></div>
      <div className="ph">
        <div>
          <h1>{meta.title}</h1>
          <div className="sub">Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025 · laporan untuk disampaikan kepada Kementerian Perindustrian</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          <div className="fld">
            <label htmlFor="p47n-period">Tahun laporan</label>
            <select id="p47n-period" value={isPreset ? period.key : "custom"} onChange={(e) => { if (e.target.value !== "custom") setParams({ periode: e.target.value }); }}>
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              {!isPreset && <option value="custom">Periode kustom</option>}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="p47n-from">Awal periode</label>
            <input id="p47n-from" type="date" value={rangeFrom} max={rangeTo || undefined} onChange={(e) => { setRangeFrom(e.target.value); applyRange(e.target.value, rangeTo); }} />
          </div>
          <div className="fld">
            <label htmlFor="p47n-to">Akhir periode</label>
            <input id="p47n-to" type="date" value={rangeTo} min={rangeFrom || undefined} onChange={(e) => { setRangeTo(e.target.value); applyRange(rangeFrom, e.target.value); }} />
            {rangeInvalid && <span style={{ fontSize: 11, color: "#c1361f" }}>Akhir periode harus setelah awal periode.</span>}
          </div>
        </div>
      </div>
      <div className="actions">
        <GenerateReportButton report={data?.report} reportHref={reportHref} saveReport={saveReport} disabled={saving}><MaterialIcon name="description" className="text-[16px]" />Generate Laporan</GenerateReportButton>
        <button className="btn" type="button" onClick={() => setParams({ halaman: "export" })}><MaterialIcon name="download" className="text-[16px]" />Export</button>
        <button className="btn" type="button" onClick={() => refetch()} disabled={isFetching}><MaterialIcon name="refresh" className="text-[16px]" />{isFetching ? "Memuat…" : "Refresh"}</button>
      </div>

      <div className="p47-layout" style={{ marginTop: 16 }}>
        <nav className="p47-nav" aria-label={`Pelaporan Pasal 47 ${meta.navLabel}`}>
          <div className="head"><MaterialIcon name="account_balance" className="text-[16px]" />Pelaporan Pasal 47<small>{meta.navLabel}</small></div>
          {nav.map(([id, l]) => <button key={id} type="button" className={`item ${page === id ? "active" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => setParams({ halaman: id })}>{l}</button>)}
        </nav>
        <div style={{ minWidth: 0 }}>
          {isLoading && <div className="empty">Memuat data laporan…</div>}
          {isError && <div className="empty" style={{ color: "var(--bad)" }}>Data laporan gagal dimuat. Coba Refresh.</div>}
          {data && model && (
            <>
              {data.dataset.applications.length === 0 && <div className="banner na"><MaterialIcon name="info" className="text-[18px]" /><div><b>{meta.emptyText}</b> Laporan tetap dapat dibuat sebagai laporan nihil, atau pilih periode lain di atas.</div></div>}
              {(() => {
                const props: PageProps = { ds: data.dataset, report: data.report, model, meta, period, saving, saveReport, go: (id) => setParams({ halaman: id }), reportHref };
                if (page.startsWith("bab-")) {
                  const chapter = model.chapters.find((c) => `bab-${c.n}` === page);
                  return chapter ? <ChapterPage chapter={chapter} /> : null;
                }
                const Page = { ringkasan: RingkasanPage, temuan: TemuanPage, kesimpulan: KesimpulanPage, export: ExportPage }[page] ?? RingkasanPage;
                return <Fragment key={page}><Page {...props} /></Fragment>;
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
