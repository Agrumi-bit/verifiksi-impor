"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BrandOption = { id: string; brandName: string; brandOwnerName: string; trademarkClass: string | null; status: string };

type Props = {
  onClose: () => void;
  onSelectBrand: (brandId: string) => void;
};

/** "Tambah Hubungan" — a relationship is always the ownership/representation
 * record on an existing Brand (`MerkOwnership`), never a standalone object,
 * so this drawer's only real job is picking that Brand and handing off to
 * the actual wizard's Step 2 (via `MerkWizard`'s resume mechanism) instead
 * of re-implementing a parallel entity-picker flow. */
export function AddRelationshipDrawer({ onClose, onSelectBrand }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BrandOption | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["merk-surface", "/api/merk"],
    queryFn: async () => {
      const response = await fetch("/api/merk");
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: BrandOption[] };
      return json.data;
    },
  });

  const results = (data ?? []).filter((b) => !search.trim() || b.brandName.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className="relative z-10 flex h-full w-full max-w-[440px] flex-col bg-background shadow-2xl">
        <div className="flex flex-none items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Tambah Hubungan Merek</h2>
            <p className="text-xs text-muted-foreground">Referensi Brand Master yang sudah ada</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cari Merek (Brand Master)</p>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama merek..." className="mb-3" />

          {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {!isLoading && results.length === 0 && <p className="text-sm text-muted-foreground">Merek tidak ditemukan.</p>}

          <div className="flex flex-col gap-2">
            {results.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left ${
                  selected?.id === b.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{b.brandName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.brandOwnerName} · Kelas {b.trademarkClass || "—"}
                  </p>
                </div>
                <Badge variant={b.status === "ACTIVE" ? "default" : b.status === "DRAFT" ? "outline" : "secondary"}>{b.status}</Badge>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Melanjutkan akan membuka Wizard Kepemilikan &amp; Perwakilan (Step 2) merek terpilih — hubungan tidak dapat dibuat lepas dari
            merek yang sudah ada, dan tidak membuat data Pemilik/Perusahaan baru di luar registri yang sudah ada.
          </p>
        </div>

        <div className="flex flex-none items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button size="sm" disabled={!selected} onClick={() => selected && onSelectBrand(selected.id)}>
            Lanjutkan ke Kepemilikan &amp; Perwakilan
          </Button>
        </div>
      </aside>
    </div>
  );
}
