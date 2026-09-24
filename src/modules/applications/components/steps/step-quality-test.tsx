"use client";

import { useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { CheckCircle2, FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useCommodityGroups } from "@/modules/master-data/use-commodity-groups";
import { useApplicationBrandOptions } from "../../hooks/use-application-brand-options";
import {
  createEmptyApplicationBrandQualityTest,
  type ApplicationBrandQualityTestEntryValues,
  type ApplicationWizardValues,
} from "../../schema";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

function QualityTestFileUpload({
  value,
  onChange,
}: {
  value: ApplicationBrandQualityTestEntryValues;
  onChange: (patch: Partial<ApplicationBrandQualityTestEntryValues>) => void;
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

  if (value.filePath) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="truncate">{value.fileName}</span>
          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
        </span>
        <button
          type="button"
          onClick={() => onChange({ filePath: "", fileName: "" })}
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
      {status === "uploading" ? "Mengunggah..." : "Unggah Dokumen Hasil Uji Mutu"}
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
 * Step "Hasil Uji Mutu" — only relevant for "Barang Konsumsi" (same gate as
 * StepBrandsUsed). One card per Brand selected in Step "Merek yang
 * Digunakan" (`applicationBrands`), each with its own repeatable list of
 * quality-test certificates (`brandQualityTests`, filtered by `brandId`).
 * Manual array management via Controller (not `useFieldArray`) since the
 * rendered groups are a filtered view over one flat array keyed by
 * `brandId` — same pattern StepPartnerIndustri already uses for its own
 * per-partner-id grouping.
 */
export function StepQualityTest({ form }: Props) {
  const { control, formState } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];
  const applicationBrands = useWatch({ control, name: "applicationBrands" }) ?? [];
  const { data: brandOptions } = useApplicationBrandOptions();
  const { groupOptions, subGroupOptionsFor } = useCommodityGroups();

  if (!importTypes.includes("BARANG_KONSUMSI")) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Step ini hanya berlaku untuk Jenis Impor &quot;Barang Konsumsi&quot;. Tidak ada jenis impor
        tersebut yang dipilih di Step 2, sehingga tidak ada dokumen hasil uji mutu yang perlu
        ditambahkan di step ini.
      </p>
    );
  }

  if (applicationBrands.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Belum ada merek yang dipilih di Step &quot;Merek yang Digunakan&quot;. Pilih merek terlebih
        dahulu sebelum mengunggah dokumen hasil uji mutu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold">Hasil Uji Mutu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Unggah dokumen hasil uji mutu untuk setiap merek yang digunakan pada permohonan ini.
          Satu merek dapat memiliki lebih dari satu sertifikat uji mutu (per kelompok komoditas).
        </p>
      </div>

      {formState.errors.brandQualityTests?.message && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {formState.errors.brandQualityTests.message as string}
        </p>
      )}

      <Controller
        control={control}
        name="brandQualityTests"
        render={({ field }) => {
          const entries = field.value ?? [];

          function addEntry(brandId: string) {
            field.onChange([...entries, createEmptyApplicationBrandQualityTest(brandId)]);
          }

          function removeEntry(target: ApplicationBrandQualityTestEntryValues) {
            field.onChange(entries.filter((entry) => entry !== target));
          }

          function updateEntry(target: ApplicationBrandQualityTestEntryValues, patch: Partial<ApplicationBrandQualityTestEntryValues>) {
            field.onChange(entries.map((entry) => (entry === target ? { ...entry, ...patch } : entry)));
          }

          return (
            <div className="flex flex-col gap-4">
              {applicationBrands.map((brand) => {
                const brandOption = brandOptions?.find((option) => option.id === brand.brandId);
                const brandEntries = entries.filter((entry) => entry.brandId === brand.brandId);

                return (
                  <section key={brand.brandId} className="rounded-xl border border-border p-4.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{brandOption?.brandName ?? "Merek"}</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => addEntry(brand.brandId)}>
                        <Plus className="size-3.5" />
                        Tambah Sertifikat
                      </Button>
                    </div>

                    {brandEntries.length === 0 ? (
                      <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                        Belum ada dokumen hasil uji mutu untuk merek ini.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        {brandEntries.map((entry, entryIndex) => (
                          <div key={entryIndex} className="rounded-lg border border-border bg-muted/20 p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                <FormField label="Kelompok Komoditas" required>
                                  <SearchSelectInput
                                    value={entry.commodityGroupId}
                                    onChange={(value) => {
                                      const option = groupOptions.find((o) => o.value === value);
                                      updateEntry(entry, {
                                        commodityGroupId: value,
                                        commodityName: option?.label ?? "",
                                        commoditySubGroupId: undefined,
                                        commoditySubGroupName: undefined,
                                      });
                                    }}
                                    options={groupOptions}
                                    allowFreeText={false}
                                    placeholder="Pilih kelompok komoditas"
                                  />
                                </FormField>
                                <FormField label="Sub-Kelompok Komoditas" hint="Opsional, apabila tersedia.">
                                  <SearchSelectInput
                                    value={entry.commoditySubGroupId ?? ""}
                                    onChange={(value) => {
                                      const option = subGroupOptionsFor(entry.commodityGroupId).find(
                                        (o) => o.value === value,
                                      );
                                      updateEntry(entry, {
                                        commoditySubGroupId: value || undefined,
                                        commoditySubGroupName: option?.label,
                                      });
                                    }}
                                    options={subGroupOptionsFor(entry.commodityGroupId)}
                                    allowFreeText={false}
                                    placeholder="Pilih sub-kelompok (opsional)"
                                  />
                                </FormField>
                                <FormField label="Nomor Sertifikat" required>
                                  <Input
                                    value={entry.certificateNumber}
                                    onChange={(event) => updateEntry(entry, { certificateNumber: event.target.value })}
                                  />
                                </FormField>
                                <FormField label="Nama Laboratorium" required>
                                  <Input
                                    value={entry.laboratoryName}
                                    onChange={(event) => updateEntry(entry, { laboratoryName: event.target.value })}
                                  />
                                </FormField>
                                <FormField label="Tanggal Terbit" required>
                                  <Input
                                    type="date"
                                    className="font-mono"
                                    value={entry.issueDate}
                                    onChange={(event) => updateEntry(entry, { issueDate: event.target.value })}
                                  />
                                </FormField>
                                <FormField label="Tanggal Kadaluarsa" hint="Opsional, apabila sertifikat berlaku permanen.">
                                  <Input
                                    type="date"
                                    className="font-mono"
                                    value={entry.expiryDate ?? ""}
                                    onChange={(event) => updateEntry(entry, { expiryDate: event.target.value || undefined })}
                                  />
                                </FormField>
                                <div className="sm:col-span-2">
                                  <FormField label="Dokumen Hasil Uji Mutu" required>
                                    <QualityTestFileUpload value={entry} onChange={(patch) => updateEntry(entry, patch)} />
                                  </FormField>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeEntry(entry)}
                                aria-label="Hapus sertifikat"
                                className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          );
        }}
      />
    </div>
  );
}
