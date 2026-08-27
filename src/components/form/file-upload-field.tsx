"use client";

import { useState } from "react";
import { FileCheck2, Loader2, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StorageNamespace } from "@/lib/storage";

type FileUploadFieldProps = {
  value?: string;
  onChange: (path: string | undefined) => void;
  label: string;
  hint?: string;
  namespace: StorageNamespace;
  accept?: string;
};

export function FileUploadField({
  value,
  onChange,
  label,
  hint,
  namespace,
  accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
}: FileUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", namespace);
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { path: string; name: string };
      onChange(data.path);
      setFileName(data.name);
    } catch {
      setError("Gagal mengunggah file, coba lagi.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove() {
    onChange(undefined);
    setFileName(null);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <FileCheck2 className="size-4 shrink-0 text-primary" />
          <span className="truncate">{fileName ?? value.split("/").pop()}</span>
        </span>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Hapus file"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground hover:bg-muted/40",
        isUploading && "pointer-events-none opacity-60",
      )}
    >
      {isUploading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Upload className="size-4" />
      )}
      <span>{isUploading ? "Mengunggah..." : label}</span>
      {hint && <span className="text-xs">{hint}</span>}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
