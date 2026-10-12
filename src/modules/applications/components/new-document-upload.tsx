"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { DocumentDataFieldValue } from "../document-data-fields";

/**
 * "Upload New Document" in every Version History modal (Verifikator, CR, Perusahaan). A document
 * that carries data (Nomor/Tanggal/Instansi — see document-data-fields.ts) asks for that data again
 * before the new version is saved, prefilled with the current values; others save right away.
 */
export function useNewDocumentUpload({
  endpoint,
  fields,
  onSaved,
}: {
  endpoint: string;
  fields: readonly DocumentDataFieldValue[];
  onSaved: () => Promise<void> | void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [pending, setPending] = useState<{ path: string; fileName: string } | null>(null);

  async function save(path: string, data?: Record<string, string>): Promise<boolean> {
    setIsUploading(true);
    try {
      const saveRes = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data ? { path, data } : { path }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan dokumen baru");
      }
      toast.success("Dokumen baru berhasil diunggah.");
      await onSaved();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah dokumen baru");
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    let path: string;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "temporary");
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Gagal mengunggah file");
      path = ((await uploadRes.json()) as { path: string }).path;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah dokumen baru");
      setIsUploading(false);
      return;
    }
    setIsUploading(false);
    if (fields.length > 0) {
      setPending({ path, fileName: file.name });
      return;
    }
    await save(path);
  }

  async function submit(values: Record<string, string>) {
    if (!pending) return;
    if (await save(pending.path, values)) setPending(null);
  }

  return { isUploading, pending, handleUpload, submit, cancel: () => setPending(null) };
}

export function NewDocumentDataForm({
  fields,
  fileName,
  saving,
  onCancel,
  onSubmit,
}: {
  fields: readonly DocumentDataFieldValue[];
  fileName: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const missing = fields.filter((f) => f.required && !values[f.name]?.trim());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(20,12,8,.45)] p-5" onClick={(event) => event.stopPropagation()}>
      <form
        className="flex w-[440px] max-w-[92vw] flex-col gap-3.5 rounded-xl bg-white p-5.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (missing.length === 0) onSubmit(values);
        }}
      >
        <div>
          <div className="text-[16px] font-extrabold text-[#20180f]">Data Dokumen Baru</div>
          <div className="mt-0.75 text-[12px] text-[#8a7565]">
            Sesuaikan data dengan dokumen yang baru diunggah: <span className="font-semibold text-[#4a4038]">{fileName}</span>
          </div>
        </div>
        {fields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1">
            <span className="text-[11.5px] font-semibold text-[#4a4038]">
              {field.label}
              {field.required && <span className="text-[#c1361f]"> *</span>}
            </span>
            <input
              type={field.type}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
              className="rounded-lg border border-[#e1bfb3] px-3 py-2 text-[13px] text-[#20180f] outline-none focus:border-[#e0662e]"
            />
          </label>
        ))}
        <div className="mt-1 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#e1bfb3] px-4 py-2 text-[12.5px] font-semibold text-[#261813]">
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || missing.length > 0}
            className="rounded-lg bg-[#e0662e] px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Dokumen Baru"}
          </button>
        </div>
      </form>
    </div>
  );
}
