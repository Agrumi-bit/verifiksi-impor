"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Flag, Globe, Handshake, Tag, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form/native-select";
import { MERK_AGREEMENT_TYPE_LABELS, type MerkAgreementType } from "@/modules/merk/schema";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";
import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import { KpiCard } from "./kpi-card";
import { getExpiryStatus } from "./expiry-status";
import { downloadBrandsCsv } from "./export-csv";
import { BrandDetailDrawer } from "./brand-detail-drawer";
import { AddRelationshipDrawer } from "./add-relationship-drawer";
import {
  RelationshipListTable, DEFAULT_REL_COLS,
  type RelationshipRow, type ColVisibility, type SortKey,
} from "./relationship-list-table";
import type { RelationshipBucket } from "@/app/api/merk/relationships/route";

type ApiRow = RelationshipRow & {
  missingDocLabels: string[];
  hasDocuments: boolean;
  ownerLocation: "domestic" | "foreign";
};

const SURFACE = INTERNAL_MERK_SURFACE;

const TAB_OF_BUCKET: Record<RelationshipBucket, "owner" | "representative" | "importer"> = {
  pemilik_merek: "owner",
  company_pemilik: "owner",
  apiu_perwakilan: "representative",
  perwakilan_lain: "representative",
  importir_ditunjuk: "importer",
};

const REL_OPTIONS: { value: RelationshipBucket; label: string }[] = [
  { value: "pemilik_merek", label: "Pemilik Merek" },
  { value: "company_pemilik", label: "API-U / Company sebagai Pemilik" },
  { value: "apiu_perwakilan", label: "API-U sebagai Perwakilan Resmi" },
  { value: "perwakilan_lain", label: "Perwakilan Resmi Perusahaan Lain" },
  { value: "importir_ditunjuk", label: "Importir yang Ditunjuk" },
];

type Filters = {
  search: string;
  tab: "all" | "owner" | "representative" | "importer";
  rel: "all" | RelationshipBucket;
  lokasi: "all" | "domestic" | "foreign";
  country: string;
  rep: string;
  company: string;
  agreement: "all" | "Lisensi" | "Sublisensi" | "none";
  status: "all" | "Aktif" | "Tidak Aktif" | "Tidak Lengkap";
  advAgreementEnding: boolean;
  advAppointmentEnding: boolean;
  advNoRep: boolean;
  advNoDocs: boolean;
};
const EMPTY_FILTERS: Filters = {
  search: "", tab: "all", rel: "all", lokasi: "all", country: "all", rep: "all", company: "all",
  agreement: "all", status: "all", advAgreementEnding: false, advAppointmentEnding: false, advNoRep: false, advNoDocs: false,
};

function isEndingSoon(date: string | null): boolean {
  if (!date) return false;
  const status = getExpiryStatus(date);
  return status === "expiring_soon" || status === "expired";
}
function daysUntil(date: string): number {
  return Math.round((new Date(date).getTime() - Date.now()) / 86400000);
}

/** Admin "Pemilik & Perwakilan" — platform-wide ownership/representation
 * monitoring, built to match the reviewed prototype: KPI-as-filter cards,
 * relationship-type tabs, chip-based filters, a compact health summary, an
 * attention list computed from real expiry/completeness data, and a
 * sortable/paginated/column-toggle table. Reuses `BrandDetailDrawer` (same
 * one "Semua Merek" uses) for detail instead of a second detail view, and
 * `MerkWizard` directly for Edit/Add — a relationship is always a Brand's
 * own `MerkOwnership` record, never a standalone object. */
