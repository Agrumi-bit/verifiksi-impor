"use client";

import { useState } from "react";

import { brandCertificateStatus, countryRows, hsRows, lhviuStatus } from "../derive";
import { countBy, fd, nf, sum, topN, uniq } from "../format";
import { dataQualityAlerts, kpis } from "../summary";
import type { P47Application, P47Brand, P47BrandUse } from "../types";
import { MaterialIcon } from "../../components/material-icon";
import { usePasal47 } from "./context";
import { DataTable, type Column } from "./data-table";
import { brandDrawer, companyDrawer, countryDrawer, hsDrawer, lokasiDrawer, ownBadge, placeKey, placesOf, type LokasiLevel, type LokasiTipe } from "./drawers";
import { Badge, Banner, Card, COLOR, Donut, H2, HBar, Kpi, Na, Seg, StackBar } from "./ui";

export function RingkasanPage() {
  const { ds, report, openDrawer, go } = usePasal47();
  const k = kpis(ds, report);
  const tech = countBy(ds.technical, (t) => t.status.label);
  const sev = countBy(ds.findings, (f) => f.severity);
  const mat = countBy(ds.findings, (f) => report.materiality[f.key] ?? "NEEDS_REVIEW");
  const kantorOwn = countBy(ds.applications.filter((a) => a.kantor), (a) => a.kantor!.ownership || "Belum diisi");
  const gudangOwn = countBy(ds.applications.flatMap((a) => a.gudang), (g) => g.ownership || "Belum diisi");
  const own = (m: Map<string, number>) => [
    { label: "Milik Sendiri", v: m.get("Milik Sendiri") ?? 0, color: COLOR.ok },
    { label: "Sewa", v: m.get("Sewa") ?? 0, color: COLOR.na },
    ...(m.get("Belum diisi") ? [{ label: "Belum diisi", v: m.get("Belum diisi")!, color: COLOR.warn }] : []),
  ];
  return (
    <>
      <div className="grid g4" style={{ marginTop: 14 }}>
        <Kpi label="Jumlah API-U" value={k.companies} sub={`${k.applications} permohonan`} tip="Perusahaan API-U dengan permohonan VIU Barang Konsumsi yang tanggal pengajuannya di dalam periode." />
        <Kpi label="Jumlah LHVIU" value={k.lhviu} sub={`dari ${k.applications} permohonan`} tip="Permohonan yang LHVIU-nya sudah diunggah Project Manager." />
        <Kpi label="Jumlah Pos Tarif/HS" value={k.hs} sub={`${uniq(ds.lines.map((l) => l.komoditas || l.subKelompok)).length} komoditas`} />
        <Kpi label="Jumlah Merek" value={k.brands} sub={`${uniq(ds.brands.flatMap((b) => b.uses.map((u) => u.company))).length} importir`} />
        <Kpi label="Jumlah Negara Asal" value={k.countries} sub={`relasi produk-negara: ${k.relations}`} tip="Dihitung dari relasi produk, bukan volume." />
        <Kpi label="Jumlah Product Line" value={k.lines} sub={`${ds.lines.filter((l) => l.countries.length > 1).length} dengan >1 negara asal`} />
        <Kpi label="Jumlah Temuan" value={k.findings} sub={`${ds.findings.filter((f) => f.status.tone !== "ok").length} belum selesai ditinjau`} tip="Temuan survei, dokumen yang ditolak/perlu revisi, modul analisis Tidak Sesuai, dan produk yang ditolak/perlu revisi." />
        <Kpi label="Isu Material" value={k.material} sub="ditetapkan Project Manager" tone={k.material ? "bad" : undefined} tip="Hanya temuan yang Anda tandai Material di halaman Temuan & Isu Material." />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="Distribusi API-U per KBLI" caption="Jumlah permohonan menurut KBLI utama">
          <HBar items={topN(countBy(ds.applications.flatMap((a) => a.kbli.map((x) => `${x.code} · ${x.description}`)), (s) => s), 6).map(([l, v]) => ({ label: l, v }))} />
        </Card>
        <Card title="Sebaran Lokasi Kantor" caption="Jumlah perusahaan per kota/kabupaten" right={<button className="btn sm ghost" type="button" onClick={() => go("apiu")}>Lihat sebaran lengkap →</button>}>
          <HBar total={k.companies} items={topN(companiesPerPlace(ds.applications, "kantor", "kota"), 6).map(([l, v]) => ({ label: l, v, onClick: () => openDrawer(lokasiDrawer("kantor", "kota", l, ds)) }))} />
        </Card>
        <Card title="Top Pos Tarif/HS" caption={`Share dari ${k.lines} product line · klik untuk drill-down`} tip="Peringkat berdasarkan jumlah product line; kuantitas tidak dijumlahkan karena satuan berbeda.">
          <HBar total={k.lines} items={topN(countBy(ds.lines, (l) => l.hs), 5).map(([h, v]) => ({ label: `${h} · ${ds.lines.find((l) => l.hs === h)?.komoditas || ds.lines.find((l) => l.hs === h)?.subKelompok || ""}`, v, onClick: () => openDrawer(hsDrawer(h, ds)) }))} />
        </Card>
        <Card title="Top Merek" caption="Jumlah product line per merek" right={<button className="btn sm ghost" type="button" onClick={() => go("merek")}>Lihat daftar merek →</button>}>
          <HBar total={k.lines} items={topN(countBy(ds.lines, (l) => l.brandId), 5).map(([id, v]) => { const b = ds.brands.find((x) => x.id === id); return { label: b?.name ?? ds.lines.find((l) => l.brandId === id)?.brandName ?? id, v, onClick: b ? () => openDrawer(brandDrawer(b, ds)) : undefined }; })} />
        </Card>
        <Card title="Negara Asal" caption="Top 5 berdasarkan jumlah relasi produk-negara" tip="Bukan volume impor.">
          <HBar items={countryRows(ds.lines).slice(0, 5).map((r) => ({ label: r.country, v: r.lines, onClick: () => openDrawer(countryDrawer(r.country, ds)) }))} />
        </Card>
        <Card title="Kepemilikan Lokasi" caption="Status kepemilikan kantor dan gudang">
          <StackBar label="Kantor" unit="lokasi" segments={own(kantorOwn)} />
          <StackBar label="Gudang" unit="lokasi" segments={own(gudangOwn)} />
        </Card>
        <Card title="Status Persyaratan Teknis" caption={`${ds.technical.length} sertifikat hasil uji mutu`}>
          <Donut caption="sertifikat" segments={[
            { label: "Lengkap", v: tech.get("Lengkap") ?? 0, color: COLOR.ok },
            { label: "Perlu Review", v: (tech.get("Perlu Review") ?? 0) + (tech.get("Lewat 6 Bulan") ?? 0), color: COLOR.warn },
            { label: "Tidak Lengkap / Ditolak", v: (tech.get("Tidak Lengkap") ?? 0) + (tech.get("Ditolak") ?? 0), color: COLOR.bad },
            { label: "Kedaluwarsa", v: tech.get("Kedaluwarsa") ?? 0, color: COLOR.badDark },
          ]} />
        </Card>
        <Card title="Ringkasan Temuan" caption="Tingkat keparahan operasional dan materialitas pelaporan, dua ukuran terpisah">
          <StackBar label="Operational Severity" unit="temuan" segments={[{ label: "Minor", v: sev.get("Minor") ?? 0, color: "#b7a4e6" }, { label: "Major", v: sev.get("Major") ?? 0, color: "#8062c9" }, { label: "Critical", v: sev.get("Critical") ?? 0, color: "#4b2f98" }]} />
          <StackBar label="Reporting Materiality" unit="temuan" segments={[{ label: "Non-Material", v: mat.get("NON_MATERIAL") ?? 0, color: "#9fd2df" }, { label: "Needs Review", v: mat.get("NEEDS_REVIEW") ?? 0, color: "#3d9db8" }, { label: "Material", v: mat.get("MATERIAL") ?? 0, color: "#0b5568" }]} />
        </Card>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>Data Quality Alert</h3>
        <p className="cap">Perlu diselesaikan sebelum laporan difinalkan</p>
        <div className="alerts">
          {dataQualityAlerts(ds).map((a, i) => <div key={i} className={`alert ${a.tone}`}><MaterialIcon name={a.tone === "bad" ? "error" : a.tone === "na" ? "do_not_disturb_on" : "warning"} className="text-[18px]" /><span>{a.text}</span></div>)}
        </div>
      </div>
    </>
  );
}

