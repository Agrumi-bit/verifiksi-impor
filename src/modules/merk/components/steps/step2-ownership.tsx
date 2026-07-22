"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import type { MerkWizardValues } from "../../schema";

type Props = {
  form: UseFormReturn<MerkWizardValues>;
};

export function Step2Ownership({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const ownershipType = useWatch({ control, name: "ownershipType" });

  return (
    <div className="flex flex-col gap-4">
      <FormField
        label="Status Kepemilikan Merek"
        required
        error={errors.ownershipType?.message}
      >
        <Controller
          control={control}
          name="ownershipType"
          render={({ field }) => (
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
              {(
                [
                  ["MILIK_SENDIRI", "Milik Sendiri"],
                  ["LISENSI", "Lisensi"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={
                    field.value === value
                      ? "bg-amber-500 px-3 py-2 text-sm font-medium text-white"
                      : "bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        />
      </FormField>

      <FormField
        label="Nama Pemilik Merek"
        required
        error={errors.brandOwnerName?.message}
        hint={
          ownershipType === "LISENSI"
            ? "Nama pemilik asli merek yang memberikan lisensi."
            : undefined
        }
      >
        <Input
          placeholder="e.g. PT Textile Indonesia"
          {...register("brandOwnerName")}
        />
      </FormField>

      {ownershipType === "LISENSI" && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nomor Perjanjian Lisensi"
              required
              error={errors.licenseAgreementNumber?.message}
            >
              <Input
                placeholder="e.g. LIC/2026/001"
                {...register("licenseAgreementNumber")}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Tanggal Mulai Lisensi"
              required
              error={errors.licenseStartDate?.message}
            >
              <Input type="date" {...register("licenseStartDate")} />
            </FormField>
            <FormField
              label="Tanggal Berakhir Lisensi"
              required
              error={errors.licenseEndDate?.message}
            >
              <Input type="date" {...register("licenseEndDate")} />
            </FormField>
          </div>
          <Controller
            control={control}
            name="licenseDocumentPath"
            render={({ field }) => (
              <FormField
                label="Upload Dokumen Perjanjian Lisensi"
                required
                error={errors.licenseDocumentPath?.message}
              >
                <FileUploadField
                  namespace="documents"
                  value={field.value}
                  onChange={field.onChange}
                  label="Upload Dokumen Perjanjian Lisensi"
                />
              </FormField>
            )}
          />
        </div>
      )}
    </div>
  );
}
