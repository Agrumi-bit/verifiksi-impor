"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form/native-select";
import { MERK_EVIDENCE_TYPES, MERK_EVIDENCE_TYPE_LABELS, type MerkEvidenceType } from "@/modules/merk/schema";

export type CompletenessFilter = "all" | "100" | "50-99" | "lt50";
export type QtFilter = "all" | "lengkap" | "belum_ada" | "akan_kedaluwarsa";

export type AdvancedFilters = {
  completeness: CompletenessFilter;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  docExpired: boolean;
  docExpiring: boolean;
  qt: QtFilter;
};

export const EMPTY_ADVANCED: AdvancedFilters = {
  completeness: "all",
  createdFrom: "",
  createdTo: "",
  updatedFrom: "",
  updatedTo: "",
  docExpired: false,
  docExpiring: false,
  qt: "all",
};

export type BrandFilters = {
  search: string;
  status: "all" | "ACTIVE" | "DRAFT" | "INACTIVE";
  country: string;
  evidenceType: "all" | MerkEvidenceType;
  trademarkClass: string;
  company: string;
  advanced: AdvancedFilters;
};

export const EMPTY_FILTERS: BrandFilters = {
  search: "",
  status: "all",
  country: "all",
  evidenceType: "all",
  trademarkClass: "all",
  company: "all",
  advanced: EMPTY_ADVANCED,
};

const COMPLETENESS_LABEL: Record<CompletenessFilter, string> = {
  all: "",
  "100": "100% (Lengkap)",
  "50-99": "50% – 99%",
  lt50: "Di bawah 50%",
};
const QT_LABEL: Record<QtFilter, string> = { all: "", lengkap: "Lengkap", belum_ada: "Belum Ada", akan_kedaluwarsa: "Akan Kedaluwarsa" };
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Aktif", DRAFT: "Draft", INACTIVE: "Tidak Aktif" };

type Props = {
  filters: BrandFilters;
  onChange: (next: BrandFilters) => void;
  countries: string[];
  companies: string[];
  classes: string[];
};

/** Search + filter bar for "Semua Merek" — active selections render as
 * removable chips underneath, matching the reviewed UI prototype. */