/** Distinct companies per location — a company with several applications or gudang counts once per place. */
function companiesPerPlace(apps: P47Application[], tipe: LokasiTipe, level: LokasiLevel): Map<string, number> {
  const pairs = uniq(apps.flatMap((a) => placesOf(a, tipe).map((p) => `${placeKey(p, level)}|${a.companyId ?? a.company}`)));
  return countBy(pairs, (pair) => pair.split("|")[0]);
}

function LokasiCard() {
  const { ds, openDrawer } = usePasal47();
  const [tipe, setTipe] = useState<LokasiTipe>("kantor");
  const [level, setLevel] = useState<LokasiLevel>("kota");
  const counts = companiesPerPlace(ds.applications, tipe, level);
  const companies = uniq(ds.applications.map((a) => a.companyId ?? a.company)).length;
  const items = topN(counts, 12);
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <H2 title="Sebaran Lokasi Perusahaan" sub={`Jumlah perusahaan API-U per ${level === "kota" ? "kota/kabupaten" : "provinsi"}, menurut lokasi ${tipe} · klik untuk daftar perusahaan`}
        right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Seg label="Jenis lokasi" value={tipe} onChange={setTipe} options={[["kantor", "Kantor"], ["gudang", "Gudang"]]} /><Seg label="Tingkat" value={level} onChange={setLevel} options={[["kota", "Kota/Kab."], ["provinsi", "Provinsi"]]} /></div>} />
      <div className="grid g-main">
        <HBar total={companies} items={items.map(([l, v]) => ({ label: l, v, onClick: () => openDrawer(lokasiDrawer(tipe, level, l, ds)) }))} />
        <div className="grid" style={{ alignContent: "start" }}>
          <Kpi label={level === "kota" ? "Kota/Kab. terbanyak" : "Provinsi terbanyak"} value={items[0]?.[0] ?? "—"} sub={items[0] ? `${items[0][1]} dari ${companies} perusahaan` : undefined} />
          <Kpi label={level === "kota" ? "Jumlah kota/kab." : "Jumlah provinsi"} value={counts.size} sub={`lokasi ${tipe} berbeda`} />
        </div>
      </div>
    </div>
  );
}

