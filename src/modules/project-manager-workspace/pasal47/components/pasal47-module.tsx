"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { applyFilters, defaultPeriod, FILTER_LABELS, filterOptions, reportingPeriods, type P47Filters } from "../derive";
import type { P47Dataset, P47Report } from "../types";
import { Pasal47Provider, type DrawerSpec, type Pasal47Ctx } from "./context";
import { Mini } from "./drawers";
import { ApiuPage, HsPage, MerekPage, NegaraPage, RingkasanPage } from "./pages-company";
import { GudangPage, NilaiPage, PemilikPage, TeknisPage } from "./pages-evidence";
import { KonsentrasiPage, ProsesPage, TrenPage } from "./pages-analysis";
import { KesimpulanPage, TemuanPage } from "./pages-results";
import { ExportPage } from "./page-export";
import { MaterialIcon } from "../../components/material-icon";
import "./pasal47.css";

type NavGroup = { g: string; label: string; items: [string, string][] };
const NAV: (NavGroup | { id: string; label: string })[] = [
  { id: "ringkasan", label: "Ringkasan" },
  { g: "perusahaan", label: "Perusahaan & Komoditas", items: [["apiu", "API-U, KBLI & LHVIU"], ["hs", "Komoditas & Pos Tarif/HS"], ["negara", "Negara Asal"], ["merek", "Merek & Importir"]] },
  { g: "bukti", label: "Bukti & Kapasitas", items: [["pemilik", "Pemilik Merek & Perwakilan Resmi"], ["teknis", "Persyaratan Teknis"], ["gudang", "Persediaan & Gudang"], ["nilai", "Nilai Impor & Modal Kerja"]] },
  { g: "analisis", label: "Analisis", items: [["konsentrasi", "Konsentrasi Kebutuhan"], ["tren", "Tren Rencana Kebutuhan Impor"], ["proses", "Bisnis Proses"]] },
  { g: "hasil", label: "Hasil Pelaksanaan", items: [["temuan", "Temuan & Isu Material"], ["kesimpulan", "Kesimpulan Pelaksanaan VIU"]] },
  { id: "export", label: "Export Laporan" },
];
const PAGES: Record<string, () => ReactNode> = {
  ringkasan: RingkasanPage, apiu: ApiuPage, hs: HsPage, negara: NegaraPage, merek: MerekPage,
  pemilik: PemilikPage, teknis: TeknisPage, gudang: GudangPage, nilai: NilaiPage,
  konsentrasi: KonsentrasiPage, tren: TrenPage, proses: ProsesPage, temuan: TemuanPage, kesimpulan: KesimpulanPage, export: ExportPage,
};
const groupOf = (id: string) => NAV.find((n): n is NavGroup => "g" in n && n.items.some(([x]) => x === id));
const labelOf = (id: string) => { const g = groupOf(id); return g ? g.items.find(([x]) => x === id)![1] : (NAV.find((n) => "id" in n && n.id === id) as { label: string }).label; };

const SOURCES: [string, string][] = [
  ["API-U, KBLI, LHVIU", "Profil perusahaan (NIB, KBLI Utama, lokasi) dan file LHVIU yang diunggah Project Manager"],
  ["HS, Merek, Negara, Nilai", "Product Information permohonan VIU Barang Konsumsi"],
  ["Pemilik & perwakilan merek", "Merek Management dan peran pemohon pada Merek yang Digunakan"],
  ["Persyaratan teknis", "Sertifikat Hasil Uji Mutu dan Surat Pernyataan Label, dengan status verifikasi dokumen"],
  ["Gudang, nilai & modal", "Lokasi gudang permohonan; kapasitas, kurs dan keputusan dari Analisis Teknis"],
  ["Temuan", "Temuan surveyor, dokumen ditolak/perlu revisi, modul analisis Tidak Sesuai, produk ditolak/perlu revisi"],
  ["Materialitas, status & catatan", "Ditetapkan Project Manager di modul ini"],
];

