"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StorageNamespace } from "@/lib/storage";
import type { BrandDocumentEntryValues } from "../../../schema";

type Props = {
  label: string;
  description?: string;
  required: boolean;
  value: BrandDocumentEntryValues | undefined;
  onChange: (value: BrandDocumentEntryValues | undefined) => void;
  namespace: StorageNamespace;
  accept?: string;
  error?: string;
  /** Read-only Step 1/2 metadata shown next to the upload instead of asking
   * the user to re-enter it (e.g. "Nomor: auto-filled from Step 2"). */
  contextNote?: React.ReactNode;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DEFAULT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

/**
 * Reusable upload card — richer than the generic FileUploadField (file
 * size, upload timestamp, Lihat/Ganti/Hapus, an explicit upload status).
 * Used by Step 1's early trademark-evidence upload and by every document
 * card in Step 4 — same card, same field, two entry points. Upload status
 * is NOT verification status: this card only ever shows "Berhasil
 * Diunggah", never "Verified" — see the Step 4 report.
 */
export function BrandDocumentUploadCard({
  label,
  description,
  required,
  value,
  onChange,
  namespace,
  accept = DEFAULT_ACCEPT,
  error,
  contextNote,
}: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [uploadedAt, setUploadedAt] = useState<Date | null>(value ? new Date() : null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", namespace);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Gagal mengunggah dokumen, coba lagi.");
      const data = (await response.json()) as { path: string; name: string; size: number };
      onChange({ filePath: data.path, fileName: data.name, fileSize: data.size });
      setUploadedAt(new Date());
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengunggah dokumen.");
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function confirmDelete() {
    onChange(undefined);
    setUploadedAt(null);
    setIsDeleteOpen(false);
  }

  return (
    <div className="rounded-lg border border-border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {label}
            <span
              className={
                required
                  ? "rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
                  : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
              }
            >
              {required ? "Wajib" : "Opsional"}
            </span>
          </p>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>

      {contextNote && (
        <div className="mt-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
          {contextNote}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="mt-3">
        {value ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <FileText className="size-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{value.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(value.fileSize)}
                {uploadedAt && ` · Diunggah ${uploadedAt.toLocaleString("id-ID")}`}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                Berhasil Diunggah
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled
                title="Pratinjau dokumen belum tersedia"
                className="text-xs font-semibold text-muted-foreground/50"
              >
                Lihat
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(true)}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Hapus
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-60"
          >
            {status === "uploading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            <span className="font-medium text-foreground">
              {status === "uploading" ? "Mengunggah..." : "Belum diunggah"}
            </span>
            {status !== "uploading" && <span className="text-xs">Unggah Dokumen</span>}
          </button>
        )}
        {(error || errorMessage) && (
          <p className="mt-1.5 text-xs text-destructive">{error || errorMessage}</p>
        )}
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus dokumen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dokumen yang dihapus perlu diunggah kembali apabila merupakan persyaratan wajib.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
