"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS, type PartnerWizardValues } from "@/modules/partner/schema";

type Props = {
  form: UseFormReturn<PartnerWizardValues>;
};

export function Step2ContractDetail({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const companyName = form.watch("companyName");
  const type = form.watch("type");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3.5">
        <div className="text-xs text-muted-foreground">Perusahaan Terpilih</div>
        <div className="mt-0.5 text-sm font-semibold">{companyName}</div>
      </div>

      <FormField label="Jenis Partner" required error={errors.type?.message}>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
              {PARTNER_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => field.onChange(option)}
                  className={
                    type === option
                      ? "bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                      : "bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50"
                  }
                >
                  {PARTNER_TYPE_LABELS[option]}
                </button>
              ))}
            </div>
          )}
        />
      </FormField>

      <FormField label="Nomor Kontrak" required error={errors.contractNumber?.message}>
        <Input placeholder="Contoh: 012/MoU/2026" {...register("contractNumber")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tanggal Mulai" required error={errors.contractStartDate?.message}>
          <Input type="date" {...register("contractStartDate")} />
        </FormField>
        <FormField label="Tanggal Berakhir" required error={errors.contractEndDate?.message}>
          <Input type="date" {...register("contractEndDate")} />
        </FormField>
      </div>

      <Controller
        control={control}
        name="contractDocumentPath"
        render={({ field }) => (
          <FormField label="Bukti Kontrak" error={errors.contractDocumentPath?.message}>
            <FileUploadField
              namespace="documents"
              value={field.value}
              onChange={field.onChange}
              label="Upload Bukti Kontrak"
              accept=".pdf,application/pdf"
            />
          </FormField>
        )}
      />
    </div>
  );
}