export function Pasal47Module() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const periods = useMemo(() => reportingPeriods(new Date()), []);
  const period = periods.find((p) => p.key === params.get("periode")) ?? defaultPeriod(new Date());
  const page = PAGES[params.get("halaman") ?? ""] ? params.get("halaman")! : "ringkasan";
  const [openGroup, setOpenGroup] = useState<string | null>(groupOf(page)?.g ?? "perusahaan");
  const [draft, setDraft] = useState<P47Filters>({});
  const [applied, setApplied] = useState<P47Filters>({});
  const [panel, setPanel] = useState(false);
  const [drawer, setDrawer] = useState<DrawerSpec | null>(null);
  const [saving, setSaving] = useState(false);

  const queryKey = ["project-manager-workspace", "pasal47", period.from, period.to];
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47?from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat data laporan");
      return ((await res.json()) as { data: { dataset: P47Dataset; report: P47Report } }).data;
    },
  });

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const setParams = (next: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) sp.set(k, v);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };
  const go = (id: string) => { const g = groupOf(id); if (g) setOpenGroup(g.g); setDrawer(null); setParams({ halaman: id }); };

  async function saveReport(patch: Parameters<Pasal47Ctx["saveReport"]>[0]) {
    setSaving(true);
    try {
      const res = await fetch("/api/project-manager-workspace/pelaporan-pasal-47", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: period.from, to: period.to, ...patch }) });
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

  const activeFilters = Object.entries(applied).filter(([, v]) => v).map(([k, v]) => [FILTER_LABELS[k as keyof P47Filters], v as string] as [string, string]);
  const ds = useMemo(() => (data ? applyFilters(data.dataset, applied) : null), [data, applied]);
  const options = useMemo(() => (data ? filterOptions(data.dataset) : null), [data]);
  const group = groupOf(page);
  const Page = PAGES[page];

  return (
    <div className="p47">
      <div className="crumbs"><span>Project Manager Workspace</span><span>/</span><span>VIU Konsumsi</span><span>/</span><span>Laporan Kemenperin</span><span>/</span>{group && <><span>{group.label}</span><span>/</span></>}<b>{labelOf(page)}</b></div>
      <div className="ph">
        <div>
          <h1>Laporan Pelaksanaan VIU – Produk Tekstil sebagai Barang Konsumsi</h1>
          <div className="sub">Pelaporan Pasal 47 Permenperin No. 27 Tahun 2025</div>
        </div>
        <div className="fld">
          <label htmlFor="p47-period">Periode laporan</label>
          <select id="p47-period" value={period.key} onChange={(e) => setParams({ periode: e.target.value })}>
            {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="actions">
        <a className="btn primary" href={`${pathname}/laporan?periode=${period.key}`} target="_blank" rel="noopener noreferrer"><MaterialIcon name="description" className="text-[16px]" />Generate Laporan</a>
        <button className="btn" type="button" onClick={() => go("export")}><MaterialIcon name="download" className="text-[16px]" />Export</button>
        <button className="btn" type="button" onClick={() => { go("export"); toast.info("Pilih bagian laporan, lalu Cetak / Simpan PDF."); }}><MaterialIcon name="print" className="text-[16px]" />Print</button>
        <button className="btn" type="button" onClick={() => refetch()} disabled={isFetching}><MaterialIcon name="refresh" className="text-[16px]" />{isFetching ? "Memuat…" : "Refresh"}</button>
        <button className="btn" type="button" onClick={() => setDrawer({ title: "Data Sumber", sub: "Asal data pada modul ini", body: <><Mini head={["Bagian", "Sumber"]} rows={SOURCES} /><p style={{ color: "var(--ink-2)" }}>Permohonan dihitung bila Tanggal Pengajuan berada dalam periode; draf dan permohonan yang ditarik tidak dihitung. Diperbarui {data ? new Date(data.dataset.generatedAt).toLocaleString("id-ID") : "—"}.</p></> })}>Lihat Data Sumber</button>
      </div>

      <div className="filterbar">
        <div className="fb-row">
          <button className="btn sm" type="button" aria-expanded={panel} onClick={() => setPanel((p) => !p)}><MaterialIcon name="filter_list" className="text-[16px]" />Filter</button>
          <span className="fb-count"><span className={`n ${activeFilters.length ? "on" : ""}`}>{activeFilters.length}</span> filter aktif</span>
          <div className="fchips">
            {Object.entries(applied).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="fchip">{FILTER_LABELS[k as keyof P47Filters]}: {v}<button type="button" aria-label={`Hapus filter ${FILTER_LABELS[k as keyof P47Filters]}`} onClick={() => { const n = { ...applied }; delete n[k as keyof P47Filters]; setApplied(n); setDraft(n); }}>×</button></span>
            ))}
          </div>
          <button className="btn sm ghost" type="button" onClick={() => { setDraft({}); setApplied({}); }}>Reset Filter</button>
          <button className="btn sm primary" type="button" onClick={() => { setApplied(Object.fromEntries(Object.entries(draft).filter(([, v]) => v))); setPanel(false); }}>Apply Filter</button>
        </div>
        {panel && options && (
          <div className="fpanel">
            {(Object.keys(FILTER_LABELS) as (keyof P47Filters)[]).map((k) => (
              <div key={k} className="fld">
                <label htmlFor={`p47-f-${k}`}>{FILTER_LABELS[k]}</label>
                <select id={`p47-f-${k}`} value={draft[k] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}>
                  <option value="">Semua</option>
                  {options[k].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p47-layout" style={{ marginTop: 16 }}>
        <nav className="p47-nav" aria-label="Pelaporan Pasal 47">
          <div className="head"><MaterialIcon name="account_balance" className="text-[16px]" />Pelaporan Pasal 47<small>Konsumsi</small></div>
          {NAV.map((n) => ("g" in n ? (
            <div key={n.g}>
              <button type="button" className={`item grp ${group?.g === n.g ? "has-active" : ""}`} aria-expanded={openGroup === n.g} onClick={() => setOpenGroup(openGroup === n.g ? null : n.g)}>{n.label}<span className="chev">›</span></button>
              {openGroup === n.g && <div className="sub">{n.items.map(([id, l]) => <button key={id} type="button" className={`item ${page === id ? "active" : ""}`} aria-current={page === id ? "page" : undefined} onClick={() => go(id)}>{l}</button>)}</div>}
            </div>
          ) : (
            <button key={n.id} type="button" className={`item ${page === n.id ? "active" : ""}`} aria-current={page === n.id ? "page" : undefined} onClick={() => go(n.id)}>{n.label}</button>
          )))}
        </nav>
        <div style={{ minWidth: 0 }}>
          {group && (
            <div className="tabs" role="tablist" style={{ marginTop: 0 }}>
              {group.items.map(([id, l]) => <button key={id} type="button" role="tab" className="tab" aria-selected={page === id} onClick={() => go(id)}>{l}</button>)}
            </div>
          )}
          {isLoading && <div className="empty">Memuat data laporan…</div>}
          {isError && <div className="empty" style={{ color: "var(--bad)" }}>Data laporan gagal dimuat. Coba Refresh.</div>}
          {data && ds && (
            <Pasal47Provider value={{ ds, full: data.dataset, period, report: data.report, saveReport, saving, openDrawer: setDrawer, go, activeFilters }}>
              {data.dataset.applications.length === 0 && <div className="banner na"><MaterialIcon name="info" className="text-[18px]" /><div><b>Belum ada permohonan VIU Barang Konsumsi pada periode ini.</b> Pilih periode lain di atas.</div></div>}
              <Page />
              {drawer && (
                <>
                  <div className="p47-scrim" onClick={() => setDrawer(null)} />
                  <aside className="p47-drawer" role="dialog" aria-label={drawer.title}>
                    <div className="dr-head">
                      <div><h3>{drawer.title}</h3>{drawer.sub && <small>{drawer.sub}</small>}</div>
                      <button className="btn sm" style={{ marginLeft: "auto" }} type="button" aria-label="Tutup" onClick={() => setDrawer(null)} autoFocus>✕</button>
                    </div>
                    <div className="dr-body">{drawer.body}</div>
                  </aside>
                </>
              )}
            </Pasal47Provider>
          )}
        </div>
      </div>
    </div>
  );
}
