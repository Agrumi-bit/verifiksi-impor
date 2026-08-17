"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FileUploadField } from "@/components/form/file-upload-field";
import { useSuratTugasTemplate, type SuratTugasTemplateData as Template } from "@/modules/surat-tugas-template/use-template";

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

type TextFieldKey = Exclude<keyof Template, "headerImagePath" | "footerImagePath">;

const FIELD_GROUPS: { title: string; description: string; fields: { key: TextFieldKey; label: string; multiline?: boolean }[] }[] = [
  {
    title: "Kop Surat",
    description: "Nama lembaga dan sub-judul yang tampil di bagian atas surat.",
    fields: [
      { key: "orgName", label: "Nama Lembaga" },
      { key: "orgSubtitle", label: "Sub-judul" },
      { key: "letterTitle", label: "Judul Surat" },
      { key: "nomorLabel", label: "Label Nomor Surat" },
    ],
  },
  {
    title: "Kontrol Dokumen",
    description: "Kotak metadata dokumen (ala ISO/QHSE) di kanan atas kop surat — kosongkan semua untuk menyembunyikan kotak ini.",
    fields: [
      { key: "docNumberLabel", label: "Label No. Dokumen" },
      { key: "docNumber", label: "No. Dokumen" },
      { key: "docRevisionLabel", label: "Label No. Terbitan" },
      { key: "docRevision", label: "No. Terbitan" },
      { key: "docAmendmentLabel", label: "Label No. Revisi" },
      { key: "docAmendment", label: "No. Revisi" },
      { key: "docEffectiveLabel", label: "Label Berlaku Mulai" },
      { key: "docEffectiveDate", label: "Berlaku Mulai" },
    ],
  },
  {
    title: "Isi Surat",
    description: "Kalimat pembuka dan label pada tabel data penugasan.",
    fields: [
      { key: "openingSentence", label: "Kalimat Pembuka", multiline: true },
      { key: "namaLabel", label: "Label Nama" },
      { key: "peranLabel", label: "Label Peran" },
      { key: "assignmentPrefix", label: "Awalan Kalimat Penugasan (sebelum peran)" },
      { key: "assignmentSuffix", label: "Akhiran Kalimat Penugasan (sebelum data)" },
      { key: "perusahaanLabel", label: "Label Perusahaan" },
      { key: "idAplikasiLabel", label: "Label ID Aplikasi" },
      { key: "fasilitasLabel", label: "Label Fasilitas" },
      { key: "tanggalLabel", label: "Label Tanggal Pelaksanaan" },
    ],
  },
  {
    title: "Penutup & Tanda Tangan",
    description: "Kalimat penutup, catatan status draft, dan blok tanda tangan.",
    fields: [
      { key: "closingSentence", label: "Kalimat Penutup", multiline: true },
      { key: "draftNoticeText", label: "Catatan Status Draft", multiline: true },
      { key: "confidentialityNotice", label: "Catatan Kerahasiaan / Distribusi (opsional, boleh multi-baris)", multiline: true },
      { key: "signatureCity", label: "Kota Tanda Tangan" },
      { key: "signerLabel", label: "Label Penanda Tangan" },
    ],
  },
];

export function SuratTugasTemplateForm() {
  const { data, isLoading, isError } = useSuratTugasTemplate();

  if (isLoading) return <p className="text-[13px] text-[#8a7565]">Memuat template...</p>;
  if (isError || !data) return <p className="text-[13px] text-[#c1361f]">Gagal memuat template Surat Tugas.</p>;

  return <SuratTugasTemplateFormBody template={data} />;
}

