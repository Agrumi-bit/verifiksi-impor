"use client";

import type { UseFormReturn } from "react-hook-form";

import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import type { SurveyReportDraftValues } from "../../schema";

type Props = {
  form: UseFormReturn<SurveyReportDraftValues>;
  disabled?: boolean;
};

export function NotesTab({ form, disabled }: Props) {
  const { register } = form;

  return (
    <FormField
      label="Survey Notes"
      hint="Catatan umum surveyor terkait proses verifikasi lapangan — kondisi umum, kendala, atau observasi tambahan yang tidak tercakup pada checklist maupun findings."
    >
      <Textarea
        rows={10}
        placeholder="Tuliskan catatan verifikasi di sini..."
        disabled={disabled}
        {...register("notes")}
      />
    </FormField>
  );
}