export function ApiuPage() {
  const { ds, openDrawer } = usePasal47();
  const statuses = ds.applications.map(lhviuStatus);
  const cols: Column<P47Application>[] = [
    { key: "company", label: "Nama Perusahaan", value: (r) => r.company, render: (r) => <b>{r.company}</b> },
    { key: "nib", label: "NIB", value: (r) => r.nib, mono: true },
    { key: "kbli", label: "KBLI", value: (r) => r.kbli.map((k) => k.code).join(", "), render: (r) => <>{r.kbli.map((k) => <span key={k.code} style={{ display: "block" }}><span className="mono">{k.code}</span> <span style={{ color: "var(--ink-3)", fontSize: 11.5 }}>{k.description}</span></span>)}</> },
    { key: "lokasi", label: "Kepemilikan Lokasi", value: (r) => `Kantor ${r.kantor?.ownership ?? ""} Gudang ${r.gudang.map((g) => g.ownership).join(" ")}`, render: (r) => <div style={{ display: "grid", gap: 4, justifyItems: "start" }}><span>Kantor {ownBadge(r.kantor?.ownership ?? "")}</span>{r.gudang.map((g, i) => <span key={i}>Gudang {ownBadge(g.ownership)}</span>)}</div> },
    { key: "kantor", label: "Alamat Kantor", value: (r) => (r.kantor ? `${r.kantor.address}, ${r.kantor.city}` : ""), hidden: true },
    { key: "gudang", label: "Alamat Gudang", value: (r) => r.gudang.map((g) => `${g.address}, ${g.city}`).join("; "), hidden: true },
    { key: "app", label: "No. Permohonan", value: (r) => r.applicationNumber, mono: true },
    { key: "submitted", label: "Tanggal Pengajuan", value: (r) => r.submittedAt, render: (r) => fd(r.submittedAt) },
    { key: "lhviu", label: "LHVIU", value: (r) => lhviuStatus(r).label, render: (r) => { const s = lhviuStatus(r); return <><Badge tone={s.tone}>{s.label}</Badge>{r.lhviu && <span className="sub">{fd(r.lhviu.uploadedAt)}</span>}</>; } },
  ];
  return (
    <>
      <div className="grid g4">
        <Kpi label="Total API-U" value={uniq(ds.applications.map((a) => a.companyId ?? a.company)).length} sub={`${ds.applications.length} permohonan`} />
        <Kpi label="Total KBLI" value={uniq(ds.applications.flatMap((a) => a.kbli.map((k) => k.code))).length} sub="KBLI utama berbeda" />
        <Kpi label="LHVIU Terbit" value={statuses.filter((s) => s.label === "Terbit").length} sub={`dari ${ds.applications.length} permohonan`} tone="ok" tip="File LHVIU sudah diunggah Project Manager." />
        <Kpi label="LHVIU Belum Diunggah" value={statuses.filter((s) => s.label === "Belum Diunggah").length} sub={`${statuses.filter((s) => s.label === "Dalam Proses").length} masih dalam proses`} tone="warn" />
      </div>
      <Banner kind="na" title="Nomor dan masa berlaku LHVIU belum tercatat di sistem.">Status LHVIU dibaca dari file yang diunggah Project Manager pada tab LHVIU di detail permohonan.</Banner>
      <LokasiCard />
      <div style={{ marginTop: 14 }}><DataTable exportName="API-U KBLI LHVIU" columns={cols} rows={ds.applications} rowKey={(r) => r.id} onRowClick={(r) => openDrawer(companyDrawer(r, ds))} /></div>
    </>
  );
}

