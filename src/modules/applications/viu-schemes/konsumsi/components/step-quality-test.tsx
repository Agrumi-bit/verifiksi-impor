"use client";

import { useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";

import { FormField } from "@/components/form/form-field";
import type { ApplicationRelationshipDocumentValues } from "../schema";
import type { ApplicationWizardValues } from "../../../schema";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

function DocumentUpload({
  value,
  uploadLabel,
  onChange,
}: {
  value: ApplicationRelationshipDocumentValues | undefined;
  uploadLabel: string;
  onChange: (value: ApplicationRelationshipDocumentValues | undefined) => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");

  async function handleFile(file: File) {
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "documents");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { path: string; name: string };
      onChange({ filePath: data.path, fileName: data.name });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  if (value?.filePath) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="truncate">{value.fileName}</span>
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
        </span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="shrink-0 text-xs font-semibold text-destructive hover:underline"
        >
          Hapus
        </button>
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/40">
      {status === "uploading" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
      {status === "uploading" ? "Mengunggah..." : uploadLabel}
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
  );
}

/**
 * Step "Dokumen Label Produk" — only relevant for "Barang Konsumsi" (same gate as
 * StepBrandsUsed). Exactly two documents, once per Application (not per Brand, not per commodity
 * grouping — see konsumsiLabelDocumentsSchema's own comment for why this moved off the old
 * per-Brand-x-Sub-Kelompok `brandQualityTests` shape): Surat Pernyataan Pemenuhan Ketentuan Label
 * Berbahasa Indonesia and Dokumentasi Label Produk. Quality-test certificates moved to Step
 * "Product Information" (Merek x Sub Kelompok matrix), since their requirement depends on which
 * commodity groupings the chosen products actually fall under — unknowable at this step.
 */
export function StepQualityTest({ form }: Props) {
  const { control, formState } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];

  if (!importTypes.includes("BARANG_KONSUMSI")) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Step ini hanya berlaku untuk Jenis Impor &quot;Barang Konsumsi&quot;. Tidak ada jenis impor
        tersebut yang dipilih di Step 2, sehingga tidak ada dokumen label produk yang perlu
        ditambahkan di step ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold">Dokumen Label Produk</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unggah Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia dan Dokumentasi
          Label Produk untuk permohonan ini. Kedua dokumen berlaku untuk seluruh merek dan produk
          pada permohonan ini, tidak perlu diunggah ulang per merek.
        </p>
      </div>

      <Controller
        control={control}
        name="labelStatementDocument"
        render={({ field }) => (
          <FormField
            label="Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia"
            required
            error={formState.errors.labelStatementDocument?.message as string | undefined}
          >
            <DocumentUpload
              value={field.value}
              uploadLabel="Unggah Surat Pernyataan Label Berbahasa Indonesia"
              onChange={field.onChange}
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="labelDocumentationDocument"
        render={({ field }) => (
          <FormField
            label="Dokumentasi Label Produk"
            required
            error={formState.errors.labelDocumentationDocument?.message as string | undefined}
          >
            <DocumentUpload
              value={field.value}
              uploadLabel="Unggah Dokumentasi Label Produk"
              onChange={field.onChange}
            />
          </FormField>
        )}
      />
    </div>
  );
}
