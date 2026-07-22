"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import type { MitraNonIndustriValues } from "../../schema";

type Props = {
  form: UseFormReturn<MitraNonIndustriValues>;
};

export function MitraContractStep({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Kontrak kerja sama antara importir dan mitra non industri penerima
        bahan baku/bahan penolong.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nomor Kontrak Kerja Sama"
          required
          error={errors.contractNumber?.message}
        >
          <Input
            placeholder="e.g. KKS/2026/001"
            {...register("contractNumber")}
          />
        </FormField>
        <FormField
          label="Tanggal Kontrak"
          required
          error={errors.contractDate?.message}
        >
          <Input type="date" {...register("contractDate")} />
        </FormField>
      </div>

      <Controller
        control={control}
        name="contractDocumentPath"
        render={({ field }) => (
          <FormField
            label="Upload Dokumen Kontrak"
            required
            error={errors.contractDocumentPath?.message}
          >
            <FileUploadField
              namespace="documents"
              value={field.value}
              onChange={field.onChange}
              label="Upload Dokumen Kontrak"
            />
          </FormField>
        )}
      />
    </div>
  );
}
