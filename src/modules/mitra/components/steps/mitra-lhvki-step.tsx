"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import type { MitraIndustriValues } from "../../schema";

type Props = {
  form: UseFormReturn<MitraIndustriValues>;
};

export function MitraLhvkiStep({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nomor LHVKI"
          required
          error={errors.lhvkiNumber?.message}
        >
          <Input
            placeholder="e.g. LHVKI-2026-00042"
            {...register("lhvkiNumber")}
          />
        </FormField>
        <FormField
          label="Tanggal Terbit"
          required
          error={errors.lhvkiIssueDate?.message}
        >
          <Input type="date" {...register("lhvkiIssueDate")} />
        </FormField>
      </div>

      <Controller
        control={control}
        name="lhvkiDocumentPath"
        render={({ field }) => (
          <FormField
            label="Upload Dokumen LHVKI"
            required
            error={errors.lhvkiDocumentPath?.message}
          >
            <FileUploadField
              namespace="certificates"
              value={field.value}
              onChange={field.onChange}
              label="Upload Dokumen LHVKI"
            />
          </FormField>
        )}
      />
    </div>
  );
}
