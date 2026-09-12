"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, PauseCircle, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";
import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import { KpiCard } from "./kpi-card";
import { BrandListFilters, EMPTY_FILTERS, type BrandFilters } from "./brand-list-filters";
import { BrandListTable, DEFAULT_COLS, type BrandRow, type ColVisibility, type SortKey } from "./brand-list-table";
import { BrandDetailDrawer } from "./brand-detail-drawer";
import { downloadBrandsCsv } from "./export-csv";

type ApiBrandRow = {
  id: string;
  brandName: string;
  countryOfOrigin: string;
  registrationNumber: string | null;
  trademarkClass: string | null;
  evidenceType: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  companyName: string | null;
  ownerTitle: string | null;
  completenessPercent: number;
  docExpired: boolean;
  docExpiring: boolean;
  qtStatus: "lengkap" | "belum_ada" | "akan_kedaluwarsa";
};

type CountryOption = { name: string; code: string };

const SURFACE = INTERNAL_MERK_SURFACE;
const LIST_KEY = ["merk-surface", SURFACE.apiBase];

function isInRange(value: string, from: string, to: string): boolean {
  const day = value.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** "Semua Merek" — Admin Workspace, real data. Built to match the reviewed
 * interactive prototype (KPI filtering, chip-based filters, sortable +
 * paginated + column-toggle + bulk-select table, kebab row menu, CSV
 * export, compact detail drawer) wired to the actual `/api/merk*` routes
 * instead of mock data. */
export function AdminBrandList() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<BrandFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [cols, setCols] = useState<ColVisibility>(DEFAULT_COLS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [wizardTarget, setWizardTarget] = useState<"new" | string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: brands, isLoading, isError } = useQuery({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const response = await fetch(SURFACE.apiBase);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: ApiBrandRow[] };
      return json.data;
    },
  });

  const { data: countries } = useQuery({
    queryKey: ["master-data-country", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/country");
      if (!response.ok) throw new Error("Gagal memuat data negara");
      const json = (await response.json()) as { data: CountryOption[] };
      return json.data;
    },
  });
  const countryCodeByName = useMemo(() => {
    const map = new Map<string, string>();
    (countries ?? []).forEach((c) => map.set(c.name, c.code));
    return map;
  }, [countries]);

  const allRows: BrandRow[] = useMemo(
    () =>
      (brands ?? []).map((b) => ({
        id: b.id,
        brandName: b.brandName,
        ownerTitle: b.ownerTitle,
        companyName: b.companyName,
        countryOfOrigin: b.countryOfOrigin,
        countryFlagCode: countryCodeByName.get(b.countryOfOrigin),
        trademarkClass: b.trademarkClass,
        registrationNumber: b.registrationNumber,
        status: b.status,
        completenessPercent: b.completenessPercent,
        updatedAt: b.updatedAt,
      })),
    [brands, countryCodeByName],
  );

  const countryOptions = useMemo(() => Array.from(new Set((brands ?? []).map((b) => b.countryOfOrigin))).sort(), [brands]);
  const companyOptions = useMemo(
    () => Array.from(new Set((brands ?? []).map((b) => b.companyName).filter((c): c is string => Boolean(c)))).sort(),
    [brands],
  );
  const classOptions = useMemo(
    () => Array.from(new Set((brands ?? []).map((b) => b.trademarkClass).filter((c): c is string => Boolean(c)))).sort(),
    [brands],
  );

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = (brands ?? []).filter((b) => {
      if (q) {
        const hay = `${b.brandName} ${b.ownerTitle ?? ""} ${b.registrationNumber ?? ""} ${b.companyName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (filters.country !== "all" && b.countryOfOrigin !== filters.country) return false;
      if (filters.evidenceType !== "all" && b.evidenceType !== filters.evidenceType) return false;
      if (filters.trademarkClass !== "all" && b.trademarkClass !== filters.trademarkClass) return false;
      if (filters.company !== "all" && b.companyName !== filters.company) return false;

      const a = filters.advanced;
      if (a.completeness === "100" && b.completenessPercent !== 100) return false;
      if (a.completeness === "50-99" && !(b.completenessPercent >= 50 && b.completenessPercent < 100)) return false;
      if (a.completeness === "lt50" && !(b.completenessPercent < 50)) return false;
      if ((a.createdFrom || a.createdTo) && !isInRange(b.createdAt, a.createdFrom, a.createdTo)) return false;
      if ((a.updatedFrom || a.updatedTo) && !isInRange(b.updatedAt, a.updatedFrom, a.updatedTo)) return false;
      if (a.docExpired && !b.docExpired) return false;
      if (a.docExpiring && !b.docExpiring) return false;
      if (a.qt !== "all" && b.qtStatus !== a.qt) return false;
      return true;
    });

    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((x, y) => {
        const vx = sortKey === "ownerTitle" ? (x.ownerTitle ?? "") : (x as unknown as Record<string, string | number>)[sortKey];
        const vy = sortKey === "ownerTitle" ? (y.ownerTitle ?? "") : (y as unknown as Record<string, string | number>)[sortKey];
        if (typeof vx === "string" && typeof vy === "string") return vx.localeCompare(vy) * dir;
        return ((vx as number) - (vy as number)) * dir;
      });
    }

    const byId = new Map(allRows.map((r) => [r.id, r]));
    return list.map((b) => byId.get(b.id)!).filter(Boolean);
  }, [brands, filters, sortKey, sortDir, allRows]);

  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  // Resolved against the full row set (not just the current page) — a
  // selection can span pages, and Export/bulk-status must act on all of it.
  const selectedRows = useMemo(() => allRows.filter((r) => selected.has(r.id)), [allRows, selected]);
  const hasDraftSelected = useMemo(
    () => selectedRows.some((r) => r.status === "DRAFT"),
    [selectedRows],
  );

  function updateFilters(next: BrandFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleKpiClick(kpi: "all" | "ACTIVE" | "DRAFT" | "INACTIVE") {
    if (kpi === "all") updateFilters(EMPTY_FILTERS);
    else updateFilters({ ...EMPTY_FILTERS, status: kpi });
  }

  async function toggleStatus(id: string, nextActive: boolean) {
    try {
      const response = await fetch(`${SURFACE.apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextActive ? "ACTIVE" : "INACTIVE" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal memperbarui status merek");
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status merek");
      return false;
    }
  }

  async function handleBulkStatus(ids: string[], nextActive: boolean) {
    const results = await Promise.all(ids.map((id) => toggleStatus(id, nextActive)));
    queryClient.invalidateQueries({ queryKey: LIST_KEY });
    const okCount = results.filter(Boolean).length;
    if (okCount > 0) toast.success(`${okCount} merek ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`);
    setSelected(new Set());
  }

  function handleRowAction(action: string, row: BrandRow) {
    if (action === "detail") setDetailId(row.id);
    else if (action === "edit") setWizardTarget(row.id);
    else if (action === "continueDraft") setWizardTarget(row.id);
    else if (action === "status") toggleStatus(row.id, row.status !== "ACTIVE").then((ok) => { if (ok) queryClient.invalidateQueries({ queryKey: LIST_KEY }); });
    else if (action === "documents") setDetailId(row.id);
    else if (action === "activity") setDetailId(row.id);
  }

  // Derived from the exact same fetch that feeds the table below — not a
  // second endpoint — so the cards can never disagree with what's actually
  // listed (see the "card vs tabel belum sinkron" report: the previous
  // version pulled these from a separate /api/merk/dashboard query that
  // only the table's own mutations ever invalidated, so the cards went
  // stale after every add/edit/activate and on that endpoint's own
  // transient failures).
  const kpis = useMemo(() => {
    const list = brands ?? [];
    return {
      totalMerek: list.length,
      merekAktif: list.filter((b) => b.status === "ACTIVE").length,
      draft: list.filter((b) => b.status === "DRAFT").length,
      merekTidakAktif: list.filter((b) => b.status === "INACTIVE").length,
    };
  }, [brands]);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Merek Management <span className="mx-1">›</span> Semua Merek</p>
          <h1 className="text-lg font-bold">Semua Merek</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Kelola seluruh data merek yang terdaftar pada platform. Pantau status, kelengkapan data, dan dokumen merek.
          </p>
        </div>
        <Button onClick={() => setWizardTarget("new")}>+ Tambah Merek</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Total Merek"
          value={kpis.totalMerek}
          icon={Tag}
          onClick={() => handleKpiClick("all")}
          active={filters.status === "all"}
          isLoading={isLoading}
        />
        <KpiCard
          label="Merek Aktif"
          value={kpis.merekAktif}
          icon={CheckCircle2}
          onClick={() => handleKpiClick("ACTIVE")}
          active={filters.status === "ACTIVE"}
          isLoading={isLoading}
        />
        <KpiCard
          label="Draft"
          value={kpis.draft}
          icon={PauseCircle}
          tone="warning"
          onClick={() => handleKpiClick("DRAFT")}
          active={filters.status === "DRAFT"}
          isLoading={isLoading}
        />
        <KpiCard
          label="Tidak Aktif"
          value={kpis.merekTidakAktif}
          icon={AlertTriangle}
          tone="danger"
          onClick={() => handleKpiClick("INACTIVE")}
          active={filters.status === "INACTIVE"}
          isLoading={isLoading}
        />
      </div>

      <BrandListFilters filters={filters} onChange={updateFilters} countries={countryOptions} companies={companyOptions} classes={classOptions} />

      <BrandListTable
        rows={pageRows}
        totalCount={filteredRows.length}
        isLoading={isLoading}
        isError={isError}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else { setSortKey(key); setSortDir("asc"); }
        }}
        cols={cols}
        onColsChange={setCols}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        selected={selected}
        onSelectedChange={setSelected}
        selectedRows={selectedRows}
        hasDraftSelected={hasDraftSelected}
        onRowAction={handleRowAction}
        onExportCsv={(rows) => { downloadBrandsCsv(rows); toast.success(`Mengekspor ${rows.length} merek ke CSV.`); }}
        onBulkStatus={handleBulkStatus}
      />

      {wizardTarget && (
        <MerkWizard
          surface={SURFACE}
          draftId={wizardTarget === "new" ? undefined : wizardTarget}
          onClose={() => { setWizardTarget(null); queryClient.invalidateQueries({ queryKey: LIST_KEY }); }}
        />
      )}

      {detailId && (
        <BrandDetailDrawer
          id={detailId}
          apiBase={SURFACE.apiBase}
          detailHref={SURFACE.detailHrefBase ?? SURFACE.listHref}
          onClose={() => setDetailId(null)}
          onEdit={() => { setWizardTarget(detailId); setDetailId(null); }}
        />
      )}
    </div>
  );
}
