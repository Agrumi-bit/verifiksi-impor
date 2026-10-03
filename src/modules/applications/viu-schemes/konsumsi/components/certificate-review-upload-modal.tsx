"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileText, History, Loader2, Upload, X } from "lucide-react";

import { useExistingBrandQualityTests } from "@/modules/applications/hooks/use-brand-quality-tests";
import { parseQualityTestChecklistKey } from "../qt-checklist-key";

type VersionEntry = {
  version: number;
  path: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
  uploadedByRole: "CR" | "VERIFIKATOR" | null;
  isCurrent: boolean;
};

const UPLOADED_BY_ROLE_LABELS: Record<string, string> = { CR: "CR", VERIFIKATOR: "Verifikator" };

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Props = {
  /** `/api/customer-relation-workspace/applications/{id}/documents` or
   * `/api/verifikator-workspace/assignments/{id}/documents` — the workspace-specific base this
   * modal is reused across (see both routes' own `konsumsi-qt:` branch in their `[key]/history`
   * PATCH handler, which this modal's PATCH call targets). */
  apiBase: string;
  docKey: string;
  docTitle: string;
  onClose: () => void;
  onUploaded: () => void;
};

/**
 * CR/Verifikator's "Unggah" / "Ganti File" action on a "Sertifikat Uji Mutu" row — same two-path
 * choice (pilih existing / unggah baru) as the applicant's own Step "Product Information"
 * certificate panel (see commodity-product-section.tsx's CertificatePanel), reachable from the
 * review workspaces instead. Posts to the shared `konsumsi-qt:` branch both workspaces'
 * `[key]/history` PATCH handler implements (see certificate-upload.ts) — never touches
 * verification status or Application status; the uploaded version starts "Belum Diperiksa" like
 * any other upload.
 */
export function CertificateReviewUploadModal({ apiBase, docKey, docTitle, onClose, onUploaded }: Props) {
  const parsed = parseQualityTestChecklistKey(docKey);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ certificateNumber: "", laboratoryName: "", issueDate: "", validUntil: "" });
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);

  const { data: existingOptions, isLoading: isLoadingExisting } = useExistingBrandQualityTests(parsed?.brandId, parsed?.commodityGroupId);

  const historyQueryKey = ["review-workspace", "documents", apiBase, docKey, "history"];
  const { data: historyData } = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const response = await fetch(`${apiBase}/${encodeURIComponent(docKey)}/history`);
      if (!response.ok) throw new Error("Gagal memuat riwayat");
      const json = (await response.json()) as { data: VersionEntry[] };
      return json.data;
    },
  });

  async function handleFile(file: File) {
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "documents");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { path: string; name: string };
      setFilePath(data.path);
      setFileName(data.name);
      setUploadStatus("idle");
    } catch {
      setUploadStatus("error");
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setIsSaving(true);
    try {
      const body =
        mode === "existing"
          ? { qualityTestId: selectedId }
          : { ...form, filePath, fileName };

      const response = await fetch(`${apiBase}/${encodeURIComponent(docKey)}/history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Gagal menyimpan sertifikat");
      }
      toast.success("Sertifikat Hasil Uji Mutu berhasil disimpan.");
      onUploaded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan sertifikat");
    } finally {
      setIsSaving(false);
    }
  }

  if (!parsed) return null;

  const canSave =
    mode === "existing"
      ? Boolean(selectedId)
      : Boolean(form.certificateNumber.trim() && form.laboratoryName.trim() && form.issueDate && filePath);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,12,8,.55)] p-5" onClick={onClose}>
      <div className="flex max-h-[88vh] w-[520px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border px-5.5 pb-3 pt-5">
          <div>
            <div className="flex items-center gap-1.5 text-[18px] font-extrabold text-[#20180f]">
              <Upload className="size-4.5 text-[#8a7565]" />
              Unggah Sertifikat Hasil Uji Mutu
            </div>
            <div className="mt-0.75 text-[12.5px] text-[#8a7565]">{docTitle}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-[#a68f80]">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5.5 py-4">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            <button type="button" onClick={() => setMode("existing")} className={`flex-1 rounded-md py-1.5 font-semibold ${mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              Pilih sertifikat yang sudah ada
            </button>
            <button type="button" onClick={() => setMode("new")} className={`flex-1 rounded-md py-1.5 font-semibold ${mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              Unggah baru
            </button>
          </div>

          {mode === "existing" ? (
            isLoadingExisting ? (
              <p className="text-xs text-muted-foreground">Memuat sertifikat...</p>
            ) : (existingOptions ?? []).length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Belum ada sertifikat Hasil Uji Mutu yang berlaku untuk merek dan Sub Kelompok Komoditas ini.
              </p>
            ) : (
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Pilih sertifikat...</option>
                {(existingOptions ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.certificateNumber} — {option.laboratoryName}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  No. Sertifikat
                  <input
                    value={form.certificateNumber}
                    onChange={(event) => setForm((f) => ({ ...f, certificateNumber: event.target.value }))}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Laboratorium
                  <input
                    value={form.laboratoryName}
                    onChange={(event) => setForm((f) => ({ ...f, laboratoryName: event.target.value }))}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  Tanggal Terbit
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(event) => setForm((f) => ({ ...f, issueDate: event.target.value }))}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Berlaku Sampai
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(event) => setForm((f) => ({ ...f, validUntil: event.target.value }))}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-mono"
                  />
                </label>
              </div>

              {filePath ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{fileName}</span>
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                  </span>
                  <button type="button" onClick={() => { setFilePath(""); setFileName(""); }} className="shrink-0 text-xs font-semibold text-destructive hover:underline">
                    Hapus
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/40">
                  {uploadStatus === "uploading" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {uploadStatus === "uploading" ? "Mengunggah..." : "Unggah File Sertifikat"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void handleFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {(historyData?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <History className="size-3.5" />
                Riwayat Unggahan
              </p>
              {historyData!.slice(0, 3).map((v) => (
                <p key={v.version} className="text-[11px] text-muted-foreground">
                  v{v.version} — Diunggah oleh {v.uploadedByRole ? UPLOADED_BY_ROLE_LABELS[v.uploadedByRole] : "Perusahaan"}
                  {v.uploadedByName ? ` – ${v.uploadedByName}` : ""} – {fmtDateTime(v.uploadedAt)}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5.5 py-3.5">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-[12.5px] font-semibold">
            Batal
          </button>
          <button
            type="button"
            disabled={!canSave || isSaving}
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