export function BrandListFilters({ filters, onChange, countries, companies, classes }: Props) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [draftAdvanced, setDraftAdvanced] = useState<AdvancedFilters>(filters.advanced);

  function set<K extends keyof BrandFilters>(key: K, value: BrandFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function removeChip(key: string) {
    if (key === "search") set("search", "");
    else if (key === "status") set("status", "all");
    else if (key === "country") set("country", "all");
    else if (key === "evidenceType") set("evidenceType", "all");
    else if (key === "trademarkClass") set("trademarkClass", "all");
    else if (key === "company") set("company", "all");
    else if (key.startsWith("adv_")) {
      const advKey = key.slice(4) as keyof AdvancedFilters;
      const nextAdvanced = { ...filters.advanced, [advKey]: EMPTY_ADVANCED[advKey] };
      if (advKey === "createdFrom" || advKey === "createdTo") {
        nextAdvanced.createdFrom = "";
        nextAdvanced.createdTo = "";
      }
      if (advKey === "updatedFrom" || advKey === "updatedTo") {
        nextAdvanced.updatedFrom = "";
        nextAdvanced.updatedTo = "";
      }
      onChange({ ...filters, advanced: nextAdvanced });
    }
  }

  const chips: { key: string; label: string }[] = [];
  if (filters.search.trim()) chips.push({ key: "search", label: `Cari: "${filters.search}"` });
  if (filters.status !== "all") chips.push({ key: "status", label: `Status: ${STATUS_LABEL[filters.status]}` });
  if (filters.country !== "all") chips.push({ key: "country", label: `Negara: ${filters.country}` });
  if (filters.evidenceType !== "all") chips.push({ key: "evidenceType", label: `Bukti: ${MERK_EVIDENCE_TYPE_LABELS[filters.evidenceType]}` });
  if (filters.trademarkClass !== "all") chips.push({ key: "trademarkClass", label: `Kelas: ${filters.trademarkClass}` });
  if (filters.company !== "all") chips.push({ key: "company", label: `Perusahaan: ${filters.company}` });
  const a = filters.advanced;
  if (a.completeness !== "all") chips.push({ key: "adv_completeness", label: `Kelengkapan: ${COMPLETENESS_LABEL[a.completeness]}` });
  if (a.createdFrom || a.createdTo) chips.push({ key: "adv_createdFrom", label: `Dibuat: ${a.createdFrom || "…"} – ${a.createdTo || "…"}` });
  if (a.updatedFrom || a.updatedTo) chips.push({ key: "adv_updatedFrom", label: `Diperbarui: ${a.updatedFrom || "…"} – ${a.updatedTo || "…"}` });
  if (a.docExpired) chips.push({ key: "adv_docExpired", label: "Dokumen Expired" });
  if (a.docExpiring) chips.push({ key: "adv_docExpiring", label: "Dokumen Akan Kedaluwarsa" });
  if (a.qt !== "all") chips.push({ key: "adv_qt", label: `Quality Test: ${QT_LABEL[a.qt]}` });

  function openAdvanced() {
    setDraftAdvanced(filters.advanced);
    setIsAdvancedOpen(true);
  }
  function applyAdvanced() {
    onChange({ ...filters, advanced: draftAdvanced });
    setIsAdvancedOpen(false);
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Input
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Cari nama merek, pemilik, nomor sertifikat..."
            className="h-9"
          />
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Reset Filter
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <NativeSelect className="w-auto" value={filters.status} onChange={(e) => set("status", e.target.value as BrandFilters["status"])}>
          <option value="all">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Tidak Aktif</option>
        </NativeSelect>
        <NativeSelect className="w-auto" value={filters.country} onChange={(e) => set("country", e.target.value)}>
          <option value="all">Semua Negara Pemilik</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="w-auto" value={filters.evidenceType} onChange={(e) => set("evidenceType", e.target.value as BrandFilters["evidenceType"])}>
          <option value="all">Semua Jenis Bukti</option>
          {MERK_EVIDENCE_TYPES.map((v) => (
            <option key={v} value={v}>{MERK_EVIDENCE_TYPE_LABELS[v]}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="w-auto" value={filters.trademarkClass} onChange={(e) => set("trademarkClass", e.target.value)}>
          <option value="all">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c} value={c}>Kelas {c}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="w-auto" value={filters.company} onChange={(e) => set("company", e.target.value)}>
          <option value="all">Semua Perusahaan</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </NativeSelect>

        <div className="relative">
          <Button variant="outline" size="sm" onClick={openAdvanced}>Filter Lainnya ▾</Button>
          {isAdvancedOpen && (
            <>
              <button type="button" className="fixed inset-0 z-40" aria-label="Tutup" onClick={() => setIsAdvancedOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-background p-4 shadow-lg">
                <p className="mb-3 text-sm font-semibold">Filter Lainnya</p>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Kelengkapan Data</label>
                  <NativeSelect
                    className="w-full"
                    value={draftAdvanced.completeness}
                    onChange={(e) => setDraftAdvanced({ ...draftAdvanced, completeness: e.target.value as CompletenessFilter })}
                  >
                    <option value="all">Semua</option>
                    <option value="100">100% (Lengkap)</option>
                    <option value="50-99">50% – 99%</option>
                    <option value="lt50">Di bawah 50%</option>
                  </NativeSelect>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tanggal Dibuat</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs" value={draftAdvanced.createdFrom} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, createdFrom: e.target.value })} />
                    <input type="date" className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs" value={draftAdvanced.createdTo} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, createdTo: e.target.value })} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tanggal Diperbarui</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs" value={draftAdvanced.updatedFrom} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, updatedFrom: e.target.value })} />
                    <input type="date" className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs" value={draftAdvanced.updatedTo} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, updatedTo: e.target.value })} />
                  </div>
                </div>

                <label className="mb-2 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={draftAdvanced.docExpired} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, docExpired: e.target.checked })} />
                  Dokumen Expired
                </label>
                <label className="mb-3 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={draftAdvanced.docExpiring} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, docExpiring: e.target.checked })} />
                  Dokumen Akan Kedaluwarsa
                </label>

                <div className="mb-1">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Quality Test Status</label>
                  <NativeSelect className="w-full" value={draftAdvanced.qt} onChange={(e) => setDraftAdvanced({ ...draftAdvanced, qt: e.target.value as QtFilter })}>
                    <option value="all">Semua</option>
                    <option value="lengkap">Lengkap</option>
                    <option value="belum_ada">Belum Ada</option>
                    <option value="akan_kedaluwarsa">Akan Kedaluwarsa</option>
                  </NativeSelect>
                </div>

                <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" onClick={() => setDraftAdvanced(EMPTY_ADVANCED)}>Reset</Button>
                  <Button size="sm" onClick={applyAdvanced}>Terapkan</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-border pt-3">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/10 pl-2.5 pr-1 text-[11.5px] font-semibold text-primary">
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="flex size-3.5 items-center justify-center rounded-full bg-primary/15 text-[9px] hover:bg-primary/25"
                aria-label={`Hapus filter ${chip.label}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
