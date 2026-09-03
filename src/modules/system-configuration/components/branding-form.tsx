"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FileUploadField } from "@/components/form/file-upload-field";
import { useBranding, BRANDING_LOGO_URL, BRANDING_REPORT_LOGO_URL, type BrandingData } from "@/modules/branding/use-branding";

const TEXT_FIELDS: {
  key: keyof Omit<BrandingData, "logoPath" | "reportLogoPath" | "primaryColor" | "primaryColorForeground">;
  label: string;
  hint?: string;
}[] = [
  { key: "appName", label: "Nama Aplikasi", hint: "Tampil di tab browser dan halaman login." },
  { key: "appSubtitle", label: "Sub-judul Aplikasi", hint: "Tampil di bawah nama pada halaman login." },
  { key: "sidebarBrandTitle", label: "Nama di Sidebar", hint: "Judul singkat di sidebar admin & workspace perusahaan." },
  { key: "sidebarBrandSubtitle", label: "Sub-judul Sidebar Admin" },
];

export function BrandingForm() {
  const { data, isLoading, isError } = useBranding();

  if (isLoading) return <p className="text-[13px] text-muted-foreground">Memuat branding...</p>;
  if (isError || !data) return <p className="text-[13px] text-destructive">Gagal memuat pengaturan branding.</p>;

  return <BrandingFormBody branding={data} />;
}

/** Mounts only once `branding` is loaded, so `draft` can be lazily initialized from it directly — no effect-driven sync needed. */
function BrandingFormBody({ branding }: { branding: BrandingData }) {
  const queryClient = useQueryClient();
  const queryKey = ["system-configuration", "branding"];

  const [draft, setDraft] = useState<BrandingData>(branding);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const response = await fetch("/api/system-configuration/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan branding");
      return;
    }
    toast.success("Branding disimpan. Muat ulang halaman untuk melihat perubahan di seluruh aplikasi.");
    queryClient.invalidateQueries({ queryKey });
  }

  const isDirty = JSON.stringify(branding) !== JSON.stringify(draft);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <p className="text-[12.5px] text-[#8a7565]">
          Nama, logo, dan warna utama ini dipakai di halaman login serta sidebar admin dan workspace perusahaan. Modul workspace lain
          (Verifikator, Project Manager, Surveyor, dll) punya palet warna sendiri dan tidak ikut berubah dari sini.
        </p>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Logo</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">
          Kalau diisi, gambar ini menggantikan ikon default di sidebar dan halaman login.
        </p>
        {draft.logoPath ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRANDING_LOGO_URL} alt="Logo" className="size-16 rounded-lg border border-[#e8dccd] object-cover" />
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, logoPath: null }))}
              className="rounded-lg border border-[#e15241] px-3 py-1.5 text-[11.5px] font-semibold text-[#e15241]"
            >
              Hapus Logo
            </button>
          </div>
        ) : (
          <FileUploadField
            namespace="templates"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            label="Unggah Logo"
            onChange={(path) => setDraft((prev) => ({ ...prev, logoPath: path ?? null }))}
          />
        )}
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Logo Laporan</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">
          Logo letterhead yang dicetak di setiap halaman laporan (verifikasi dokumen, mesin, dll) — terpisah dari logo di atas, karena
          laporan sering dicetak/dibagikan di luar aplikasi. Kalau kosong, laporan pakai tanda &quot;IV&quot; bawaan.
        </p>
        {draft.reportLogoPath ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRANDING_REPORT_LOGO_URL} alt="Logo Laporan" className="h-16 w-auto max-w-40 rounded-lg border border-[#e8dccd] object-contain p-1.5" />
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, reportLogoPath: null }))}
              className="rounded-lg border border-[#e15241] px-3 py-1.5 text-[11.5px] font-semibold text-[#e15241]"
            >
              Hapus Logo Laporan
            </button>
          </div>
        ) : (
          <FileUploadField
            namespace="templates"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            label="Unggah Logo Laporan"
            onChange={(path) => setDraft((prev) => ({ ...prev, reportLogoPath: path ?? null }))}
          />
        )}
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Nama Aplikasi</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">Digunakan pada tab browser, halaman login, dan sidebar.</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {TEXT_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">{field.label}</div>
              <input
                type="text"
                value={draft[field.key]}
                onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
              />
              {field.hint && <p className="mt-1 text-[10.5px] text-[#a68f80]">{field.hint}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">Warna Tema</div>
        <p className="mb-3.5 text-[11.5px] text-[#a68f80]">Warna utama sidebar admin, tombol, dan halaman login.</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Warna Utama</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.primaryColor}
                onChange={(event) => setDraft((prev) => ({ ...prev, primaryColor: event.target.value }))}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-[#e8dccd] bg-white p-1"
              />
              <input
                type="text"
                value={draft.primaryColor}
                onChange={(event) => setDraft((prev) => ({ ...prev, primaryColor: event.target.value }))}
                className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Warna Teks di Atas Warna Utama</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.primaryColorForeground}
                onChange={(event) => setDraft((prev) => ({ ...prev, primaryColorForeground: event.target.value }))}
                className="size-10 shrink-0 cursor-pointer rounded-lg border border-[#e8dccd] bg-white p-1"
              />
              <input
                type="text"
                value={draft.primaryColorForeground}
                onChange={(event) => setDraft((prev) => ({ ...prev, primaryColorForeground: event.target.value }))}
                className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2.5">
        <button
          type="button"
          disabled={saving || !isDirty}
          onClick={() => setDraft(branding)}
          className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-50"
        >
          Batalkan Perubahan
        </button>
        <button
          type="button"
          disabled={saving || !isDirty}
          onClick={handleSave}
          className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan Branding"}
        </button>
      </div>
    </div>
  );
}