/** Mounts only once `template` is loaded, so `draft` can be lazily initialized from it directly — no effect-driven sync needed. */
function SuratTugasTemplateFormBody({ template }: { template: Template }) {
  const queryClient = useQueryClient();
  const queryKey = ["system-configuration", "surat-tugas-template"];

  const [draft, setDraft] = useState<Template>(template);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const response = await fetch("/api/system-configuration/surat-tugas-template", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan template");
      return;
    }
    toast.success("Template Surat Tugas disimpan.");
    queryClient.invalidateQueries({ queryKey });
  }

  const isDirty = JSON.stringify(template) !== JSON.stringify(draft);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <p className="text-[12.5px] text-[#8a7565]">
          Teks ini digunakan pada dokumen Surat Tugas yang dilihat Customer Relation dan disetujui Project Manager. Data penugasan
          (nama, tanggal, perusahaan, dll) tetap terisi otomatis — hanya susunan kalimat dan label yang diatur di sini.
        </p>
      </div>

      {FIELD_GROUPS.map((group) => (
        <div key={group.title} className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
          <div className="mb-1 text-[13.5px] font-extrabold text-[#2b2420]">{group.title}</div>
          <p className="mb-3.5 text-[11.5px] text-[#a68f80]">{group.description}</p>

          {group.title === "Kop Surat" && (
            <div className="mb-4 rounded-lg border border-dashed border-[#e0d5c8] bg-[#fbf8f4] p-3.5">
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Gambar Kop Surat (opsional)</div>
              <p className="mb-2 text-[11px] text-[#a68f80]">
                Kalau diisi, gambar ini menggantikan Nama Lembaga &amp; Sub-judul di atas pada surat cetak.
              </p>
              {draft.headerImagePath ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileHref(draft.headerImagePath)} alt="Kop surat" className="h-16 rounded border border-[#e8dccd] object-contain" />
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, headerImagePath: null }))}
                    className="rounded-lg border border-[#e15241] px-3 py-1.5 text-[11.5px] font-semibold text-[#e15241]"
                  >
                    Hapus Gambar
                  </button>
                </div>
              ) : (
                <FileUploadField
                  namespace="templates"
                  accept=".jpg,.jpeg,.png"
                  label="Unggah Gambar Kop Surat"
                  onChange={(path) => setDraft((prev) => ({ ...prev, headerImagePath: path ?? null }))}
                />
              )}
            </div>
          )}

          {group.title === "Penutup & Tanda Tangan" && (
            <div className="mb-4 rounded-lg border border-dashed border-[#e0d5c8] bg-[#fbf8f4] p-3.5">
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Gambar Footer / Tanda Tangan (opsional)</div>
              <p className="mb-2 text-[11px] text-[#a68f80]">
                Kalau diisi, gambar ini menggantikan blok kota/tanggal &amp; nama penanda tangan di bawah pada surat cetak.
              </p>
              {draft.footerImagePath ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileHref(draft.footerImagePath)} alt="Footer surat" className="h-16 rounded border border-[#e8dccd] object-contain" />
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, footerImagePath: null }))}
                    className="rounded-lg border border-[#e15241] px-3 py-1.5 text-[11.5px] font-semibold text-[#e15241]"
                  >
                    Hapus Gambar
                  </button>
                </div>
              ) : (
                <FileUploadField
                  namespace="templates"
                  accept=".jpg,.jpeg,.png"
                  label="Unggah Gambar Footer"
                  onChange={(path) => setDraft((prev) => ({ ...prev, footerImagePath: path ?? null }))}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.key} className={field.multiline ? "sm:col-span-2" : undefined}>
                <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">{field.label}</div>
                {field.multiline ? (
                  <textarea
                    value={draft[field.key]}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, [field.key]: event.target.value } : prev))}
                    rows={2}
                    className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={draft[field.key]}
                    onChange={(event) => setDraft((prev) => (prev ? { ...prev, [field.key]: event.target.value } : prev))}
                    className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2.5">
        <button
          type="button"
          disabled={saving || !isDirty}
          onClick={() => setDraft(template)}
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
          {saving ? "Menyimpan..." : "Simpan Template"}
        </button>
      </div>
    </div>
  );
}
