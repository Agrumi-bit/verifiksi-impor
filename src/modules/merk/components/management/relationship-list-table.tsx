"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/form/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MERK_AGREEMENT_TYPE_LABELS, type MerkAgreementType } from "@/modules/merk/schema";
import { formatDate } from "./expiry-status";
import type { RelationshipBucket } from "@/app/api/merk/relationships/route";

export type RelationshipRow = {
  brandId: string;
  brandName: string;
  ownerName: string | null;
  ownerCountry: string | null;
  officialRepresentativeName: string | null;
  companyImporterName: string | null;
  relationshipBucket: RelationshipBucket;
  agreementType: string | null;
  agreementStartDate: string | null;
  agreementEndDate: string | null;
  appointmentStartDate: string | null;
  appointmentEndDate: string | null;
  completenessPercent: number;
  status: "Aktif" | "Tidak Aktif" | "Tidak Lengkap";
};

export type SortKey = "brandName" | "ownerName" | "ownerCountry" | "completenessPercent" | "status";

export type ColVisibility = {
  country: boolean; rep: boolean; company: boolean; agreement: boolean; validity: boolean; completeness: boolean; status: boolean;
};
export const DEFAULT_REL_COLS: ColVisibility = { country: true, rep: true, company: true, agreement: true, validity: true, completeness: true, status: true };

