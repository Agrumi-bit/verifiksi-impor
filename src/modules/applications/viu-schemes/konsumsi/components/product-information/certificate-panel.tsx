"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { NativeSelect } from "@/components/form/native-select";
import { useExistingBrandQualityTests } from "../../../../hooks/use-brand-quality-tests";
import { createEmptyProductGroupCertificate, type ProductGroupCertificateValues } from "../../schema";
import { CERTIFICATE_STATUS_CLASSES, CERTIFICATE_STATUS_LABELS, computeCertificateStatus } from "./certificate-status";

type Props = {
  brandId: string;
  commodityGroupId: string;
  commodityName: string;
  certificate: ProductGroupCertificateValues | undefined;
  onChange: (next: ProductGroupCertificateValues) => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * One Merek x Sub Kelompok Komoditas group's Hasil Uji Mutu requirement — either reference an
 * existing (not-yet-expired) `BrandQualityTest` row, or upload a fresh certificate. Both write to
 * the same `productGroupCertificates` entry (see that schema's own comment); the server
 * re-resolves/re-validates either path independently at submit, never trusting this panel's own
 * client-side state as final.
 */
export function CertificatePanel({ brandId, commodityGroupId, commodityName, certificate, onChange }: Props) {
  const [mode, setMode] = useState<"existing" | "new">(certificate?.qualityTestId ? "existing" : "new");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const { data: existingOptions, isLoading: isLoadingExisting } = useExistingBrandQualityTests(brandId, commodityGroupId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const status = computeCertificateStatus(certificate, { brandId, commodityGroupId }, today);

  const current = certificate ?? createEmptyProductGroupCertificate(brandId, commodityGroupId, commodityName);

  function updateNew(patch: Partial<ProductGroupCertificateValues>) {
    onChange({ ...current, qualityTestId: undefined, ...patch });
  }

  function pickExisting(id: string) {
    const option = existingOptions?.find((o) => o.id === id);
    if (!option) return;
    onChange({
      brandId,
      commodityGroupId,
      commodityName,
      qualityTestId: option.id,
      certificateNumber: option.certificateNumber,
      laboratoryName: option.laboratoryName,
      issueDate: option.issueDate,
      validUntil: option.expiryDate ?? undefined,
      fileName: option.fileName,
      filePath: option.filePath,
    });
  }

  async function handleFile(file: File) {
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "documents");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { path: string; name: string };
      updateNew({ filePath: data.path, fileName: data.name });
      setUploadStatus("idle");
    } catch {
      setUploadStatus("error");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Sertifikat Hasil Uji Mutu</p>
        <span className={`inline-flex h-5 items-center rounded-full px-2.5 text-[10.5px] font-bold ${CERTIFICATE_STATUS_CLASSES[status]}`}>
          {CERTIFICATE_STATUS_LABELS[status]}
          {status === "expiring" && certificate?.validUntil ? ` · ${formatDate(certificate.validUntil)}` : ""}
        </span>
      </div>
      {status === "valid" && certificate?.filePath && !certificate.validUntil && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
          Sertifikat tidak memiliki batas berlaku — bukan error, tapi akan dikonfirmasi ulang oleh verifikator.
        </p>
      )}

      <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1 text-xs">
        <button type="button" onClick={() => setMode("existing")} className={`flex-1 rounded-md py-1.5 font-semibold ${mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
          Pilih sertifikat yang sudah ada
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("new");
            // Switching away from an existing-linked certificate starts a blank manual entry —
            // never carries the picked row's fields over as if they were freshly typed.
            if (current.qualityTestId) onChange(createEmptyProductGroupCertificate(brandId, commodityGroupId, commodityName));
          }}
          className={`flex-1 rounded-md py-1.5 font-semibold ${mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Unggah baru
        </button>
      </div>

      {mode === "existing" ? (
        <div className="mt-3">
          {isLoadingExisting ? (
            <p className="text-xs text-muted-foreground">Memuat sertifikat...</p>
          ) : (existingOptions ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              Belum ada sertifikat Hasil Uji Mutu yang berlaku untuk merek dan Sub Kelompok Komoditas ini. Gunakan &quot;Unggah baru&quot;.
            </p>
          ) : (
            <NativeSelect value={certificate?.qualityTestId ?? ""} onChange={(event) => pickExisting(event.target.value)}>
              <option value="">Pilih sertifikat...</option>
              {(existingOptions ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.certificateNumber} — {option.laboratoryName} (berlaku s/d {option.expiryDate ? formatDate(option.expiryDate) : "tidak ada batas"})
                </option>
              ))}
            </NativeSelect>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="No. Sertifikat" required>
              <Input
                value={current.certificateNumber}
                onChange={(event) => updateNew({ certificateNumber: event.target.value })}
              />
            </FormField>
            <FormField label="Laboratorium" required>
              <Input
                value={current.laboratoryName}
                onChange={(event) => updateNew({ laboratoryName: event.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal Terbit" required>
              <Input
                type="date"
                className="font-mono"
                value={current.issueDate}
                onChange={(event) => updateNew({ issueDate: event.target.value })}
              />
            </FormField>
            <FormField label="Berlaku Sampai" hint="Kosongkan jika tidak ada batas berlaku.">
              <Input
                type="date"
                className="font-mono"
                value={current.validUntil ?? ""}
                onChange={(event) => updateNew({ validUntil: event.target.value || undefined })}
              />
            </FormField>
          </div>

          {current.filePath ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="truncate">{current.fileName}</span>
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              </span>
              <button type="button" onClick={() => updateNew({ filePath: "", fileName: "" })} className="shrink-0 text-xs font-semibold text-destructive hover:underline">
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
    </div>
  );
}
