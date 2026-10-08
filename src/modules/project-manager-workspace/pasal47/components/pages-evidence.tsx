"use client";

import { useState } from "react";

import { currenciesOf, valueByHs } from "../derive";
import { countBy, fd, money, moneyFull, nf, sum, sym, uniq } from "../format";
import type { P47Brand, P47Technical, P47Value, P47Warehouse } from "../types";
import { usePasal47 } from "./context";
import { DataTable } from "./data-table";
import { brandDrawer, hsDrawer, kvDrawer, ownBadge } from "./drawers";
import { Badge, Banner, Card, H2, HBar, Kpi, Na, Seg } from "./ui";

export function PemilikPage() {
  const { ds, openDrawer } = usePasal47();
  const worst = (b: P47Brand) => (b.uses.some((u) => u.docStatus.tone === "bad") ? "bad" : b.uses.some((u) => u.docStatus.tone === "warn") ? "warn" : b.uses.length ? "ok" : "na");
  const tones = countBy(ds.brands, worst);
  return (
    <>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Kpi label="Valid" value={tones.get("ok") ?? 0} sub="dokumen hubungan merek terverifikasi" tone="ok" />
        <Kpi label="Perlu Review" value={tones.get("warn") ?? 0} sub="menunggu verifikasi dokumen" tone="warn" />
        <Kpi label="Tidak Lengkap / Ditolak" value={tones.get("bad") ?? 0} sub="dokumen belum ada atau ditolak" tone="bad" />
      </div>
      <DataTable exportName="Pemilik Merek dan Perwakilan" rows={ds.brands} rowKey={(r) => r.id} onRowClick={(r) => openDrawer(brandDrawer(r, ds))} columns={[
        { key: "n", label: "Merek", value: (r) => r.name, render: (r) => <b>{r.name}</b> },
        { key: "o", label: "Pemilik Merek", value: (r) => r.owner },
        { key: "c", label: "Negara Pemilik", value: (r) => r.ownerCountry },
        { key: "r", label: "Perwakilan Resmi", value: (r) => r.representative, render: (r) => r.representative || <Na>tidak ada</Na> },
        { key: "i", label: "Importir", value: (r) => uniq(r.uses.map((u) => u.company)).join(", ") },
        { key: "b", label: "Dasar Penunjukan", value: (r) => uniq(r.uses.map((u) => u.basis)).join("; ") },
        { key: "s", label: "Status Dokumen", value: (r) => worst(r), render: (r) => { const t = worst(r); return <Badge tone={t}>{t === "ok" ? "Valid" : t === "warn" ? "Perlu Review" : t === "bad" ? "Tidak Lengkap / Ditolak" : "Tidak dipakai"}</Badge>; } },
      ]} />
    </>
  );
}

export function TeknisPage() {
  const { ds, openDrawer } = usePasal47();
  const c = countBy(ds.technical, (t) => t.status.label);
  const detail = (t: P47Technical) => openDrawer(kvDrawer(`${t.brandName} · ${t.subKelompok}`, t.company, [
    ["Jenis dokumen", t.documentType], ["Laboratorium", t.laboratory], ["No. test report", t.reportNumber], ["Tanggal terbit", fd(t.issueDate)], ["Berlaku sampai", fd(t.validUntil)],
    ["Verifikasi dokumen", t.verification], ["Label Bahasa Indonesia", <Badge key="l" tone={t.labelStatement.tone}>{t.labelStatement.label}</Badge>], ["Status", <Badge key="s" tone={t.status.tone}>{t.status.label}</Badge>], ["Nomor permohonan", t.applicationNumber],
  ]));
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label="Lengkap" value={c.get("Lengkap") ?? 0} sub="terverifikasi, label ada" tone="ok" />
        <Kpi label="Perlu Review" value={(c.get("Perlu Review") ?? 0) + (c.get("Lewat 6 Bulan") ?? 0)} sub={`${c.get("Lewat 6 Bulan") ?? 0} diajukan lewat 6 bulan`} tone="warn" />
        <Kpi label="Tidak Lengkap / Ditolak" value={(c.get("Tidak Lengkap") ?? 0) + (c.get("Ditolak") ?? 0)} sub="file belum ada atau ditolak" tone="bad" />
        <Kpi label="Kedaluwarsa" value={c.get("Kedaluwarsa") ?? 0} sub="berakhir sebelum akhir periode" tone="bad" />
      </div>
      <DataTable exportName="Persyaratan Teknis" rows={ds.technical} rowKey={(r) => r.id} onRowClick={detail} columns={[
        { key: "c", label: "Perusahaan", value: (r) => r.company },
        { key: "b", label: "Merek", value: (r) => r.brandName },
        { key: "s", label: "Sub Kelompok", value: (r) => r.subKelompok },
        { key: "d", label: "Jenis Dokumen", value: (r) => r.documentType, hidden: true },
        { key: "l", label: "Laboratorium", value: (r) => r.laboratory },
        { key: "n", label: "No. Test Report", value: (r) => r.reportNumber, mono: true },
        { key: "t", label: "Tanggal Terbit", value: (r) => r.issueDate, render: (r) => fd(r.issueDate) },
        { key: "v", label: "Masa Berlaku", value: (r) => r.validUntil, render: (r) => (r.validUntil ? `s.d. ${fd(r.validUntil)}` : <Na>tidak dicantumkan</Na>) },
        { key: "lb", label: "Label Bahasa Indonesia", value: (r) => r.labelStatement.label, render: (r) => <Badge tone={r.labelStatement.tone}>{r.labelStatement.label}</Badge> },
        { key: "st", label: "Status", value: (r) => r.status.label, render: (r) => <Badge tone={r.status.tone}>{r.status.label}</Badge> },
      ]} />
    </>
  );
}

