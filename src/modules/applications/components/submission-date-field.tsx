"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import type { ApplicationWizardValues } from "../schema";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

/**
 * "Tanggal Pengajuan" — chosen on the wizard's last step (VIU and VKI), required before Submit, never
 * after today. Starts empty on a new application; on an Admin edit or a resubmit after a revision it is
 * prefilled with the previous value and can be changed.
 */
export function SubmissionDateField({ form }: Props) {
  const error = form.formState.errors.submissionDate?.message;

  return (
    <div className="rounded-lg border border-border p-4" data-testid="submission-date-field">
      <label htmlFor="submission-date" className="mb-1 block text-sm font-semibold">
        Tanggal Pengajuan <span className="text-destructive">*</span>
      </label>
      <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
        Tanggal permohonan ini diajukan. Tanggal inilah yang ditampilkan sebagai &ldquo;Diajukan&rdquo; di seluruh sistem;
        waktu data dibuat di sistem tetap tercatat terpisah. Boleh tanggal lampau, tidak boleh setelah hari ini.
      </p>
      <Controller
        control={form.control}
        name="submissionDate"
        render={({ field }) => (
          <input
            id="submission-date"
            type="date"
            value={field.value ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
            onBlur={field.onBlur}
            aria-invalid={error ? true : undefined}
            className="w-full max-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        )}
      />
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