export function AdminRelationships() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cols, setCols] = useState<ColVisibility>(DEFAULT_REL_COLS);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "ownership" | "trademark" | "documents" | "qt" | "activity">("overview");
  const [wizardTarget, setWizardTarget] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["merk-management", "admin", "relationships"],
    queryFn: async () => {
      const response = await fetch("/api/merk/relationships");
      if (!response.ok) throw new Error("Gagal memuat data relasi merek");
      const json = (await response.json()) as { data: ApiRow[] };
      return json.data;
    },
  });

  const all = useMemo(() => rows ?? [], [rows]);
  const countryOptions = useMemo(() => Array.from(new Set(all.map((r) => r.ownerCountry).filter((v): v is string => Boolean(v)))).sort(), [all]);
  const repOptions = useMemo(() => Array.from(new Set(all.map((r) => r.officialRepresentativeName).filter((v): v is string => Boolean(v)))).sort(), [all]);
  const companyOptions = useMemo(() => Array.from(new Set(all.map((r) => r.companyImporterName).filter((v): v is string => Boolean(v)))).sort(), [all]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = all.filter((r) => {
      if (q) {
        const hay = `${r.brandName} ${r.ownerName ?? ""} ${r.companyImporterName ?? ""} ${r.officialRepresentativeName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.tab !== "all" && TAB_OF_BUCKET[r.relationshipBucket] !== filters.tab) return false;
      if (filters.rel !== "all" && r.relationshipBucket !== filters.rel) return false;
      if (filters.lokasi !== "all" && r.ownerLocation !== filters.lokasi) return false;
      if (filters.country !== "all" && r.ownerCountry !== filters.country) return false;
      if (filters.rep !== "all" && r.officialRepresentativeName !== filters.rep) return false;
      if (filters.company !== "all" && r.companyImporterName !== filters.company) return false;
      if (filters.agreement !== "all") {
        if (filters.agreement === "none" && r.agreementType) return false;
        if (filters.agreement !== "none" && r.agreementType?.toLowerCase() !== filters.agreement.toLowerCase()) return false;
      }
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.advAgreementEnding && !isEndingSoon(r.agreementEndDate)) return false;
      if (filters.advAppointmentEnding && !(r.relationshipBucket === "importir_ditunjuk" && isEndingSoon(r.appointmentEndDate))) return false;
      if (filters.advNoRep && r.officialRepresentativeName) return false;
      if (filters.advNoDocs && r.hasDocuments) return false;
      return true;
    });

    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((x, y) => {
        const vx = x[sortKey] ?? "";
        const vy = y[sortKey] ?? "";
        if (typeof vx === "string" && typeof vy === "string") return vx.localeCompare(vy) * dir;
        return ((vx as number) - (vy as number)) * dir;
      });
    }
    return list;
  }, [all, filters, sortKey, sortDir]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }
  function applyKpi(patch: Partial<Filters>) {
    updateFilters({ ...EMPTY_FILTERS, ...patch });
  }

  // KPIs, health, and attention are always computed from the *full* set —
  // they describe the platform, not the current filter view.
  const kpiTotal = all.length;
  const kpiDomestic = all.filter((r) => r.ownerLocation === "domestic").length;
  const kpiForeign = all.filter((r) => r.ownerLocation === "foreign").length;
  const kpiApiuRep = all.filter((r) => r.relationshipBucket === "apiu_perwakilan").length;
  const kpiOtherRep = all.filter((r) => r.relationshipBucket === "perwakilan_lain").length;
  const kpiImporter = all.filter((r) => r.relationshipBucket === "importir_ditunjuk").length;
  const kpiIncomplete = all.filter((r) => r.completenessPercent < 100).length;

  const healthComplete = all.length - kpiIncomplete;
  const healthAgreementEnding = all.filter((r) => isEndingSoon(r.agreementEndDate)).length;
  const healthAppointmentEnding = all.filter((r) => r.relationshipBucket === "importir_ditunjuk" && isEndingSoon(r.appointmentEndDate)).length;
  const healthNoDocs = all.filter((r) => !r.hasDocuments).length;

  const attentionItems = useMemo(() => {
    const items: { id: string; brand: string; message: string; incomplete: boolean }[] = [];
    all.forEach((r) => {
      if (isEndingSoon(r.agreementEndDate)) {
        const d = daysUntil(r.agreementEndDate!);
        items.push({
          id: r.brandId, brand: r.brandName, incomplete: false,
          message: `Perjanjian ${r.agreementType ? MERK_AGREEMENT_TYPE_LABELS[r.agreementType.toLowerCase() as MerkAgreementType] : "Lisensi"} ${d < 0 ? "sudah berakhir" : `berakhir dalam ${d} hari`}`,
        });
      } else if (r.relationshipBucket === "importir_ditunjuk" && isEndingSoon(r.appointmentEndDate)) {
        const d = daysUntil(r.appointmentEndDate!);
        items.push({ id: r.brandId, brand: r.brandName, incomplete: false, message: `Surat Penunjukan Importir ${d < 0 ? "sudah berakhir" : `berakhir dalam ${d} hari`}` });
      } else if (r.status === "Tidak Lengkap" && r.missingDocLabels.length > 0) {
        items.push({ id: r.brandId, brand: r.brandName, incomplete: true, message: `${r.missingDocLabels[0]} belum tersedia` });
      }
    });
    return items;
  }, [all]);

  function openDetail(id: string, tab: typeof detailTab = "overview") {
    setDetailTab(tab);
    setDetailId(id);
  }

  function handleRowAction(action: string, row: RelationshipRow) {
    if (action === "detail") openDetail(row.brandId);
    else if (action === "edit") setWizardTarget(row.brandId);
    else if (action === "brand" || action === "owner") openDetail(row.brandId, "ownership");
    else if (action === "rep") openDetail(row.brandId, "ownership");
    else if (action === "docs") openDetail(row.brandId, "documents");
    else if (action === "complete") openDetail(row.brandId, "documents");
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Merek Management <span className="mx-1">›</span> Pemilik &amp; Perwakilan</p>
          <h1 className="text-lg font-bold">Pemilik &amp; Perwakilan</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Kelola dan pantau hubungan kepemilikan merek, Perwakilan Resmi, dan perusahaan yang terkait dengan setiap merek.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>+ Tambah Hubungan</Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total Hubungan" value={kpiTotal} icon={Tag} onClick={() => updateFilters(EMPTY_FILTERS)} active={JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS)} />
        <KpiCard label="Pemilik Indonesia" value={kpiDomestic} icon={Flag} onClick={() => applyKpi({ lokasi: "domestic" })} />
        <KpiCard label="Pemilik Luar Negeri" value={kpiForeign} icon={Globe} onClick={() => applyKpi({ lokasi: "foreign" })} />
        <KpiCard label="API-U/Company sbg Perwakilan" value={kpiApiuRep} icon={Handshake} onClick={() => applyKpi({ rel: "apiu_perwakilan" })} />
        <KpiCard label="Perwakilan Perusahaan Lain" value={kpiOtherRep} icon={Handshake} onClick={() => applyKpi({ rel: "perwakilan_lain" })} />
        <KpiCard label="Importir Ditunjuk" value={kpiImporter} icon={Truck} onClick={() => applyKpi({ rel: "importir_ditunjuk" })} />
        <KpiCard label="Hubungan Tidak Lengkap" value={kpiIncomplete} icon={AlertTriangle} tone="warning" onClick={() => applyKpi({ status: "Tidak Lengkap" })} />
      </div>

      <div className="inline-flex w-fit gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
        {([
          ["all", "Semua Hubungan"], ["owner", "Pemilik Merek"], ["representative", "Perwakilan Resmi"], ["importer", "Importir yang Ditunjuk"],
        ] as [Filters["tab"], string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => updateFilters({ ...filters, tab: key })}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${filters.tab === key ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <Input value={filters.search} onChange={(e) => updateFilters({ ...filters, search: e.target.value })} placeholder="Cari merek, pemilik, perusahaan, atau NIB..." className="h-9 max-w-sm" />
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => updateFilters(EMPTY_FILTERS)}>Reset Filter</Button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <NativeSelect className="w-auto" value={filters.rel} onChange={(e) => updateFilters({ ...filters, rel: e.target.value as Filters["rel"] })}>
            <option value="all">Semua Jenis Hubungan</option>
            {REL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
          <NativeSelect className="w-auto" value={filters.lokasi} onChange={(e) => updateFilters({ ...filters, lokasi: e.target.value as Filters["lokasi"] })}>
            <option value="all">Semua Lokasi Pemilik</option><option value="domestic">Indonesia</option><option value="foreign">Luar Indonesia</option>
          </NativeSelect>
          <NativeSelect className="w-auto" value={filters.country} onChange={(e) => updateFilters({ ...filters, country: e.target.value })}>
            <option value="all">Semua Negara Pemilik</option>
            {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
          <NativeSelect className="w-auto" value={filters.rep} onChange={(e) => updateFilters({ ...filters, rep: e.target.value })}>
            <option value="all">Semua Perwakilan Resmi</option>
            {repOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
          <NativeSelect className="w-auto" value={filters.company} onChange={(e) => updateFilters({ ...filters, company: e.target.value })}>
            <option value="all">Semua Company / Importir</option>
            {companyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
          <NativeSelect className="w-auto" value={filters.agreement} onChange={(e) => updateFilters({ ...filters, agreement: e.target.value as Filters["agreement"] })}>
            <option value="all">Semua Jenis Perjanjian</option><option value="Lisensi">Lisensi</option><option value="Sublisensi">Sublisensi</option><option value="none">Tidak Ada</option>
          </NativeSelect>
          <NativeSelect className="w-auto" value={filters.status} onChange={(e) => updateFilters({ ...filters, status: e.target.value as Filters["status"] })}>
            <option value="all">Semua Status</option><option value="Aktif">Aktif</option><option value="Tidak Aktif">Tidak Aktif</option><option value="Tidak Lengkap">Tidak Lengkap</option>
          </NativeSelect>

          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setIsAdvancedOpen((v) => !v)}>Filter Lainnya ▾</Button>
            {isAdvancedOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Tutup" onClick={() => setIsAdvancedOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-background p-4 shadow-lg">
                  <p className="mb-3 text-sm font-semibold">Filter Lainnya</p>
                  <label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={filters.advAgreementEnding} onChange={(e) => updateFilters({ ...filters, advAgreementEnding: e.target.checked })} />Perjanjian akan berakhir (≤30 hari)</label>
                  <label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={filters.advAppointmentEnding} onChange={(e) => updateFilters({ ...filters, advAppointmentEnding: e.target.checked })} />Surat penunjukan akan berakhir (≤30 hari)</label>
                  <label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={filters.advNoRep} onChange={(e) => updateFilters({ ...filters, advNoRep: e.target.checked })} />Tanpa Perwakilan Resmi</label>
                  <label className="mb-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={filters.advNoDocs} onChange={(e) => updateFilters({ ...filters, advNoDocs: e.target.checked })} />Tanpa Dokumen Pendukung</label>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">🩺 Kesehatan Hubungan</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <HealthItem label="Hubungan Lengkap" value={healthComplete} tone="ok" />
          <HealthItem label="Tidak Lengkap" value={kpiIncomplete} tone="danger" />
          <HealthItem label="Perjanjian Akan Berakhir" value={healthAgreementEnding} tone="warn" />
          <HealthItem label="Surat Penunjukan Akan Berakhir" value={healthAppointmentEnding} tone="warn" />
          <HealthItem label="Tanpa Dokumen Pendukung" value={healthNoDocs} tone="danger" />
        </div>
      </section>

      <RelationshipListTable
        rows={pageRows}
        totalCount={filtered.length}
        isLoading={isLoading}
        isError={isError}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => { if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("asc"); } }}
        cols={cols}
        onColsChange={setCols}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRowAction={handleRowAction}
        onExportCsv={(exportRows) => {
          downloadBrandsCsv(
            exportRows.map((r) => ({
              brandName: r.brandName, ownerTitle: r.ownerName, companyName: r.companyImporterName,
              countryOfOrigin: r.ownerCountry ?? "", trademarkClass: null, registrationNumber: null,
              status: r.status, completenessPercent: r.completenessPercent,
            })),
            "pemilik-perwakilan.csv",
          );
          toast.success(`Mengekspor ${exportRows.length} hubungan ke CSV.`);
        }}
      />

      <section className="rounded-xl border border-border bg-background p-4">
        <p className="mb-2 text-sm font-semibold">⚠️ Hubungan yang Memerlukan Perhatian</p>
        {attentionItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada hubungan yang memerlukan perhatian saat ini.</p>
        ) : (
          <div className="flex flex-col">
            {attentionItems.map((item, i) => (
              <div key={`${item.id}-${i}`} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
                <span className="w-20 shrink-0 text-xs font-bold">{item.brand}</span>
                <span className="flex-1 text-xs text-muted-foreground">{item.message}</span>
                <Button variant="outline" size="sm" onClick={() => openDetail(item.id)}>Lihat</Button>
                {item.incomplete && <Button size="sm" onClick={() => openDetail(item.id, "documents")}>Lengkapi</Button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {detailId && (
        <BrandDetailDrawer
          id={detailId}
          apiBase={SURFACE.apiBase}
          detailHref={SURFACE.detailHrefBase ?? SURFACE.listHref}
          defaultTab={detailTab}
          onClose={() => setDetailId(null)}
          onEdit={() => { setWizardTarget(detailId); setDetailId(null); }}
        />
      )}

      {wizardTarget && (
        <MerkWizard
          surface={SURFACE}
          draftId={wizardTarget}
          onClose={() => { setWizardTarget(null); queryClient.invalidateQueries({ queryKey: ["merk-management", "admin", "relationships"] }); }}
        />
      )}

      {isAddOpen && (
        <AddRelationshipDrawer
          onClose={() => setIsAddOpen(false)}
          onSelectBrand={(id) => { setIsAddOpen(false); setWizardTarget(id); }}
        />
      )}
    </div>
  );
}

function HealthItem({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const border = tone === "ok" ? "border-emerald-500" : tone === "warn" ? "border-amber-500" : "border-destructive";
  return (
    <div className={`border-l-2 pl-2.5 ${border}`}>
      <p className="text-base font-extrabold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
