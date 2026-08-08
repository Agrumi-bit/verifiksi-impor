"use client";

import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { createEmptySupportDocument, type ApplicationWizardValues } from "../../schema";

type PartnerIndustriOption = {
  id: string;
  name: string;
  nibNumber: string;
};

function usePartnerIndustriOptions() {
  return useQuery({
    queryKey: ["partners", "INDUSTRI"],
    queryFn: async () => {
      const response = await fetch("/api/partners?type=INDUSTRI");
      if (!response.ok) throw new Error("Gagal memuat data partner industri");
      const json = (await response.json()) as {
        data: { id: string; company: { companyName: string; nibNumber: string } }[];
      };
      return json.data.map(
        (partner): PartnerIndustriOption => ({
          id: partner.id,
          name: partner.company.companyName,
          nibNumber: partner.company.nibNumber,
        }),
      );
    },
  });
}

type Step5Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

function DocumentListSection({
  form,
  fieldName,
  namespace,
  docCountHint,
}: {
  form: UseFormReturn<ApplicationWizardValues>;
  fieldName: "nonIndustriDocuments" | "konsumsiDocuments";
  namespace: "documents";
  docCountHint: string;
}) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });
  const arrayError = formState.errors[fieldName];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Tambahkan dokumen pendukung sesuai persyaratan ({docCountHint}). Daftar
        dokumen persis masih menunggu konfirmasi dari modul System
        Configuration — untuk sekarang, tambahkan dokumen secara manual.
      </p>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Input
              placeholder="Nama dokumen, mis. Surat Izin Edar"
              {...register(`${fieldName}.${index}.label` as const)}
            />
            <Controller
              control={control}
              name={`${fieldName}.${index}.documentPath` as const}
              render={({ field: docField }) => (
                <FileUploadField
                  namespace={namespace}
                  value={docField.value}
                  onChange={docField.onChange}
                  label="Upload dokumen"
                />
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            className="mt-2 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Hapus dokumen"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {arrayError?.message && typeof arrayError.message === "string" && (
        <p className="text-xs text-destructive">{arrayError.message}</p>
      )}
      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptySupportDocument() as any)}
      >
        + Add Document
      </Button>
    </div>
  );
}

export function Step5SupportDocument({ form }: Step5Props) {
  const { control, register, formState } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];
  const partnerIndustriId = useWatch({ control, name: "partnerIndustriId" });
  const {
    data: partnerOptions,
    isLoading: isPartnerLoading,
    isError: isPartnerError,
  } = usePartnerIndustriOptions();

  const hasIndustri = importTypes.includes("BAHAN_BAKU_INDUSTRI");
  const hasNonIndustri = importTypes.includes("BAHAN_BAKU_NON_INDUSTRI");
  const hasKonsumsi = importTypes.includes("BARANG_KONSUMSI");

  if (!hasIndustri && !hasNonIndustri && !hasKonsumsi) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Tidak ada Jenis Impor yang dipilih di Step 2, sehingga tidak ada
        dokumen pendukung yang perlu ditambahkan di step ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Dokumen pendukung yang perlu diunggah disesuaikan dengan Jenis Impor
        yang Anda pilih di Step 2.
      </p>

      {hasIndustri && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Impor Bahan Baku – Perusahaan Industri (API-U)
          </h2>
          <FormField
            label="Partner Industri Tujuan"
            required
            error={
              formState.errors.partnerIndustriId?.message ??
              (isPartnerError
                ? "Gagal memuat data Partner Industri. Pastikan database sudah terhubung."
                : undefined)
            }
            hint={
              !isPartnerError && partnerOptions?.length === 0
                ? "Belum ada Partner Industri terdaftar. Tambahkan di modul Partner Management terlebih dahulu."
                : undefined
            }
          >
            <Controller
              control={control}
              name="partnerIndustriId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  disabled={isPartnerLoading || isPartnerError}
                  onValueChange={(value) => {
                    field.onChange(value);
                    const partner = partnerOptions?.find(
                      (option) => option.id === value,
                    );
                    form.setValue("partnerIndustriNib", partner?.nibNumber ?? "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        partnerOptions?.find((option) => option.id === value)?.name ??
                        (isPartnerLoading
                          ? "Memuat data partner..."
                          : "Pilih partner industri...")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {partnerOptions?.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {partnerIndustriId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="LHVKI Perusahaan Industri" hint="Isi manual nomor LHVKI perusahaan industri terkait.">
                <Input {...register("partnerIndustriLhvki")} />
              </FormField>
              <FormField label="Nomor NIB Partner Industri" hint="Terisi otomatis, terintegrasi dengan Partner Industri.">
                <Input readOnly {...register("partnerIndustriNib")} />
              </FormField>
            </div>
          )}
        </section>
      )}

      {hasNonIndustri && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Impor Bahan Baku – Perusahaan Non Industri (API-U)
          </h2>
          <DocumentListSection
            form={form}
            fieldName="nonIndustriDocuments"
            namespace="documents"
            docCountHint="4 dokumen"
          />
        </section>
      )}

      {hasKonsumsi && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Impor Barang Konsumsi
          </h2>
          <DocumentListSection
            form={form}
            fieldName="konsumsiDocuments"
            namespace="documents"
            docCountHint="7 dokumen"
          />
        </section>
      )}
    </div>
  );
}
