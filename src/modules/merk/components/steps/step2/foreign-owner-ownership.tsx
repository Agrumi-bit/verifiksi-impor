"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { NativeSelect } from "@/components/form/native-select";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import {
  MERK_FOREIGN_ENTITY_TYPES,
  MERK_FOREIGN_ENTITY_TYPE_LABELS,
  type MerkWizardValues,
} from "../../../schema";

type Props = { form: UseFormReturn<MerkWizardValues> };

/** Step 2 (Kepemilikan) — foreign branch. How this owner is represented in
 * Indonesia (formerly a dedicated Perwakilan step) is no longer collected
 * here; it's captured per VIU Application instead (see
 * modules/applications/viu-brand-relationship-rules.ts). */
export function ForeignOwnerOwnership({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const { options: countryOptions } = useActiveCountries();

  return (
    <section>
      <p className="mb-3 text-sm font-semibold">Pemilik Merek Luar Negeri</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nama Pemilik Merek" required error={errors.ownerName?.message}>
          <Input placeholder="e.g. Nike, Inc." {...register("ownerName")} />
        </FormField>
        <FormField label="Jenis Entitas">
          <NativeSelect {...register("foreignEntityType")} defaultValue="">
            <option value="" disabled>
              Pilih jenis entitas
            </option>
            {MERK_FOREIGN_ENTITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {MERK_FOREIGN_ENTITY_TYPE_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </FormField>

        <Controller
          control={control}
          name="ownerCountryCode"
          render={({ field }) => (
            <FormField label="Negara" required error={errors.ownerCountryCode?.message}>
              <SearchSelectInput
                value={field.value ?? ""}
                onChange={field.onChange}
                options={countryOptions}
                allowFreeText={false}
                placeholder="Pilih negara"
              />
            </FormField>
          )}
        />
        <FormField label="Registration Number" hint="Nomor registrasi perusahaan di negara asal (opsional).">
          <Input placeholder="Opsional" {...register("foreignRegistrationNumber")} />
        </FormField>

        <div className="sm:col-span-2">
          <FormField label="Alamat" required error={errors.ownerAddress?.message}>
            <Input placeholder="Alamat pemilik merek" {...register("ownerAddress")} />
          </FormField>
        </div>
      </div>
    </section>
  );
}
