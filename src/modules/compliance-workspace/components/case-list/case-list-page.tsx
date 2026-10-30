"use client";

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { CASE_CATEGORY_LABELS, COMPLIANCE_STATUS_LABELS, HANDOVER_LABELS, READINESS_LABELS } from "../../consolidation";
import { PAGE_SIZES, type CaseRow } from "../../case-list";
import { WORKSPACE_KEYS, WORKSPACE_STATE_LABELS } from "../../workspace-status";
import { INPUT_CLASS } from "../styles";
import { CaseFilters } from "./case-filters";
import { CaseQuickDrawer } from "./case-quick-drawer";
import { CaseTable } from "./case-table";
import { formatCalendarDate, formatDate, formatDateTime } from "./format";
import { SummaryCards } from "./summary-cards";
import { useCaseList, useUpdateCompliance } from "./use-case-list";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: CaseRow[], fileName: string) {
  const header = [
    "No. Permohonan", "Pemohon", "NIB", "Tanggal Masuk", ...WORKSPACE_KEYS, "Status Handover", "Readiness",
    "Kategori", "Compliance Status", "Skor", "Temuan Aktif", "LHVIU", "Nomor LHVIU", "Tanggal Terbit LHVIU", "PIC Compliance", "Last Update",
  ];
  const lines = rows.map((row) => [
    row.applicationNumber, row.companyName, row.nib, formatDate(row.submittedAt),
    ...WORKSPACE_KEYS.map((key) => WORKSPACE_STATE_LABELS[row.workspaces[key]]),
    HANDOVER_LABELS[row.handover], READINESS_LABELS[row.readiness], CASE_CATEGORY_LABELS[row.category],
    COMPLIANCE_STATUS_LABELS[row.complianceStatus], `${row.summary.score}%`, row.activeFindings.length,
    row.lhviuIssued ? "Terbit" : "Belum Terbit", row.lhviuNumber ?? "", formatCalendarDate(row.lhviuIssuedAt),
    row.picName ?? "", formatDateTime(row.updatedAt),
  ]);
  // BOM so Excel opens the Indonesian text as UTF-8.
  const csv = "﻿" + [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CaseListPage() {
  const list = useCaseList();
  const update = useUpdateCompliance();
  const [view, setView] = useState<"table" | "compact">("table");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<CaseRow | null>(null);
  const [bulkPic, setBulkPic] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const data = list.query.data;
  const rows = data?.rows ?? [];
  const pics = data?.pics ?? [];

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const allSelected = rows.length > 0 && rows.every((row) => current.has(row.applicationId));
      const next = new Set(current);
      for (const row of rows) {
        if (allSelected) next.delete(row.applicationId);
        else next.add(row.applicationId);
      }
      return next;
    });
  }

  async function save(body: { applicationIds: string[]; picUserId?: string | null; reviewFlag?: boolean }, success: string) {
    const updated = await update.mutateAsync(body).catch(() => null);
    if (updated === null) return;
    toast.success(updated > 0 ? success : "Tidak ada perubahan.");
  }

  async function exportRows(selectedOnly: boolean) {
    setIsExporting(true);
    try {
      const all = (await list.fetchAllFiltered()).rows;
      const exported = selectedOnly ? all.filter((row) => selected.has(row.applicationId)) : all;
      downloadCsv(exported, `compliance-permohonan-${today()}.csv`);
      toast.success(`${exported.length} permohonan diekspor.`);
    } catch {
      toast.error("Gagal mengekspor daftar permohonan.");
    } finally {
      setIsExporting(false);
    }
  }

  const selectedIds = [...selected];
  const isInitialLoading = list.query.isLoading;

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Daftar Permohonan</h1>
          <p className="text-[13px] text-[#64748B]">VIU – Barang Konsumsi · status tiap workspace diambil langsung dari data sumber.</p>
        </div>
        <button
          type="button"
          onClick={() => exportRows(false)}
          disabled={isExporting || !data?.total}
          className={cn(INPUT_CLASS, "inline-flex items-center gap-1.5 font-medium hover:bg-[#F5F7FA] disabled:opacity-50")}
        >
          <Download className="size-4" aria-hidden />
          Export
        </button>
        <button
          type="button"
          onClick={() => list.query.refetch()}
          disabled={list.query.isFetching}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1677FF] px-3 text-[13px] font-medium text-white outline-none hover:bg-[#0F62D6] focus-visible:ring-2 focus-visible:ring-[#1677FF]/40 disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", list.query.isFetching && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </header>

      {list.query.isError && (
        <div role="alert" className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B91C1C]">
          Gagal memuat daftar permohonan. Coba Refresh.
        </div>
      )}

      <SummaryCards counts={data?.counts ?? {}} active={list.filters.chip} onSelect={(chip) => list.updateFilters({ chip })} />

      <CaseFilters
        filters={list.filters}
        onChange={list.updateFilters}
        onReset={list.resetFilters}
        pics={pics}
        counts={data?.counts ?? {}}
        sort={list.sort}
        dir={list.dir}
        onSort={list.setSort}
        onToggleDir={list.toggleDir}
        view={view}
        onView={setView}
      />

      {selectedIds.length > 0 && (
        <div role="region" aria-label="Aksi massal" className="flex flex-wrap items-center gap-2 rounded-xl border border-[#BFD7FF] bg-[#EAF2FF] px-4 py-2.5 text-[13px]">
          <strong>{selectedIds.length} permohonan dipilih</strong>
          <span className="flex-1" />
          <label className="flex items-center gap-1.5">
            Assign PIC Compliance
            <select aria-label="PIC untuk permohonan terpilih" value={bulkPic} onChange={(event) => setBulkPic(event.target.value)} className={INPUT_CLASS}>
              <option value="">Pilih PIC…</option>
              {pics.map((pic) => (
                <option key={pic.id} value={pic.id}>{pic.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!bulkPic || update.isPending}
            onClick={() => save({ applicationIds: selectedIds, picUserId: bulkPic }, "PIC Compliance diperbarui.")}
            className="h-9 rounded-lg bg-[#1677FF] px-3 font-medium text-white disabled:opacity-50"
          >
            Terapkan
          </button>
          <button type="button" disabled={isExporting} onClick={() => exportRows(true)} className={cn(INPUT_CLASS, "font-medium hover:bg-white disabled:opacity-50")}>
            Export Selected
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => save({ applicationIds: selectedIds, reviewFlag: true }, "Permohonan ditandai untuk review.")}
            className={cn(INPUT_CLASS, "font-medium hover:bg-white disabled:opacity-50")}
          >
            Mark for Review
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="px-1 font-medium text-[#1677FF] hover:underline">
            Batalkan pilihan
          </button>
        </div>
      )}

      <CaseTable
        rows={rows}
        isLoading={isInitialLoading}
        view={view}
        selected={selected}
        onToggle={toggle}
        onTogglePage={togglePage}
        sort={list.sort}
        dir={list.dir}
        onSort={list.sortBy}
        onOpen={setOpened}
        pics={pics}
        onAssignPic={(row, picUserId) =>
          save({ applicationIds: [row.applicationId], picUserId }, picUserId ? "PIC Compliance diperbarui." : "PIC Compliance dikosongkan.")
        }
        onToggleReview={(row) =>
          save({ applicationIds: [row.applicationId], reviewFlag: !row.reviewFlag }, row.reviewFlag ? "Tanda review dibatalkan." : "Permohonan ditandai untuk review.")
        }
      />

      {data && data.total > 0 && (
        <nav aria-label="Paginasi" className="flex flex-wrap items-center gap-3 text-[13px] text-[#64748B]">
          <span className="tabular-nums">
            {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} dari {data.total} permohonan
          </span>
          <label className="flex items-center gap-1.5">
            Per halaman
            <select aria-label="Jumlah per halaman" value={list.pageSize} onChange={(event) => list.setPageSize(Number(event.target.value))} className={INPUT_CLASS}>
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <span className="flex-1" />
          <button type="button" disabled={data.page <= 1} onClick={() => list.setPage(data.page - 1)} className={cn(INPUT_CLASS, "font-medium disabled:opacity-40")}>
            Sebelumnya
          </button>
          <span className="tabular-nums">Halaman {data.page} / {data.pageCount}</span>
          <button type="button" disabled={data.page >= data.pageCount} onClick={() => list.setPage(data.page + 1)} className={cn(INPUT_CLASS, "font-medium disabled:opacity-40")}>
            Berikutnya
          </button>
        </nav>
      )}

      <CaseQuickDrawer row={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