export function GudangPage() {
  const { ds, openDrawer } = usePasal47();
  const util = (w: P47Warehouse) => (w.capacity && w.analystStock !== null ? Math.round((w.analystStock / w.capacity) * 100) : null);
  const stock = (w: P47Warehouse) => Object.entries(w.declaredStock).map(([u, q]) => `${nf(q)} ${u}`).join("; ");
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label="Total Gudang" value={ds.warehouses.length} sub={`${uniq(ds.warehouses.map((w) => w.applicationId)).length} permohonan`} />
        <Kpi label="Gudang Milik" value={ds.warehouses.filter((w) => w.place.ownership === "Milik Sendiri").length} sub="milik sendiri" />
        <Kpi label="Gudang Sewa" value={ds.warehouses.filter((w) => w.place.ownership === "Sewa").length} sub="perjanjian sewa" />
        <Kpi label="Data Kapasitas Tersedia" value={ds.warehouses.filter((w) => w.capacity !== null).length} sub={`${ds.warehouses.filter((w) => util(w) !== null).length} dapat dihitung utilisasinya`} tip="Kapasitas dan stok dari modul Kapasitas Gudang yang diisi Technical Analyst." />
      </div>
      <Banner kind="na" title="Utilisasi tidak dipaksakan.">Utilisasi dihitung hanya dari kapasitas dan stok yang diisi analis (satuan sama). Stok yang dilaporkan pemohon ditampilkan per satuan dan tidak dibandingkan dengan kapasitas.</Banner>
      <DataTable exportName="Persediaan dan Gudang" rows={ds.warehouses} rowKey={(r) => r.id}
        onRowClick={(w) => openDrawer(kvDrawer(w.place.address || "Gudang", w.company, [["Kota", w.place.city], ["Provinsi", w.place.province], ["Kepemilikan", ownBadge(w.place.ownership)], ["Kapasitas (analis)", w.capacity === null ? "" : nf(w.capacity)], ["Stok (analis)", w.analystStock === null ? "" : nf(w.analystStock)], ["Stok dilaporkan pemohon", stock(w)], ["Keputusan analis", w.analystDecision], ["Nomor permohonan", w.applicationNumber]]))}
        columns={[
          { key: "c", label: "API-U", value: (r) => r.company },
          { key: "g", label: "Gudang", value: (r) => `${r.place.address} ${r.place.city}`, render: (r) => <>{r.place.address || <Na>alamat belum diisi</Na>}<span className="sub">{r.place.city}</span></> },
          { key: "o", label: "Status Gudang", value: (r) => r.place.ownership, render: (r) => ownBadge(r.place.ownership) },
          { key: "k", label: "Kapasitas", value: (r) => r.capacity, num: true, render: (r) => (r.capacity === null ? <Na>belum diisi</Na> : nf(r.capacity)) },
          { key: "s", label: "Stok (analis)", value: (r) => r.analystStock, num: true, render: (r) => (r.analystStock === null ? <Na>—</Na> : nf(r.analystStock)) },
          { key: "d", label: "Stok Dilaporkan", value: (r) => stock(r), render: (r) => stock(r) || <Na>—</Na> },
          { key: "u", label: "Utilisasi", value: (r) => util(r), num: true, render: (r) => { const u = util(r); return u === null ? <Na>Tidak dapat dihitung</Na> : <b style={{ color: u > 90 ? "var(--warn)" : undefined }}>{u}%</b>; } },
          { key: "a", label: "Keputusan Analis", value: (r) => r.analystDecision, render: (r) => <Badge tone={r.analystDecision === "Sesuai" ? "ok" : r.analystDecision === "Tidak Sesuai" ? "bad" : "na"}>{r.analystDecision}</Badge> },
        ]} />
    </>
  );
}