export function HsPage() {
  const { ds, openDrawer } = usePasal47();
  const rows = hsRows(ds.lines);
  return (
    <>
      <div className="grid g4">
        <Kpi label="Jumlah HS" value={rows.length} sub="pos tarif berbeda" />
        <Kpi label="Jumlah Subkomoditas" value={uniq(ds.lines.map((l) => l.komoditas || l.subKelompok)).length} sub={`${uniq(ds.lines.map((l) => l.subKelompok)).length} sub kelompok`} />
        <Kpi label="Total Product Line" value={ds.lines.length} sub="seluruh API-U" />
        <Kpi label="Total API-U" value={uniq(ds.lines.map((l) => l.applicationId)).length} sub="memiliki product line" />
      </div>
      <Banner kind="info" title="Kuantitas tidak dijumlahkan lintas satuan.">Rencana kebutuhan hanya dijumlahkan dalam satu HS bila satuannya sama. HS dengan satuan berbeda ditandai.</Banner>
      <DataTable exportName="Komoditas dan HS" rows={rows} rowKey={(r) => r.hs} onRowClick={(r) => openDrawer(hsDrawer(r.hs, ds))} columns={[
        { key: "hs", label: "HS", value: (r) => r.hs, render: (r) => <b className="mono">{r.hs}</b> },
        { key: "d", label: "Uraian Barang", value: (r) => r.description },
        { key: "sk", label: "Sub Kelompok", value: (r) => r.subKelompok },
        { key: "k", label: "Komoditas", value: (r) => r.komoditas },
        { key: "a", label: "Jumlah API-U", value: (r) => r.companies, num: true },
        { key: "l", label: "Product Line", value: (r) => r.lines, num: true },
        { key: "q", label: "Rencana Kebutuhan", value: (r) => r.quantity, num: true, render: (r) => (Number.isNaN(r.quantity) ? <Na>satuan berbeda</Na> : nf(r.quantity)) },
        { key: "u", label: "Satuan", value: (r) => r.unit || r.units.join(" / "), render: (r) => <Badge plain>{r.unit || r.units.join(" / ")}</Badge> },
      ]} />
    </>
  );
}

export function NegaraPage() {
  const { ds, openDrawer } = usePasal47();
  const rows = countryRows(ds.lines);
  return (
    <>
      <div className="grid g3">
        <Kpi label="Jumlah Negara" value={rows.length} sub="negara asal berbeda" />
        <Kpi label="Relasi Terbanyak" value={rows[0]?.country ?? "—"} sub={rows[0] ? `${rows[0].lines} product line` : undefined} />
        <Kpi label="Relasi Produk-Negara" value={sum(ds.lines.map((l) => l.countries.length))} sub={`dari ${ds.lines.length} product line`} tip="Satu product line dapat memiliki lebih dari satu negara asal." />
      </div>
      <Banner kind="warn" title="Volume tidak ditampilkan per negara.">Volume tidak dapat diatribusikan per negara apabila satu product line memiliki lebih dari satu negara asal tanpa alokasi kuantitas.</Banner>
      <DataTable exportName="Negara Asal" rows={rows} rowKey={(r) => r.country} onRowClick={(r) => openDrawer(countryDrawer(r.country, ds))} columns={[
        { key: "c", label: "Negara", value: (r) => r.country, render: (r) => <b>{r.country}</b> },
        { key: "a", label: "Jumlah API-U", value: (r) => r.companies, num: true },
        { key: "h", label: "Jumlah HS", value: (r) => r.hs, num: true },
        { key: "b", label: "Jumlah Merek", value: (r) => r.brands, num: true },
        { key: "l", label: "Jumlah Product Line", value: (r) => r.lines, num: true },
      ]} />
    </>
  );
}

