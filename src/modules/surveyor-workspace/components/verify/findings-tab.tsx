"use client";

import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import {
  createEmptyFinding,
  FINDING_SEVERITIES,
  type FindingSeverity,
  type SurveyReportDraftValues,
} from "../../schema";

const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  MINOR: "Minor",
  MAJOR: "Major",
  CRITICAL: "Critical",
};

type Props = {
  form: UseFormReturn<SurveyReportDraftValues>;
  disabled?: boolean;
};

export function FindingsTab({ form, disabled }: Props) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "findings" });
  const errors = formState.errors.findings;

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Belum ada temuan. Jika verifikasi tidak menemukan masalah, tab ini dapat dikosongkan.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Temuan {index + 1}</p>
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
            <FormField label="Judul Temuan" required error={errors?.[index]?.title?.message}>
              <Input
                placeholder="e.g. Mesin tidak sesuai daftar"
                disabled={disabled}
                {...register(`findings.${index}.title`)}
              />
            </FormField>
            <FormField label="Tingkat Keparahan" required>
              <Controller
                control={control}
                name={`findings.${index}.severity`}
                render={({ field: severityField }) => (
                  <Select
                    value={severityField.value}
                    onValueChange={severityField.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          value ? SEVERITY_LABELS[value as FindingSeverity] : "Pilih tingkat..."
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FINDING_SEVERITIES.map((severity) => (
                        <SelectItem key={severity} value={severity}>
                          {SEVERITY_LABELS[severity]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <FormField
            label="Deskripsi"
            required
            error={errors?.[index]?.description?.message}
          >
            <Textarea
              placeholder="Jelaskan temuan secara detail..."
              disabled={disabled}
              {...register(`findings.${index}.description`)}
            />
          </FormField>
          <Controller
            control={control}
            name={`findings.${index}.photoPath`}
            render={({ field: photoField }) => (
              <FormField label="Foto Pendukung (opsional)">
                <FileUploadField
                  namespace="photos"
                  value={photoField.value}
                  onChange={photoField.onChange}
                  label="Upload Foto Temuan"
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
        onClick={() => append(createEmptyFinding() as never)}
      >
        <Plus className="size-4" />
        Add Finding
      </Button>
    </div>
  );
}
