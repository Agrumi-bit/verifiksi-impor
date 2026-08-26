"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

type RegionRow = {
  id: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  postalCode: string;
};

type Draft = {
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  postalCode: string;
};

function toDraft(row: RegionRow | null): Draft {
  if (!row) return { provinceName: "", cityName: "", districtName: "", subdistrictName: "", postalCode: "" };
  return {
    provinceName: row.provinceName,
    cityName: row.cityName,
    districtName: row.districtName,
    subdistrictName: row.subdistrictName,
    postalCode: row.postalCode,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">{label}</div>
      {children}
      {hint && <p className="mt-1 text-[10.5px] text-[#a68f80]">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none";

type Props = { row: RegionRow | null; onClose: () => void };

export function RegionDataFormDrawer({ row, onClose }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(row));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(row);

  function set(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!draft.provinceName.trim() || !draft.cityName.trim() || !draft.districtName.trim() || !draft.subdistrictName.trim() || !draft.postalCode.trim()) {
      toast.error("Semua kolom wajib diisi");
      return;
    }
    setSaving(true);
    const response = await fetch(
      isEditing ? `/api/system-configuration/regions/${row!.id}` : "/api/system-configuration/regions",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
    );
    setSaving(false);
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      toast.error(errBody?.error ?? "Gagal menyimpan data");
      return;
    }
    toast.success(isEditing ? "Data wilayah diperbarui." : "Data wilayah baru ditambahkan.");
    queryClient.invalidateQueries({ queryKey: ["system-configuration", "regions"] });
    onClose();
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-30 flex justify-end bg-[rgba(20,12,8,.5)]">
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ded0] px-5 py-4">
          <div className="text-[14px] font-extrabold text-[#20180f]">{isEditing ? "Edit Data Wilayah" : "Tambah Data Wilayah"}</div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">
            <Field label="Provinsi *" hint={isEditing ? "Mengubah nama ini akan memperbarui semua baris dengan provinsi yang sama." : undefined}>
              <input className={inputClass} value={draft.provinceName} onChange={(e) => set({ provinceName: e.target.value })} placeholder="Contoh: Jawa Barat" />
            </Field>
            <Field label="Kota / Kabupaten *" hint={isEditing ? "Mengubah nama ini akan memperbarui semua baris dengan kota/kabupaten yang sama." : undefined}>
              <input className={inputClass} value={draft.cityName} onChange={(e) => set({ cityName: e.target.value })} placeholder="Contoh: Bandung" />
            </Field>
            <Field label="Kecamatan *" hint={isEditing ? "Mengubah nama ini akan memperbarui semua baris dengan kecamatan yang sama." : undefined}>
              <input className={inputClass} value={draft.districtName} onChange={(e) => set({ districtName: e.target.value })} placeholder="Contoh: Cibeunying Kaler" />
            </Field>
            <Field label="Desa / Kelurahan *" hint={isEditing ? "Mengubah nama ini akan memperbarui semua baris dengan desa/kelurahan yang sama." : undefined}>
              <input className={inputClass} value={draft.subdistrictName} onChange={(e) => set({ subdistrictName: e.target.value })} placeholder="Contoh: Sukaluyu" />
            </Field>
            <Field label="Kode Pos *">
              <input className={inputClass} value={draft.postalCode} onChange={(e) => set({ postalCode: e.target.value })} placeholder="Contoh: 40122" />
            </Field>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#f0ded0] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#261813]">
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-[#e0662e] px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