export function MerekPage() {
  const { ds, openDrawer } = usePasal47();
  const [view, setView] = useState<"daftar" | "relasi">("daftar");
  const statuses = ds.brands.map((b) => brandCertificateStatus(b, ds.period.to));
  const relasi: (P47BrandUse & { brand: P47Brand })[] = ds.brands.flatMap((b) => b.uses.map((u) => ({ ...u, brand: b })));
  const importers = uniq(relasi.map((r) => r.company)).length;
  return (
    <>
      <div className="grid g3">
        <Kpi label="Total Merek" value={ds.brands.length} sub="merek berbeda" />
        <Kpi label="Total Importir" value={importers} sub="API-U yang mengimpor merek" />
        <Kpi label="Rata-rata Merek per Importir" value={importers ? (ds.brands.length / importers).toFixed(1).replace(".", ",") : "—"} sub="merek / API-U" />
      </div>
      <div className="h2row" style={{ marginTop: 14 }}>
        <Seg label="Tampilan" value={view} onChange={setView} options={[["daftar", "Daftar Merek"], ["relasi", "Relasi Merek & Importir"]]} />
        {view === "daftar" && <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{statuses.filter((s) => s.tone === "ok").length} aktif · {statuses.filter((s) => s.tone === "warn").length} perlu perhatian · {statuses.filter((s) => s.tone === "bad").length} kedaluwarsa / tidak lengkap</span>}
      </div>
      {view === "daftar" ? (
        <DataTable exportName="Daftar Merek" rows={ds.brands} rowKey={(r) => r.id} onRowClick={(r) => openDrawer(brandDrawer(r, ds))} columns={[
          { key: "n", label: "Nama Merek", value: (r) => r.name, render: (r) => <b>{r.name}</b> },
          { key: "o", label: "Pemilik", value: (r) => r.owner, render: (r) => <>{r.owner || <Na>belum diisi</Na>}<span className="sub">{r.ownerCountry}</span></> },
          { key: "j", label: "Jenis Merek", value: (r) => r.evidenceType },
          { key: "c", label: "No. Sertifikat", value: (r) => r.registrationNumber, mono: true },
          { key: "t", label: "Tanggal Terbit", value: (r) => r.registrationDate, render: (r) => fd(r.registrationDate) },
          { key: "e", label: "Tanggal Kedaluwarsa", value: (r) => r.expiryDate, render: (r) => fd(r.expiryDate) },
          { key: "s", label: "Status", value: (r) => brandCertificateStatus(r, ds.period.to).label, render: (r) => { const s = brandCertificateStatus(r, ds.period.to); return <Badge tone={s.tone}>{s.label}</Badge>; } },
        ]} />
      ) : (
        <DataTable exportName="Relasi Merek dan Importir" rows={relasi} rowKey={(r) => `${r.brand.id}|${r.applicationId}`} onRowClick={(r) => openDrawer(brandDrawer(r.brand, ds))} columns={[
          { key: "n", label: "Merek", value: (r) => r.brand.name, render: (r) => <b>{r.brand.name}</b> },
          { key: "o", label: "Pemilik Merek", value: (r) => r.brand.owner, render: (r) => <>{r.brand.owner || <Na>belum diisi</Na>}<span className="sub">{r.brand.ownerCountry}</span></> },
          { key: "c", label: "Perusahaan API-U", value: (r) => r.company },
          { key: "h", label: "HS", value: (r) => uniq(ds.lines.filter((l) => l.brandId === r.brand.id && l.applicationId === r.applicationId).map((l) => l.hs)).join(", "), render: (r) => <span className="mono">{uniq(ds.lines.filter((l) => l.brandId === r.brand.id && l.applicationId === r.applicationId).map((l) => l.hs)).join(", ") || "—"}</span> },
          { key: "g", label: "Negara Asal", value: (r) => uniq(ds.lines.filter((l) => l.brandId === r.brand.id && l.applicationId === r.applicationId).flatMap((l) => l.countries)).join(", ") },
          { key: "l", label: "Product Line", value: (r) => ds.lines.filter((l) => l.brandId === r.brand.id && l.applicationId === r.applicationId).length, num: true },
          { key: "s", label: "Status Relasi", value: (r) => r.docStatus.label, render: (r) => <Badge tone={r.docStatus.tone}>{r.docStatus.label}</Badge> },
        ]} />
      )}
    </>
  );
}
