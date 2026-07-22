"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import type { ApplicationWizardValues } from "../../schema";

type Step8Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

export function Step8Submit({ form }: Step8Props) {
  const { control, formState } = form;

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Permohonan siap disubmit. Setelah disubmit, sistem akan membuat nomor
        aplikasi dan status permohonan berubah menjadi <b>Submitted</b>.
        Pastikan seluruh data pada step sebelumnya sudah benar.
      </p>

      <Controller
        control={control}
        name="declarationAccepted"
        render={({ field }) => (
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <span>
              Saya menyatakan bahwa seluruh data dan dokumen yang diisi dalam
              permohonan ini adalah benar dan dapat dipertanggungjawabkan.
            </span>
          </label>
        )}
      />
      {formState.errors.declarationAccepted && (
        <p className="text-xs text-destructive">
          {formState.errors.declarationAccepted.message}
        </p>
      )}
    </div>
  );
}
