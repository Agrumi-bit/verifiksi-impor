"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import type { MerkWizardValues } from "../../../schema";

type Props = { form: UseFormReturn<MerkWizardValues> };

export function FinalDeclaration({ form }: Props) {
  const { control, formState } = form;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-xs text-destructive/90">
        Dengan ini saya menyatakan bahwa semua data dan dokumen yang diisi dalam pendaftaran
        merek ini adalah benar, akurat, dan asli. Saya memahami bahwa apabila di kemudian hari
        ditemukan data atau dokumen yang palsu atau tidak sesuai, saya bersedia menerima
        pembatalan pendaftaran merek, sanksi administratif, dan tanggung jawab hukum sesuai
        peraturan perundang-undangan yang berlaku di Indonesia.
      </p>

      <Controller
        control={control}
        name="declarationAccepted"
        render={({ field }) => (
          <label
            htmlFor="declaration-accepted"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-background p-3 text-xs"
          >
            <Checkbox
              id="declaration-accepted"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              aria-required="true"
            />
            <span>
              Saya memastikan data dan dokumen merek yang disampaikan telah benar dan sesuai
              dengan dokumen pendukung.
            </span>
          </label>
        )}
      />
      {formState.errors.declarationAccepted && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {formState.errors.declarationAccepted.message}
        </p>
      )}
    </section>
  );
}
