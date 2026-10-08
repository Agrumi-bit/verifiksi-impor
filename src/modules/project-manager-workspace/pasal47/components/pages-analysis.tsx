"use client";

import { useState } from "react";

import { concentration, trend, unitsOf, type Dimension, type TrendGroup } from "../derive";
import { businessFlow } from "../summary";
import { usePasal47 } from "./context";
import { brandDrawer, countryDrawer, hsDrawer, KV } from "./drawers";
import { Badge, Banner, Card, H2, HBar, Kpi, Seg, Tip } from "./ui";
import { LineChart } from "./line-chart";

const DIM_LABEL: Record<Dimension, string> = { hs: "HS", merek: "Merek", negara: "Negara Asal", perusahaan: "Perusahaan" };

export function KonsentrasiPage() {
  const { ds, openDrawer } = usePasal47();
  const [dim, setDim] = useState<Dimension>("hs");
  const [n, setN] = useState<"5" | "10">("5");
  const { items, total } = concentration(ds.lines, dim, Number(n));
  const top3 = items.slice(0, 3).reduce((a, i) => a + i.v, 0);
  const click = (key: string) => {
    if (dim === "hs") return () => openDrawer(hsDrawer(key, ds));
    if (dim === "negara") return () => openDrawer(countryDrawer(key, ds));
    if (dim === "merek") { const b = ds.brands.find((x) => x.name === key); return b ? () => openDrawer(brandDrawer(b, ds)) : undefined; }
    return undefined;
  };
  return (
    <>
      <Banner kind="info" title="Analytical enhancement.">Bukan indikator regulasi langsung. Pangsa dihitung dari jumlah product line karena kuantitas memakai satuan berbeda.</Banner>
      <div className="h2row">
        <Seg label="Dimensi" value={dim} onChange={setDim} options={[["hs", "HS"], ["merek", "Merek"], ["negara", "Negara"], ["perusahaan", "Perusahaan"]]} />
        <Seg label="Jumlah" value={n} onChange={setN} options={[["5", "Top 5"], ["10", "Top 10"]]} />
      </div>
      <div className="grid g-main">
        <Card title={`Konsentrasi menurut ${DIM_LABEL[dim]}`} caption={`Peringkat dan share dari ${total} ${dim === "negara" ? "relasi produk-negara" : "product line"}`}>
          <HBar total={total} items={items.map((i) => ({ label: i.label, v: i.v, onClick: click(i.key) }))} />
        </Card>
        <div className="grid" style={{ alignContent: "start" }}>
          <Kpi label="Share 3 teratas" value={total ? `${Math.round((top3 / total) * 100)}%` : "—"} sub={items.slice(0, 3).map((i) => i.key).join(", ")} tip="Jumlah product line tiga teratas dibagi total." />
          <Kpi label="Entitas tampil" value={items.length} sub={`dimensi ${DIM_LABEL[dim]}`} />
        </div>
      </div>
    </>
  );
}

export function TrenPage() {
  const { ds, period } = usePasal47();
  const units = unitsOf(ds.lines);
  const [group, setGroup] = useState<TrendGroup>("bulanan");
  const [picked, setUnit] = useState(units[0] ?? "");
  const unit = units.includes(picked) ? picked : (units[0] ?? "");
  const t = unit ? trend(ds.lines, ds.applications, period, unit, group) : null;
  return (
    <>
      <Banner kind="warn" title="Rencana, bukan realisasi.">Data menggambarkan rencana kebutuhan berdasarkan pelaksanaan VIU, ditempatkan pada bulan tanggal pengajuan permohonan. Data realisasi impor aktual belum tersedia pada sistem.</Banner>
      <div className="h2row">
        <Seg label="Kelompok" value={group} onChange={setGroup} options={[["bulanan", "Bulanan"], ["hs", "Per HS"], ["merek", "Per Merek"], ["perusahaan", "Per Perusahaan"]]} />
        {units.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="lbl">Satuan</span>
            <Tip text="Satu satuan per tampilan agar kuantitas tidak dijumlahkan lintas satuan." />
            <Seg label="Satuan" value={unit} onChange={setUnit} options={units.map((u) => [u, u] as [string, string])} />
          </div>
        )}
      </div>
      <Card title={`Rencana kebutuhan impor per bulan${unit ? ` (${unit})` : ""}`} caption={`${period.label} · arahkan kursor untuk nilai tiap bulan`}>
        {t ? <LineChart months={t.months} series={t.series} unit={unit} /> : <div className="empty">Belum ada product line bersatuan pada periode ini.</div>}
      </Card>
    </>
  );
}

export function ProsesPage() {
  const { ds } = usePasal47();
  const [brandId, setBrandId] = useState(ds.brands[0]?.id ?? "");
  const [node, setNode] = useState(0);
  const brand = ds.brands.find((b) => b.id === brandId) ?? ds.brands[0];
  if (!brand) return <div className="empty">Belum ada merek pada periode ini.</div>;
  const nodes = businessFlow(brand, ds);
  const sel = nodes[node];
  return (
    <>
      <Banner kind="info" title="Hanya yang terverifikasi yang ditandai Verified.">Tahap hilir (distribusi hingga konsumen) ditampilkan sebagai Data Not Available, bukan diasumsikan.</Banner>
      <H2 title="Alur bisnis proses" sub="Pilih merek, lalu klik tahap untuk melihat sumber datanya"
        right={<div className="fld" style={{ minWidth: 240 }}><label htmlFor="p47-flow-brand">Merek</label><select id="p47-flow-brand" value={brand.id} onChange={(e) => { setBrandId(e.target.value); setNode(0); }}>{ds.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>} />
      <div className="card">
        <div className="flow">
          {nodes.map((n, i) => (
            <button key={n.title} type="button" className={`node ${n.status.tone} ${i === node ? "sel" : ""}`} onClick={() => setNode(i)}>
              <div className="step">TAHAP {i + 1}</div>
              <div className="nt">{n.title}</div>
              <Badge tone={n.status.tone}>{n.status.label}</Badge>
              <div className="ns">{n.source}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>{sel.title} · {brand.name}</h3>
        <p className="cap">{sel.status.label}</p>
        <KV pairs={[["Sumber data", sel.source], ["Entitas", sel.entity], ["Catatan", sel.note]]} />
      </div>
    </>
  );
}
