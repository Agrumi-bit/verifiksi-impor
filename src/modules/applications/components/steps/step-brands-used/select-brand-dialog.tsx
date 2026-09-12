"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplicationBrandOptions, type ApplicationBrandOption } from "../../../hooks/use-application-brand-options";
import { MERK_EVIDENCE_TYPE_LABELS } from "@/modules/merk/schema";

type Props = {
  companyId: string | undefined;
  /** brandIds already added to this application — shown as "Sudah Dipilih", disabled. */
  selectedBrandIds: Set<string>;
  onClose: () => void;
  onSelect: (brand: ApplicationBrandOption) => void;
};

const EVIDENCE_FILTER_OPTIONS = Object.entries(MERK_EVIDENCE_TYPE_LABELS);

function eligibility(brand: ApplicationBrandOption, isSelected: boolean): { disabled: boolean; note?: string } {
  if (isSelected) return { disabled: true, note: "Sudah Dipilih" };
  if (brand.status === "DRAFT") return { disabled: true, note: "Merek masih berstatus Draft." };
  if (brand.status === "INACTIVE") return { disabled: true, note: "Merek tidak aktif dan tidak dapat digunakan." };
  return { disabled: false };
}

/** "Pilih Merek" — search + filter over the applying company's own Brand
 * Master, reusing the same drawer pattern as
 * modules/merk/components/management/add-relationship-drawer.tsx. Only
 * ACTIVE, not-yet-selected Brands are actually selectable; DRAFT/INACTIVE/
 * already-selected rows stay visible but disabled per spec, so the user
 * understands why a Brand they expected to see can't be picked instead of
 * it silently vanishing from the list. */
export function SelectBrandDialog({ companyId, selectedBrandIds, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [evidenceFilter, setEvidenceFilter] = useState<string>("");

  const { data, isLoading, isError } = useApplicationBrandOptions(companyId);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((brand) => {
      if (statusFilter && brand.status !== statusFilter) return false;
      if (evidenceFilter && brand.evidenceType !== evidenceFilter) return false;
      if (!q) return true;
      return (
        brand.brandName.toLowerCase().includes(q) ||
        (brand.ownerTitle ?? "").toLowerCase().includes(q) ||
        (brand.registrationNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter, evidenceFilter]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label="Pilih Merek" className="relative z-10 flex h-full w-full max-w-[560px] flex-col bg-background shadow-2xl">
        <div className="flex flex-none items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Pilih Merek</h2>
            <p className="text-xs text-muted-foreground">Referensi Brand Master milik perusahaan Anda</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-none flex-col gap-2.5 border-b border-border px-5 py-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama merek, pemilik, atau nomor merek..."
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v && v !== "ALL" ? v : "")}>
              <SelectTrigger className="w-full"><SelectValue>{() => (statusFilter ? statusFilter : "Semua Status")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={evidenceFilter || "ALL"} onValueChange={(v) => setEvidenceFilter(v && v !== "ALL" ? v : "")}>
              <SelectTrigger className="w-full"><SelectValue>{() => (evidenceFilter ? MERK_EVIDENCE_TYPE_LABELS[evidenceFilter as keyof typeof MERK_EVIDENCE_TYPE_LABELS] : "Semua Jenis Bukti")}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Jenis Bukti</SelectItem>
                {EVIDENCE_FILTER_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && <p className="text-sm text-muted-foreground">Memuat data merek...</p>}
          {isError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              Gagal memuat data merek. Pastikan database sudah terhubung.
            </p>
          )}
          {!isLoading && !isError && results.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {(data ?? []).length === 0
                ? "Belum ada merek terdaftar di Brand Management. Gunakan “+ Tambah Merek Baru” untuk mendaftarkan merek terlebih dahulu."
                : "Tidak ada merek yang cocok dengan pencarian/filter."}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {results.map((brand) => {
              const isSelected = selectedBrandIds.has(brand.id);
              const { disabled, note } = eligibility(brand, isSelected);
              return (
                <button
                  key={brand.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(brand)}
                  className="flex flex-col gap-1.5 rounded-lg border border-border p-3.5 text-left enabled:hover:border-primary enabled:hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold">{brand.brandName}</p>
                    <span
                      className={
                        brand.status === "ACTIVE"
                          ? "shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                          : brand.status === "DRAFT"
                            ? "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                            : "shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
                      }
                    >
                      {brand.status === "ACTIVE" ? "Aktif" : brand.status === "DRAFT" ? "Draft" : "Tidak Aktif"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{brand.ownerTitle || "Pemilik belum diisi"}</span>
                    <span>{brand.countryOfOrigin}</span>
                    <span>{brand.evidenceType ? MERK_EVIDENCE_TYPE_LABELS[brand.evidenceType as keyof typeof MERK_EVIDENCE_TYPE_LABELS] : "Bukti belum diisi"}</span>
                    {brand.registrationNumber && <span className="font-mono">{brand.registrationNumber}</span>}
                    <span>Kelengkapan {brand.completenessPercent}%</span>
                  </div>
                  {note && <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{note}</p>}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
