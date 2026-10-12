"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../../../components/material-icon";
import { customPeriod, reportingPeriods, resolvePeriod } from "../../derive";
import type { P47Report } from "../../types";
import type { IndustriDataset } from "../types";
import "../../components/pasal47.css";
import { AnalisisPage, ApiuPage, BahanPage, ExportPage, GudangPage, KesimpulanPage, ModalPage, PartnerPage, RingkasanPage, TemuanPage, type IndustriPageProps } from "./industri-pages";

const NAV: [string, string][] = [
  ["ringkasan", "Ringkasan"], ["apiu", "API-U, KBLI & LHVIU"], ["bahan", "Bahan Baku & Pos Tarif/HS"], ["partner", "Partner Industri & LHVKI"],
  ["gudang", "Persediaan & Gudang"], ["analisis", "Analisis Teknis"], ["modal", "Modal Kerja & Nilai Impor"], ["temuan", "Temuan & Isu Material"],
  ["kesimpulan", "Kesimpulan Pelaksanaan VIU"], ["export", "Export Laporan"],
];
const PAGES: Record<string, (p: IndustriPageProps) => ReactNode> = {
  ringkasan: RingkasanPage, apiu: ApiuPage, bahan: BahanPage, partner: PartnerPage, gudang: GudangPage,
  analisis: AnalisisPage, modal: ModalPage, temuan: TemuanPage, kesimpulan: KesimpulanPage, export: ExportPage,
};

/** Laporan Kemenperin of VIU Bahan Baku Industri — Pelaporan Pasal 47 for the Project Manager. */
export function IndustriModule() {
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
  const page = PAGES[params.get("halaman") ?? ""] ? params.get("halaman")! : "ringkasan";
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

  const queryKey = ["project-manager-workspace", "pasal47", "industri", period.from, period.to];
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47?scheme=industri&from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat data laporan");
      return ((await res.json()) as { data: { dataset: IndustriDataset; report: P47Report } }).data;
    },
  });

  async function saveReport(patch: Parameters<IndustriPageProps["saveReport"]>[0]) {
    setSaving(true);
    try {
      const res = await fetch("/api/project-manager-workspace/pelaporan-pasal-47", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheme: "industri", from: period.from, to: period.to, ...patch }),
      });
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

  const Page = PAGES[page];
  const label = NAV.find(([id]) => id === page)![1];
  const reportHref = `${pathname}/laporan?periode=${period.key}`;

  return (
    <div className="p47">
      <div className="crumbs"><span>Project Manager Workspace</span><span>/</span><span>VIU Industri</span><span>/</span><span>Laporan Kemenperin</span><span>/</span><b>{label}</b></div>
      <div className="ph">
        <div>
          <h1>Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Industri</h1>
          <div className="sub">Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          <div className="fld">
            <label htmlFor="p47i-period">Tahun laporan</label>
            <select id="p47i-period" value={isPreset ? period.key : "custom"} onChange={(e) => { if (e.target.value !== "custom") setParams({ periode: e.target.value }); }}>
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              {!isPreset && <option value="custom">Periode kustom</option>}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="p47i-from">Awal periode</label>
            <input id="p47i-from" type="date" value={rangeFrom} max={rangeTo || undefined} onChange={(e) => { setRangeFrom(e.target.value); applyRange(e.target.value, rangeTo); }} />
          </div>
          <div className="fld">
            <label htmlFor="p47i-to">Akhir periode</label>
            <input id="p47i-to" type="date" value={rangeTo} min={rangeFrom || undefined} onChange={(e) => { setRangeTo(e.target.value); applyRange(rangeFrom, e.target.value); }} />
            {rangeInvalid && <span style={{ fontSize: 11, color: "#c1361f" }}>Akhir periode harus setelah awal periode.</span>}
          </div>
        </div>
      </div>
      <div className="actions">
        <a className="btn primary" href={reportHref} target="_blank" rel="noopener noreferrer"><MaterialIcon name="description" className="text-[16px]" />Generate Laporan</a>
        <button className="btn" type="button" onClick={() => setParams({ halaman: "export" })}><MaterialIcon name="download" className="text-[16px]" />Export</button>
        <button className="btn" type="button" onClick={() => refetch()} disabled={isFetching}><MaterialIcon name="refresh" className="text-[16px]" />{isFetching ? "Memuat…" : "Refresh"}</button>
      </div>

      <div className="p47-layout" style={{ marginTop: 16 }}>
        <nav className="p47-nav" aria-label="Pelaporan Pasal 47 Industri">
          <div className="head"><MaterialIcon name="account_balance" className="text-[16px]" />Pelaporan Pasal 47<small>Industri</small></div>
          {NAV.map(([id, l]) => <button key={id} type="button" className={`item ${page === id ? "active" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => setParams({ halaman: id })}>{l}</button>)}
        </nav>
        <div style={{ minWidth: 0 }}>
          {isLoading && <div className="empty">Memuat data laporan…</div>}
          {isError && <div className="empty" style={{ color: "var(--bad)" }}>Data laporan gagal dimuat. Coba Refresh.</div>}
          {data && (
            <>
              {data.dataset.applications.length === 0 && <div className="banner na"><MaterialIcon name="info" className="text-[18px]" /><div><b>Belum ada permohonan VIU Bahan Baku Industri pada periode ini.</b> Pilih periode lain di atas.</div></div>}
              <Page ds={data.dataset} report={data.report} period={period} saving={saving} saveReport={saveReport} go={(id) => setParams({ halaman: id })} reportHref={reportHref} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
