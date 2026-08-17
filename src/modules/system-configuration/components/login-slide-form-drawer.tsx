"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";

import { FileUploadField } from "@/components/form/file-upload-field";
import { loginSlideImageHref, type AdminLoginSlide } from "../use-login-slides";
import { LOGIN_SLIDE_STATUS_LABELS, LOGIN_SLIDE_STATUSES } from "../login-slides";

type Draft = {
  imagePath: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  status: (typeof LOGIN_SLIDE_STATUSES)[number];
  startDate: string;
  endDate: string;
};

function toDraft(slide: AdminLoginSlide | null): Draft {
  if (!slide) {
    return { imagePath: "", label: "", title: "", description: "", ctaLabel: "", ctaUrl: "", status: "DRAFT", startDate: "", endDate: "" };
  }
  return {
    imagePath: slide.imagePath,
    label: slide.label,
    title: slide.title,
    description: slide.description,
    ctaLabel: slide.ctaLabel,
    ctaUrl: slide.ctaUrl,
    status: slide.status,
    startDate: slide.startDate ? slide.startDate.slice(0, 10) : "",
    endDate: slide.endDate ? slide.endDate.slice(0, 10) : "",
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

type Props = { slide: AdminLoginSlide | null; onClose: () => void };

export function LoginSlideFormDrawer({ slide, onClose }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(slide));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(slide);

  function set(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (!draft.imagePath) {
      toast.error("Gambar slide wajib diunggah");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }
    setSaving(true);
    const body = {
      imagePath: draft.imagePath,
      label: draft.label,
      title: draft.title,
      description: draft.description,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      status: draft.status,
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
    };
    const response = await fetch(
      isEditing ? `/api/system-configuration/login-slides/${slide!.id}` : "/api/system-configuration/login-slides",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      toast.error(errBody?.error ?? "Gagal menyimpan slide");
      return;
    }
    toast.success(isEditing ? "Slide diperbarui." : "Slide baru ditambahkan.");
    queryClient.invalidateQueries({ queryKey: ["system-configuration", "login-slides"] });
    onClose();
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-30 flex justify-end bg-[rgba(20,12,8,.5)]">
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0ded0] px-5 py-4">
          <div className="text-[14px] font-extrabold text-[#20180f]">{isEditing ? "Edit Slide" : "Tambah Slide"}</div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">
            <Field label="Gambar Slide *" hint="Disarankan 1600 × 900px. Format JPG, PNG, atau WEBP.">
              {draft.imagePath ? (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={loginSlideImageHref(draft.imagePath)}
                    alt="Preview"
                    className="aspect-video w-full rounded-lg border border-[#e8dccd] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => set({ imagePath: "" })}
                    className="w-fit rounded-lg border border-[#e15241] px-3 py-1.5 text-[11.5px] font-semibold text-[#e15241]"
                  >
                    Ganti Gambar
                  </button>
                </div>
              ) : (
                <FileUploadField namespace="templates" accept=".jpg,.jpeg,.png,.webp" label="Unggah Gambar" onChange={(path) => set({ imagePath: path ?? "" })} />
              )}
            </Field>

            <Field label="Judul *">
              <input type="text" value={draft.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} placeholder="Integrated Industrial Verification" />
            </Field>

            <Field label="Kategori / Label" hint="Teks kecil di atas judul, opsional.">
              <input type="text" value={draft.label} onChange={(e) => set({ label: e.target.value })} className={inputClass} placeholder="Verification Platform" />
            </Field>

            <Field label="Deskripsi">
              <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={inputClass} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Label CTA">
                <input type="text" value={draft.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} className={inputClass} placeholder="Learn More" />
              </Field>
              <Field label="URL CTA">
                <input type="text" value={draft.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} className={inputClass} placeholder="/about" />
              </Field>
            </div>

            <Field label="Status">
              <select value={draft.status} onChange={(e) => set({ status: e.target.value as Draft["status"] })} className={inputClass}>
                {LOGIN_SLIDE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LOGIN_SLIDE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Mulai Tampil" hint="Kosongkan untuk langsung aktif.">
                <input type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Berhenti Tampil" hint="Kosongkan untuk tanpa batas.">
                <input type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputClass} />
              </Field>
            </div>

            {draft.imagePath && (
              <div>
                <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Live Preview</div>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0a1420]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={loginSlideImageHref(draft.imagePath)} alt="" className="absolute inset-0 size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
                    {draft.label && (
                      <span className="w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">
                        {draft.label}
                      </span>
                    )}
                    <div className="text-[13px] font-semibold text-white">{draft.title || "Judul slide"}</div>
                    {draft.description && <div className="line-clamp-2 text-[10.5px] text-white/80">{draft.description}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-[#f0ded0] px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-50">
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
            {saving ? "Menyimpan..." : "Simpan Slide"}
          </button>
        </div>
      </div>
    </div>
  );
}
