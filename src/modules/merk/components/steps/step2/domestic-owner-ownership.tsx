"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import {
  MERK_OWNER_TYPES,
  MERK_OWNER_TYPE_LABELS,
  type MerkOwnerType,
  type MerkWizardValues,
} from "../../../schema";
import { RadioCardGroup } from "./radio-card-group";

const OWNER_TYPE_OPTIONS = MERK_OWNER_TYPES.map((value) => ({
  value,
  label: MERK_OWNER_TYPE_LABELS[value],
}));

type Props = { form: UseFormReturn<MerkWizardValues> };

/** Step 2 (Kepemilikan) — domestic branch. Just "who owns the brand"; the
 * API-U relationship this owner has (previously bundled into the same
 * section) now lives in Step 3 — see DomesticOwnerRelationship. */
export function DomesticOwnerOwnership({ form }: Props) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const ownerType = useWatch({ control, name: "ownerType" }) as MerkOwnerType | undefined;

  function selectOwnerType(next: MerkOwnerType) {
    // ownerCompanyId is a legacy field — Pemilik Merek is manual free text
    // for both "company" and "individual" now, so ownerName/ownerAddress
    // carry over across the switch instead of being cleared.
    setValue("ownerCompanyId", "");
    setValue("ownerType", next, { shouldValidate: true });
  }

  return (
    <section>
      <p className="mb-3 text-sm font-semibold">Pemilik Merek</p>

      <FormField label="Jenis Pemilik" required error={errors.ownerType?.message}>
        <RadioCardGroup
          value={ownerType}
          onChange={selectOwnerType}
          options={OWNER_TYPE_OPTIONS}
          columns={2}
        />
      </FormField>

      {ownerType === "company" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Nama Perusahaan / Pemilik Merek"
            required
            error={errors.ownerName?.message}
          >
            <Input placeholder="Nama perusahaan pemilik merek" {...register("ownerName")} />
          </FormField>
          <FormField label="Negara">
            <Input value="Indonesia" disabled readOnly />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Alamat" required error={errors.ownerAddress?.message}>
              <Input placeholder="Alamat perusahaan" {...register("ownerAddress")} />
            </FormField>
          </div>
        </div>
      )}

      {ownerType === "individual" && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Nama Pemilik Merek" required error={errors.ownerName?.message}>
            <Input placeholder="Nama lengkap" {...register("ownerName")} />
          </FormField>
          <FormField label="Negara">
            <Input value="Indonesia" disabled readOnly />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Alamat" required error={errors.ownerAddress?.message}>
              <Input placeholder="Alamat sesuai identitas" {...register("ownerAddress")} />
            </FormField>
          </div>
        </div>
      )}
    </section>
  );
}
