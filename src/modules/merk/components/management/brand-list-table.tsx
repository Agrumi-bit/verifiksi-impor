"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/form/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "./expiry-status";
import { countryCodeToFlag } from "@/modules/master-data/country-flag";

export type BrandRow = {
  id: string;
  brandName: string;
  ownerTitle: string | null;
  companyName: string | null;
  countryOfOrigin: string;
  countryFlagCode?: string;
  trademarkClass: string | null;
  registrationNumber: string | null;
  status: string;
  completenessPercent: number;
  updatedAt: string;
};

export type SortKey = "brandName" | "ownerTitle" | "countryOfOrigin" | "status" | "completenessPercent" | "updatedAt";

export type ColVisibility = {
  owner: boolean; company: boolean; country: boolean; cls: boolean; tmNo: boolean; status: boolean; completeness: boolean; updated: boolean;
};
export const DEFAULT_COLS: ColVisibility = { owner: true, company: true, country: true, cls: true, tmNo: true, status: true, completeness: true, updated: true };

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Aktif", DRAFT: "Draft", INACTIVE: "Tidak Aktif" };

function completenessBarClass(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-destructive";
}
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
function colorFor(name: string): string {
  const palette = ["#2454d6", "#7c3aed", "#0d9488", "#c2410c", "#be123c", "#4d7c0f", "#0369a1", "#a21caf"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

type RowAction =
  | "detail" | "edit" | "duplicate" | "status" | "documents" | "activity"
  | "continueDraft" | "deleteDraft";

type Props = {
  rows: BrandRow[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  cols: ColVisibility;
  onColsChange: (next: ColVisibility) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  /** Resolved against the *full* filtered set, not just the current page —
   * a selection can span pages, and Export/bulk-status must act on all of
   * it, not only whichever rows happen to be visible right now. */
  selectedRows: BrandRow[];
  hasDraftSelected: boolean;
  onRowAction: (action: RowAction, row: BrandRow) => void;
  onExportCsv: (rows: BrandRow[]) => void;
  onBulkStatus: (ids: string[], nextActive: boolean) => void;
};

export function BrandListTable({
  rows, totalCount, isLoading, isError,
  sortKey, sortDir, onSort,
  cols, onColsChange,
  page, pageSize, onPageChange, onPageSizeChange,
  selected, onSelectedChange, selectedRows, hasDraftSelected, onRowAction, onExportCsv, onBulkStatus,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isColsOpen, setIsColsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    function onDocClick(){ setOpenMenuId(null); setIsColsOpen(false); setIsExportOpen(false); }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;
  const selectedIds = Array.from(selected);

  function toggleAll(checked: boolean) {
    const next = new Set(selected);
    rows.forEach((r) => { if (checked) next.add(r.id); else next.delete(r.id); });
    onSelectedChange(next);
  }
  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    onSelectedChange(next);
  }

  function openMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 200) });
    setOpenMenuId(openMenuId === id ? null : id);
  }

  const menuRow = rows.find((r) => r.id === openMenuId);

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return <span className="ml-1 text-[10px] text-muted-foreground/50">⇅</span>;
    return <span className="ml-1 text-[10px] text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Menampilkan <b className="text-foreground">{totalCount === 0 ? 0 : start + 1}–{Math.min(start + pageSize, totalCount)}</b> dari{" "}
          <b className="text-foreground">{totalCount}</b> merek
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setIsExportOpen((v) => !v); setIsColsOpen(false); }}>
              Export
            </Button>
            {isExportOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-border bg-background p-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="block w-full rounded-md px-3 py-1.5 text-left text-xs hover:bg-muted" onClick={() => { onExportCsv(selectedRows.length > 0 ? selectedRows : rows); setIsExportOpen(false); }}>
                  Export CSV
                </button>
                <button type="button" className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted" onClick={() => { toast.info("Export Excel belum tersedia — gunakan CSV."); setIsExportOpen(false); }}>
                  Export Excel
                </button>
                <button type="button" className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted" onClick={() => { toast.info("Export PDF belum tersedia — gunakan CSV."); setIsExportOpen(false); }}>
                  Export PDF
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setIsColsOpen((v) => !v); setIsExportOpen(false); }}>
              Atur Kolom
            </Button>
            {isColsOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-border bg-background p-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Tampilkan Kolom</p>
                {([
                  ["owner", "Pemilik"], ["company", "Perusahaan"], ["country", "Negara"], ["cls", "Kelas"],
                  ["tmNo", "Nomor Merek"], ["status", "Status"], ["completeness", "Kelengkapan"], ["updated", "Updated"],
                ] as [keyof ColVisibility, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
                    <input type="checkbox" checked={cols[key]} onChange={(e) => onColsChange({ ...cols, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-9">
                <input type="checkbox" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={(e) => toggleAll(e.target.checked)} />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("brandName")}>Merek{sortIndicator("brandName")}</TableHead>
              {cols.owner && <TableHead className="cursor-pointer select-none" onClick={() => onSort("ownerTitle")}>Pemilik Merek{sortIndicator("ownerTitle")}</TableHead>}
              {cols.company && <TableHead>Perusahaan</TableHead>}
              {cols.country && <TableHead className="cursor-pointer select-none" onClick={() => onSort("countryOfOrigin")}>Negara{sortIndicator("countryOfOrigin")}</TableHead>}
              {cols.cls && <TableHead>Kelas</TableHead>}
              {cols.tmNo && <TableHead>No. Sertifikat / Pendaftaran</TableHead>}
              {cols.status && <TableHead className="cursor-pointer select-none" onClick={() => onSort("status")}>Status{sortIndicator("status")}</TableHead>}
              {cols.completeness && <TableHead className="cursor-pointer select-none" onClick={() => onSort("completenessPercent")}>Kelengkapan{sortIndicator("completenessPercent")}</TableHead>}
              {cols.updated && <TableHead className="cursor-pointer select-none" onClick={() => onSort("updatedAt")}>Diperbarui{sortIndicator("updatedAt")}</TableHead>}
              <TableHead className="w-11 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Memuat...</TableCell></TableRow>
            )}
            {isError && (
              <TableRow><TableCell colSpan={11} className="text-center text-destructive">Gagal memuat data merek.</TableCell></TableRow>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center">
                  <p className="mb-1 text-sm font-semibold">Tidak ada merek ditemukan</p>
                  <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau filter pencarian.</p>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const isDraft = row.status === "DRAFT";
              const flag = countryCodeToFlag(row.countryFlagCode);
              return (
                <TableRow
                  key={row.id}
                  className={selected.has(row.id) ? "bg-primary/5" : undefined}
                  onClick={() => onRowAction("detail", row)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(row.id)} onChange={(e) => toggleOne(row.id, e.target.checked)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white" style={{ background: colorFor(row.brandName) }}>
                        {initials(row.brandName)}
                      </span>
                      <span className="font-semibold">{row.brandName}</span>
                    </div>
                  </TableCell>
                  {cols.owner && <TableCell>{row.ownerTitle || "—"}</TableCell>}
                  {cols.company && <TableCell className="text-muted-foreground">{row.companyName || "—"}</TableCell>}
                  {cols.country && (
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {flag && <span>{flag}</span>}
                        {row.countryOfOrigin}
                      </span>
                    </TableCell>
                  )}
                  {cols.cls && <TableCell>{row.trademarkClass || "—"}</TableCell>}
                  {cols.tmNo && <TableCell className="font-mono text-xs text-muted-foreground">{row.registrationNumber || "—"}</TableCell>}
                  {cols.status && (
                    <TableCell>
                      <Badge variant={row.status === "ACTIVE" ? "default" : isDraft ? "outline" : "secondary"}>{STATUS_LABEL[row.status] ?? row.status}</Badge>
                    </TableCell>
                  )}
                  {cols.completeness && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${completenessBarClass(row.completenessPercent)}`} style={{ width: `${row.completenessPercent}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{row.completenessPercent}%</span>
                      </div>
                    </TableCell>
                  )}
                  {cols.updated && <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.updatedAt)}</TableCell>}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={(e) => openMenu(e, row.id)}>
                      ⋮
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-t border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-xs font-bold text-primary">{selected.size} merek dipilih</span>
          {hasDraftSelected && <span className="text-[11px] text-muted-foreground">Draft dikecualikan dari Ubah Status / Deactivate massal.</span>}
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => onExportCsv(selectedRows)}>Export</Button>
          <Button size="sm" variant="outline" disabled={hasDraftSelected} onClick={() => onBulkStatus(selectedIds, true)}>Ubah Status</Button>
          <Button size="sm" variant="outline" className="text-destructive" disabled={hasDraftSelected} onClick={() => onBulkStatus(selectedIds, false)}>Deactivate</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Tampilkan
          <NativeSelect className="w-auto" value={String(pageSize)} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </NativeSelect>
          data per halaman
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
              ) : (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="min-w-8" onClick={() => onPageChange(p)}>{p}</Button>
              ),
            )}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      </div>

      {openMenuId && menuRow && menuPos && (
        <div
          className="fixed z-50 w-52 rounded-lg border border-border bg-background p-1 shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {menuRow.status === "DRAFT" ? (
            <>
              <MenuItem label="Lanjutkan Pengisian" onClick={() => { onRowAction("continueDraft", menuRow); setOpenMenuId(null); }} />
              <MenuItem label="Lihat Detail" onClick={() => { onRowAction("detail", menuRow); setOpenMenuId(null); }} />
              <div className="my-1 h-px bg-border" />
              <MenuItem label="Hapus Draft" danger disabled title="Belum didukung backend" onClick={() => { toast.info("Hapus draft belum tersedia."); setOpenMenuId(null); }} />
            </>
          ) : (
            <>
              <MenuItem label="Lihat Detail" onClick={() => { onRowAction("detail", menuRow); setOpenMenuId(null); }} />
              <MenuItem label="Edit" onClick={() => { onRowAction("edit", menuRow); setOpenMenuId(null); }} />
              <MenuItem label="Duplikasi / Gunakan sebagai Referensi" disabled title="Belum tersedia" onClick={() => { toast.info("Fitur duplikasi merek belum tersedia."); setOpenMenuId(null); }} />
              <MenuItem label="Ubah Status" onClick={() => { onRowAction("status", menuRow); setOpenMenuId(null); }} />
              <MenuItem label="Lihat Dokumen" onClick={() => { onRowAction("documents", menuRow); setOpenMenuId(null); }} />
              <MenuItem label="Riwayat Aktivitas" onClick={() => { onRowAction("activity", menuRow); setOpenMenuId(null); }} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function MenuItem({ label, onClick, danger, disabled, title }: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`block w-full rounded-md px-3 py-1.5 text-left text-xs disabled:opacity-45 disabled:cursor-not-allowed hover:bg-muted ${danger ? "text-destructive" : "text-foreground"}`}
    >
      {label}
    </button>
  );
}
