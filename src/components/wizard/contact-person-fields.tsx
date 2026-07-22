"use client";

import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import type { ContactPersonValues } from "@/modules/shared/schema";

type Props<T extends FieldValues & ContactPersonValues> = {
  form: UseFormReturn<T>;
};

export function ContactPersonFields<T extends FieldValues & ContactPersonValues>({
  form,
}: Props<T>) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold">Contact Information</h2>
        <p className="text-xs text-muted-foreground">
          Informasi kontak penanggung jawab
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Full Name"
          htmlFor="contactFullName"
          required
          error={errors.contactFullName?.message as string | undefined}
          hint="Nama lengkap penanggung jawab."
        >
          <Input
            id="contactFullName"
            placeholder="e.g. Ahmad Fauzi"
            {...register("contactFullName" as Path<T>)}
          />
        </FormField>
        <FormField
          label="Designation"
          htmlFor="contactDesignation"
          required
          error={errors.contactDesignation?.message as string | undefined}
          hint="Jabatan dalam perusahaan."
        >
          <Input
            id="contactDesignation"
            placeholder="Pilih atau ketik jabatan..."
            {...register("contactDesignation" as Path<T>)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Email"
          htmlFor="contactEmail"
          required
          error={errors.contactEmail?.message as string | undefined}
          hint="Alamat email kontak penanggung jawab."
        >
          <Input
            id="contactEmail"
            type="email"
            placeholder="ahmad.fauzi@textileindonesia.co.id"
            {...register("contactEmail" as Path<T>)}
          />
        </FormField>
        <FormField
          label="Phone Number"
          htmlFor="contactPhone"
          required
          error={errors.contactPhone?.message as string | undefined}
          hint="Nomor telepon atau handphone yang dapat dihubungi."
        >
          <Input
            id="contactPhone"
            type="tel"
            placeholder="+62 812 3456 7890"
            {...register("contactPhone" as Path<T>)}
          />
        </FormField>
      </div>
    </section>
  );
}