const BUCKET_META: Record<RelationshipBucket, { badge: string; label: string }> = {
  pemilik_merek: { badge: "bg-primary/10 text-primary", label: "Pemilik Merek" },
  company_pemilik: { badge: "bg-teal-500/10 text-teal-700 dark:text-teal-400", label: "Company sebagai Pemilik" },
  apiu_perwakilan: { badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400", label: "Perwakilan Resmi (API-U)" },
  perwakilan_lain: { badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400", label: "Perwakilan Resmi (Lain)" },
  importir_ditunjuk: { badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400", label: "Importir Ditunjuk" },
};

function completenessBarClass(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-destructive";
}
function initials(name: string): string { return name.slice(0, 2).toUpperCase(); }
function colorFor(name: string): string {
  const palette = ["#2454d6", "#7c3aed", "#0d9488", "#c2410c", "#be123c", "#4d7c0f", "#0369a1", "#a21caf"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
function validityRange(row: RelationshipRow): string {
  const start = row.agreementStartDate ?? row.appointmentStartDate;
  const end = row.agreementEndDate ?? row.appointmentEndDate;
  if (!start && !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

type RowAction = "detail" | "edit" | "brand" | "owner" | "rep" | "docs" | "history" | "complete";

type Props = {
  rows: RelationshipRow[];
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
  onRowAction: (action: RowAction, row: RelationshipRow) => void;
  onExportCsv: (rows: RelationshipRow[]) => void;
};

export function RelationshipListTable({
  rows, totalCount, isLoading, isError,
  sortKey, sortDir, onSort,
  cols, onColsChange,
  page, pageSize, onPageChange, onPageSizeChange,
  onRowAction, onExportCsv,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return <span className="ml-1 text-[10px] text-muted-foreground/50">⇅</span>;
    return <span className="ml-1 text-[10px] text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <section className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Menampilkan <b className="text-foreground">{totalCount === 0 ? 0 : start + 1}–{Math.min(start + pageSize, totalCount)}</b> dari{" "}
          <b className="text-foreground">{totalCount}</b> hubungan
        </p>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>Export</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExportCsv(rows)}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Export Excel belum tersedia — gunakan CSV.")}>Export Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Export PDF belum tersedia — gunakan CSV.")}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>Atur Kolom</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
              {([
                ["country", "Negara"], ["rep", "Perwakilan Resmi"], ["company", "Company / Importir"],
                ["agreement", "Perjanjian"], ["validity", "Masa Berlaku"], ["completeness", "Kelengkapan"], ["status", "Status"],
              ] as [keyof ColVisibility, string][]).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={cols[key]}
                  onCheckedChange={(checked) => onColsChange({ ...cols, [key]: checked })}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("brandName")}>Merek{sortIndicator("brandName")}</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => onSort("ownerName")}>Pemilik Merek{sortIndicator("ownerName")}</TableHead>
              {cols.country && <TableHead className="cursor-pointer select-none" onClick={() => onSort("ownerCountry")}>Negara Pemilik{sortIndicator("ownerCountry")}</TableHead>}
              <TableHead>Jenis Hubungan</TableHead>
              {cols.rep && <TableHead>Perwakilan Resmi</TableHead>}
              {cols.company && <TableHead>Company / Importir</TableHead>}
              {cols.agreement && <TableHead>Perjanjian</TableHead>}
              {cols.validity && <TableHead>Masa Berlaku</TableHead>}
              {cols.completeness && <TableHead className="cursor-pointer select-none" onClick={() => onSort("completenessPercent")}>Kelengkapan{sortIndicator("completenessPercent")}</TableHead>}
              {cols.status && <TableHead className="cursor-pointer select-none" onClick={() => onSort("status")}>Status{sortIndicator("status")}</TableHead>}
              <TableHead className="w-11 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Memuat...</TableCell></TableRow>}
            {isError && <TableRow><TableCell colSpan={11} className="text-center text-destructive">Gagal memuat data hubungan.</TableCell></TableRow>}
            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center">
                  <p className="mb-1 text-sm font-semibold">Tidak ada hubungan ditemukan</p>
                  <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau filter.</p>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const meta = BUCKET_META[row.relationshipBucket];
              return (
                <TableRow key={row.brandId} onClick={() => onRowAction("detail", row)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white" style={{ background: colorFor(row.brandName) }}>
                        {initials(row.brandName)}
                      </span>
                      <span className="font-semibold">{row.brandName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.ownerName || "—"}</TableCell>
                  {cols.country && <TableCell>{row.ownerCountry || "—"}</TableCell>}
                  <TableCell><span className={`inline-flex h-[21px] items-center rounded-full px-2.5 text-[10.8px] font-bold ${meta.badge}`}>{meta.label}</span></TableCell>
                  {cols.rep && <TableCell className="text-muted-foreground">{row.officialRepresentativeName || "—"}</TableCell>}
                  {cols.company && <TableCell className="text-muted-foreground">{row.companyImporterName || "—"}</TableCell>}
                  {cols.agreement && (
                    <TableCell>{row.agreementType ? MERK_AGREEMENT_TYPE_LABELS[row.agreementType.toLowerCase() as MerkAgreementType] : "—"}</TableCell>
                  )}
                  {cols.validity && <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{validityRange(row)}</TableCell>}
                  {cols.completeness && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${completenessBarClass(row.completenessPercent)}`} style={{ width: `${row.completenessPercent}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{row.completenessPercent}%</span>
                        {row.completenessPercent < 100 && <span className="text-amber-600" title="Kelengkapan belum 100%">⚠</span>}
                      </div>
                    </TableCell>
                  )}
                  {cols.status && (
                    <TableCell>
                      <Badge variant={row.status === "Aktif" ? "default" : row.status === "Tidak Aktif" ? "secondary" : "outline"}>{row.status}</Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                        aria-label="Menu hubungan"
                      >
                        ⋮
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRowAction("detail", row)}>Lihat Detail</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRowAction("edit", row)}>Edit Hubungan</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRowAction("brand", row)}>Lihat Merek</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRowAction("owner", row)}>Lihat Pemilik</DropdownMenuItem>
                        {row.officialRepresentativeName && (
                          <DropdownMenuItem onClick={() => onRowAction("rep", row)}>Lihat Perwakilan Resmi</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onRowAction("docs", row)}>Lihat Dokumen</DropdownMenuItem>
                        <DropdownMenuItem disabled title="Belum tersedia" onClick={() => toast.info("Belum ada sistem pencatatan riwayat perubahan.")}>
                          Riwayat Perubahan
                        </DropdownMenuItem>
                        {row.completenessPercent < 100 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onRowAction("complete", row)}>Lengkapi Data</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Tampilkan
          <NativeSelect className="w-auto" value={String(pageSize)} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
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
    </section>
  );
}
