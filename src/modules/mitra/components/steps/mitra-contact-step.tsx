"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";

type ContactFields = {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type Props<T extends FieldValues & ContactFields> = {
  form: UseFormReturn<T>;
};

export function MitraContactStep<T extends FieldValues & ContactFields>({
  form,
}: Props<T>) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <FormField
        label="Nama Kontak"
        required
        error={errors.contactName?.message as string | undefined}
      >
        <Input
          placeholder="e.g. Budi Santoso"
          {...register("contactName" as Path<T>)}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nomor Telepon"
          required
          error={errors.contactPhone?.message as string | undefined}
        >
          <Input
            placeholder="+62 812 3456 7890"
            {...register("contactPhone" as Path<T>)}
          />
        </FormField>
        <FormField
          label="Email"
          required
          error={errors.contactEmail?.message as string | undefined}
        >
          <Input
            type="email"
            placeholder="contact@mitra.co.id"
            {...register("contactEmail" as Path<T>)}
          />
        </FormField>
      </div>
    </div>
  );
}
