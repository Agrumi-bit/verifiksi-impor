"use client";

import { useState } from "react";

import { MaterialIcon } from "../material-icon";
import { SectionShell } from "./section-shell";
import { DOC_TYPE_DEFS, MIN_DOCUMENTATION_REQUIRED, type DocumentationItemValues, type DocumentationOtherItemValues } from "./schema";

type UploadState = { uploading: boolean; error?: string; previewUrl?: string };

type Props = {
  documentation: Record<string, DocumentationItemValues>;
  documentationOther: DocumentationOtherItemValues[];
  onChange: (key: string, patch: Partial<DocumentationItemValues>) => void;
  onOtherChange: (id: string, patch: Partial<DocumentationOtherItemValues>) => void;
  onOtherAdd: (id: string) => void;
  onOtherRemove: (id: string) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

const OTHER_LABEL = DOC_TYPE_DEFS.find((dt) => dt.key === "other")!.label;
const FIXED_DOC_TYPE_DEFS = DOC_TYPE_DEFS.filter((dt) => dt.key !== "other");

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("namespace", "inspection");
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) throw new Error("Gagal mengunggah file");
  const data = (await response.json()) as { path: string };
  return data.path;
}

export function Section6Documentation({
  documentation,
  documentationOther,
  onChange,
  onOtherChange,
  onOtherAdd,
  onOtherRemove,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const filledCount =
    Object.values(documentation).filter((d) => d.filePath).length + documentationOther.filter((d) => d.filePath).length;

  async function handleOtherFile(file: File | undefined) {
    if (!file) return;
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    onOtherAdd(id);
    setUploads((prev) => ({ ...prev, [id]: { uploading: true, previewUrl } }));
    try {
      const path = await uploadFile(file);
      onOtherChange(id, { filePath: path });
      setUploads((prev) => ({ ...prev, [id]: { uploading: false, previewUrl } }));
    } catch {
      setUploads((prev) => ({ ...prev, [id]: { uploading: false, previewUrl, error: "Gagal mengunggah file" } }));
    }
  }

  async function handleFile(key: string, file: File | undefined) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setUploads((prev) => ({ ...prev, [key]: { uploading: true, previewUrl } }));
    try {
      const path = await uploadFile(file);
      onChange(key, { filePath: path });
      setUploads((prev) => ({ ...prev, [key]: { uploading: false, previewUrl } }));
    } catch {
      setUploads((prev) => ({ ...prev, [key]: { uploading: false, previewUrl, error: "Gagal mengunggah file" } }));
    }
  }

  function handleRemove(key: string) {
    setUploads((prev) => {
      if (prev[key]?.previewUrl) URL.revokeObjectURL(prev[key].previewUrl!);
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onChange(key, { filePath: undefined });
  }

  return (
    <SectionShell index={6} title="Dokumentasi Lapangan" onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
        Surveyor diwajibkan untuk mengunggah dokumentasi visual yang menunjukkan kondisi kantor perusahaan pada saat
        verifikasi lapangan dilakukan. Dokumentasi ini berfungsi sebagai bukti pendukung hasil verifikasi.
      </p>

      {filledCount < MIN_DOCUMENTATION_REQUIRED && (
        <div className="mb-4 text-[13px] font-bold text-[#dc2626]">
          Minimal {MIN_DOCUMENTATION_REQUIRED} dokumentasi wajib diunggah ({filledCount}/{MIN_DOCUMENTATION_REQUIRED}).
        </div>
      )}

      <div className="mb-1 flex flex-col gap-3.5">
        {FIXED_DOC_TYPE_DEFS.map((dt) => {
          const item = documentation[dt.key] ?? {};
          const upload = uploads[dt.key];
          const galleryInputId = `doc-gallery-${dt.key}`;
          const cameraInputId = `doc-camera-${dt.key}`;

          return (
            <div key={dt.key} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border-[1.5px] border-[#f26522] p-[18px]">
                <div className="mb-3 text-[13.5px] font-semibold text-[#1c2530]">{dt.label}</div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => document.getElementById(galleryInputId)?.click()}
                  onKeyDown={(e) => e.key === "Enter" && document.getElementById(galleryInputId)?.click()}
                  className="flex min-h-[170px] cursor-pointer items-center justify-center gap-6 rounded-[10px] border-[1.5px] border-dashed border-[#c7d0dc] bg-[#f2f2f2] p-6"
                >
                  <span className="flex flex-col items-center gap-1.5 text-center">
                    <MaterialIcon name="add_photo_alternate" className="text-[34px] text-[#f26522]" />
                    <span className="text-xs text-[#6b7685]">
                      klik untuk upload
                      <br />
                      jpeg / png, / webp
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById(cameraInputId)?.click();
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <MaterialIcon name="photo_camera" className="text-[34px] text-[#f26522]" />
                    <span className="whitespace-nowrap rounded-lg bg-[#f26522] px-4 py-2 text-[12.5px] font-bold text-white">
                      pilih camera
                    </span>
                  </button>
                  <input
                    id={galleryInputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      handleFile(dt.key, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    id={cameraInputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleFile(dt.key, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
                {upload?.uploading && <div className="mt-2 text-xs text-[#8a96a8]">Mengunggah...</div>}
                {upload?.error && <div className="mt-2 text-xs text-[#dc2626]">{upload.error}</div>}
                {!upload?.uploading && item.filePath && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                    <MaterialIcon name="check_circle" className="text-sm" />
                    Berhasil diunggah
                  </div>
                )}
                <textarea
                  value={item.caption ?? ""}
                  onChange={(e) => onChange(dt.key, { caption: e.target.value })}
                  placeholder="Keterangan dokumentasi"
                  className="mt-3 min-h-[56px] w-full resize-y rounded-lg border border-[#d7dbe0] p-2.5 text-[12.5px]"
                />
              </div>

              <div className="min-w-0 rounded-xl border-[1.5px] border-[#f26522] p-[18px]">
                <div className="mb-0.5 text-xs text-[#6b7685]">Preview</div>
                <div className="mb-3 text-[13.5px] font-semibold text-[#1c2530]">{dt.label}</div>
                <div className="relative">
                  {upload?.previewUrl ? (
                    <div
                      className="aspect-3/4 w-full rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${upload.previewUrl})` }}
                    />
                  ) : item.filePath ? (
                    <div className="flex aspect-3/4 w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-[#f2f0ee] text-[#8a96a8]">
                      <MaterialIcon name="image" className="text-[28px]" />
                      <span className="text-xs">Sudah diunggah</span>
                    </div>
                  ) : (
                    <div className="aspect-3/4 w-full rounded-lg bg-[#f2f0ee]" />
                  )}
                  {(upload?.previewUrl || item.filePath) && (
                    <button
                      type="button"
                      onClick={() => handleRemove(dt.key)}
                      aria-label={`Hapus ${dt.label}`}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#1c2530]/70 text-white hover:bg-[#dc2626]"
                    >
                      <MaterialIcon name="delete" className="text-base" />
                    </button>
                  )}
                </div>
                <textarea
                  value={item.caption ?? ""}
                  onChange={(e) => onChange(dt.key, { caption: e.target.value })}
                  className="mt-3 min-h-[56px] w-full resize-y rounded-lg border border-[#d7dbe0] p-2.5 text-[12.5px]"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[#e0e5eb] pt-5">
        <div className="mb-3 text-[13.5px] font-semibold text-[#1c2530]">{OTHER_LABEL}</div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {documentationOther.map((item) => {
            const upload = uploads[item.id];
            return (
              <div key={item.id} className="min-w-0 rounded-xl border-[1.5px] border-[#f26522] p-3.5">
                <div className="relative">
                  {upload?.previewUrl ? (
                    <div className="aspect-3/4 w-full rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${upload.previewUrl})` }} />
                  ) : item.filePath ? (
                    <div className="flex aspect-3/4 w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-[#f2f0ee] text-[#8a96a8]">
                      <MaterialIcon name="image" className="text-[28px]" />
                      <span className="text-xs">Sudah diunggah</span>
                    </div>
                  ) : (
                    <div className="flex aspect-3/4 w-full items-center justify-center rounded-lg bg-[#f2f0ee] text-[#8a96a8]">
                      <MaterialIcon name="hourglass_empty" className="text-[22px]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onOtherRemove(item.id)}
                    aria-label="Hapus foto"
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#1c2530]/70 text-white hover:bg-[#dc2626]"
                  >
                    <MaterialIcon name="delete" className="text-base" />
                  </button>
                </div>
                {upload?.uploading && <div className="mt-2 text-xs text-[#8a96a8]">Mengunggah...</div>}
                {upload?.error && <div className="mt-2 text-xs text-[#dc2626]">{upload.error}</div>}
                <textarea
                  value={item.caption ?? ""}
                  onChange={(e) => onOtherChange(item.id, { caption: e.target.value })}
                  placeholder="Keterangan"
                  className="mt-2 min-h-[44px] w-full resize-y rounded-lg border border-[#d7dbe0] p-2 text-[12px]"
                />
              </div>
            );
          })}

          <div
            role="button"
            tabIndex={0}
            onClick={() => document.getElementById("doc-other-gallery")?.click()}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById("doc-other-gallery")?.click()}
            className="flex aspect-3/4 min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#c7d0dc] bg-[#f2f2f2] p-3.5"
          >
            <MaterialIcon name="add_photo_alternate" className="text-[28px] text-[#f26522]" />
            <span className="text-center text-xs text-[#6b7685]">Tambah Foto</span>
            <input
              id="doc-other-gallery"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                handleOtherFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
