"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, History, UploadCloud, X } from "lucide-react";

import { buildDisplayFileName } from "@/lib/document-filename";
import { checklistItemCode } from "@/modules/verifikator-workspace/schema";

type VersionEntry = {
  version: number;
  path: string;
  uploadedByName: string | null;
  uploadedAt: string;
  isCurrent: boolean;
  verificationStatus: string;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectionNote: string | null;
};

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fileHref(path: string): string {
  return `/api/files?path=${encodeURIComponent(path)}`;
}

type Props = {
  applicationId: string;
  docKey: string;
  docTitle: string;
  entityName: string;
  onClose: () => void;
  onUploaded: () => void;
};

/** Lets Customer Relation upload a replacement file when a document needs perbaikan/revisi — same version-history mechanism verifikator-workspace uses, so the company sees the same "new version uploaded" trail. */
export function DocumentHistoryModal({ applicationId, docKey, docTitle, entityName, onClose, onUploaded }: Props) {
  const documentCode = checklistItemCode(docKey, docTitle);
  const historyQueryKey = ["customer-relation-workspace", "applications", applicationId, "documents", docKey, "history"];
  const { data, isLoading, refetch } = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const response = await fetch(`/api/customer-relation-workspace/applications/${applicationId}/documents/${encodeURIComponent(docKey)}/history`);
      if (!response.ok) throw new Error("Gagal memuat riwayat dokumen");
      const json = (await response.json()) as { data: VersionEntry[] };
      return json.data;
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const versions = data ?? [];

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "temporary");
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Gagal mengunggah file");
      const { path } = (await uploadRes.json()) as { path: string };

      const saveRes = await fetch(`/api/customer-relation-workspace/applications/${applicationId}/documents/${encodeURIComponent(docKey)}/history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan dokumen baru");
      }
      toast.success("Dokumen baru berhasil diunggah.");
      await refetch();
      onUploaded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunggah dokumen baru");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-5" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-[480px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5.5 pb-3 pt-5">
          <div>
            <div className="flex items-center gap-1.5 text-[18px] font-extrabold text-[#20180f]">
              <History className="size-4.5 text-[#8a7565]" />
              Riwayat Dokumen
            </div>
            <div className="mt-0.75 text-[12.5px] text-[#8a7565]">{docTitle}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5.5 pb-3.5">
          <label
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-[9px] border-[1.5px] border-dashed border-[#e8b89a] bg-[#fdeadd] p-3.5 text-center ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <UploadCloud className="size-5 text-[#c14a1f]" />
            <span className="text-[12.5px] font-bold text-[#c14a1f]">{isUploading ? "Mengunggah..." : "Upload Dokumen Perbaikan"}</span>
            <span className="text-[11px] text-[#c88a68]">Klik untuk memilih file PDF/JPG/PNG</span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" disabled={isUploading} onChange={handleUpload} />
          </label>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 pb-3">
          {isLoading && <p className="text-sm text-[#8a7565]">Memuat...</p>}
          {!isLoading && versions.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada riwayat dokumen.</p>}
          {versions.map((v) => {
            const fileName = buildDisplayFileName(documentCode, entityName, v.version, v.path);
            const href = fileHref(v.path);
            return (
              <div key={v.version} className="rounded-[10px] border border-[#efe2d4] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13.5px] font-extrabold text-[#20180f]">{fileName}</span>
                  <span className="rounded-full bg-[#4a4038] px-2 py-0.5 text-[10.5px] font-bold text-white">v{v.version}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${v.isCurrent ? "bg-[#e2f7ea] text-[#1a7a4c]" : "bg-[#f2ece5] text-[#8a7565]"}`}
                  >
                    {v.isCurrent ? "Saat Ini" : "Sebelumnya"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="text-[10.5px] text-[#a68f80]">Upload Date</div>
                    <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{fmtDateTime(v.uploadedAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-[#a68f80]">Uploaded By</div>
                    <div className="mt-0.5 text-[12px] font-bold text-[#20180f]">{v.uploadedByName ?? "—"}</div>
                  </div>
                </div>
                <a
                  href={href}
                  download={fileName}
                  className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-[#e1bfb3] px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-[#f0ded0] px-5.5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e1bfb3] px-4 py-2 text-[12.5px] font-semibold text-[#261813]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
