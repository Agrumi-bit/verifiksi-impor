"use client";

import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { createEmptyEvidence, type SurveyReportDraftValues } from "../../schema";

type Props = {
  form: UseFormReturn<SurveyReportDraftValues>;
  disabled?: boolean;
};

export function EvidenceTab({ form, disabled }: Props) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "evidence" });
  const errors = formState.errors.evidence;

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Unggah foto atau dokumen sebagai bukti hasil verifikasi lapangan (mesin, fasilitas,
        dokumen fisik, dll).
      </p>

      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Evidence {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => remove(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Hapus
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Nama Bukti"
              required
              error={errors?.[index]?.label?.message}
            >
              <Input
                placeholder="e.g. Foto Mesin Produksi"
                disabled={disabled}
                {...register(`evidence.${index}.label`)}
              />
            </FormField>
            <FormField label="Kategori">
              <Input
                placeholder="e.g. Alamat Lokasi"
                disabled={disabled}
                {...register(`evidence.${index}.category`)}
              />
            </FormField>
          </div>
          <Controller
            control={control}
            name={`evidence.${index}.filePath`}
            render={({ field: fileField }) => (
              <FormField label="File" required error={errors?.[index]?.filePath?.message}>
                <FileUploadField
                  namespace="inspection"
                  value={fileField.value}
                  onChange={fileField.onChange}
                  label="Upload Evidence"
                />
              </FormField>
            )}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        disabled={disabled}
        onClick={() => append(createEmptyEvidence() as never)}
      >
        <Plus className="size-4" />
        Add Evidence
      </Button>
    </div>
  );
}