function NilaiPerHs() {
  const { ds, openDrawer } = usePasal47();
  const currencies = currenciesOf(ds.lines);
  const [picked, setCur] = useState(currencies[0] ?? "USD");
  const cur = currencies.includes(picked) ? picked : (currencies[0] ?? "USD");
  const rows = valueByHs(ds.lines, cur);
  const total = sum(rows.map((r) => r.value));
  const multi = uniq(ds.lines.map((l) => l.hs)).filter((h) => uniq(ds.lines.filter((l) => l.hs === h).map((l) => l.currency)).length > 1);
  const priced = rows.filter((r) => r.price !== null).sort((a, b) => b.price! - a.price!);
  if (!currencies.length) return <div className="empty">Belum ada product line pada periode ini.</div>;
  return (
    <>
      <H2 title="Nilai rencana impor per HS" sub="Satu currency per tampilan; nilai tidak dijumlahkan lintas currency, harga satuan dihitung dalam satu satuan."
        right={<div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="lbl">Currency</span><Seg label="Currency" value={cur} onChange={setCur} options={currencies.map((c) => [c, c] as [string, string])} /></div>} />
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Kpi label={`Total rencana impor ${cur}`} value={money(cur, total)} sub={`${rows.length} HS · ${ds.lines.filter((l) => l.currency === cur).length} product line`} />
        <Kpi label="HS terbesar" value={rows[0]?.hs ?? "—"} sub={rows[0] ? `${Math.round(rows[0].share * 100)}% · ${money(cur, rows[0].value)}` : undefined} />
        <Kpi label="3 HS teratas" value={total ? `${Math.round((sum(rows.slice(0, 3).map((r) => r.value)) / total) * 100)}%` : "—"} sub="dari nilai currency ini" />
        <Kpi label="HS lintas currency" value={multi.length} sub={multi.join(", ") || "tidak ada"} tone={multi.length ? "warn" : undefined} />
      </div>
      <div className="grid g-main" style={{ marginBottom: 14 }}>
        <Card title={`Nilai rencana impor menurut HS (${cur})`} caption={`Share dari total ${money(cur, total)} · klik untuk drill-down`}>
          <HBar total={total} fmt={(v) => money(cur, v)} items={rows.map((r) => ({ label: `${r.hs} · ${r.description}`, v: r.value, onClick: () => openDrawer(hsDrawer(r.hs, ds)) }))} />
        </Card>
        <Card title="Pembacaan cepat" caption="Dihitung dari tabel di bawah">
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {rows[0] && <li><b>{rows[0].hs}</b> menyumbang {Math.round(rows[0].share * 100)}% nilai rencana impor {cur}.</li>}
            {priced[0] && <li>Harga satuan tertinggi: <b>{priced[0].hs}</b> ({sym(cur)} {priced[0].price!.toLocaleString("id-ID", { maximumFractionDigits: 2 })} per {priced[0].unit}). Harga antar-satuan tidak dibandingkan.</li>}
            <li>{multi.length ? `HS ${multi.join(", ")} ditransaksikan dalam lebih dari satu currency.` : "Setiap HS ditransaksikan dalam satu currency."}</li>
            <li>Data bersifat rencana, bukan realisasi impor.</li>
          </ul>
        </Card>
      </div>
      <DataTable exportName={`Nilai Impor per HS ${cur}`} rows={rows} rowKey={(r) => r.hs} onRowClick={(r) => openDrawer(hsDrawer(r.hs, ds))} columns={[
        { key: "h", label: "HS", value: (r) => r.hs, render: (r) => <b className="mono">{r.hs}</b> },
        { key: "d", label: "Uraian Barang", value: (r) => r.description },
        { key: "v", label: `Nilai (${cur})`, value: (r) => r.value, num: true, render: (r) => moneyFull(cur, r.value) },
        { key: "s", label: `Share ${cur}`, value: (r) => r.share, num: true, render: (r) => `${(r.share * 100).toFixed(1).replace(".", ",")}%` },
        { key: "q", label: "Kuantitas", value: (r) => r.quantity, num: true, render: (r) => (Number.isNaN(r.quantity) ? <Na>satuan berbeda</Na> : `${nf(r.quantity)} ${r.unit}`) },
        { key: "p", label: "Harga Satuan Rata-rata", value: (r) => r.price, num: true, render: (r) => (r.price === null ? <Na>tidak dapat dihitung</Na> : <>{sym(cur)} {r.price.toLocaleString("id-ID", { maximumFractionDigits: 2 })}<span className="sub">per {r.unit}</span></>) },
        { key: "a", label: "API-U", value: (r) => r.companies, num: true },
        { key: "l", label: "Product Line", value: (r) => r.lines, num: true },
      ]} />
    </>
  );
}

function NilaiPerPerusahaan() {
  const { ds, openDrawer } = usePasal47();
  const rupiah = (v: P47Value) => (v.rate !== null ? v.plan * v.rate : null);
  const ratio = (v: P47Value) => { const r = rupiah(v); return r && v.modalKerja !== null ? v.modalKerja / r : null; };
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        {currenciesOf(ds.lines).slice(0, 4).map((c) => <Kpi key={c} label={`Rencana impor ${c}`} value={money(c, sum(ds.values.filter((v) => v.currency === c).map((v) => v.plan)))} sub={`${ds.values.filter((v) => v.currency === c).length} permohonan`} />)}
      </div>
      <Banner kind="info" title="Mata uang tidak dijumlahkan.">Modal kerja tercatat dalam Rupiah. Rasio modal kerja ÷ nilai impor hanya dihitung bila analis sudah mengisi kurs untuk currency tersebut (IDR tanpa kurs).</Banner>
      <DataTable exportName="Nilai Impor dan Modal Kerja" rows={ds.values} rowKey={(r) => `${r.applicationId}|${r.currency}`}
        onRowClick={(v) => openDrawer(kvDrawer(v.company, v.applicationNumber, [["Currency", v.currency], ["Nilai rencana impor", moneyFull(v.currency, v.plan)], ["Kurs analis", v.rate === null ? "" : `Rp ${nf(v.rate)}`], ["Nilai dalam Rupiah", rupiah(v) === null ? "" : moneyFull("IDR", rupiah(v)!)], ["Modal kerja", v.modalKerja === null ? "" : moneyFull("IDR", v.modalKerja)], ["Keputusan analis", <Badge key="d" tone={v.decision.tone}>{v.decision.label}</Badge>]]))}
        columns={[
          { key: "c", label: "Perusahaan", value: (r) => r.company },
          { key: "cu", label: "Currency", value: (r) => r.currency, mono: true },
          { key: "p", label: "Nilai Rencana Impor", value: (r) => r.plan, num: true, render: (r) => moneyFull(r.currency, r.plan) },
          { key: "m", label: "Modal Kerja (Rp)", value: (r) => r.modalKerja, num: true, render: (r) => (r.modalKerja === null ? <Na>tidak dilaporkan</Na> : moneyFull("IDR", r.modalKerja)) },
          { key: "k", label: "Kurs", value: (r) => r.rate, num: true, render: (r) => (r.currency === "IDR" ? "—" : r.rate === null ? <Na>belum diisi analis</Na> : `Rp ${nf(r.rate)}`) },
          { key: "r", label: "Rasio Modal ÷ Nilai", value: (r) => ratio(r), num: true, render: (r) => { const x = ratio(r); return x === null ? <Na>Tidak dapat dihitung</Na> : `${x.toFixed(2).replace(".", ",")}×`; } },
          { key: "d", label: "Keputusan Analis", value: (r) => r.decision.label, render: (r) => <Badge tone={r.decision.tone}>{r.decision.label}</Badge> },
        ]} />
    </>
  );
}

export function NilaiPage() {
  const [view, setView] = useState<"hs" | "perusahaan">("hs");
  return (
    <>
      <div style={{ marginBottom: 14 }}><Seg label="Tampilan nilai" value={view} onChange={setView} options={[["hs", "Per HS"], ["perusahaan", "Per Perusahaan & Modal Kerja"]]} /></div>
      {view === "hs" ? <NilaiPerHs /> : <NilaiPerPerusahaan />}
    </>
  );
}
