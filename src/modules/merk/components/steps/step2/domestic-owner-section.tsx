"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import {
  MERK_OWNER_TYPES,
  MERK_OWNER_TYPE_LABELS,
  MERK_APIU_RELATIONSHIPS,
  MERK_APIU_RELATIONSHIP_LABELS,
  MERK_APPOINTMENT_SOURCE_LABELS,
  type MerkOwnerType,
  type MerkApiuRelationship,
  type MerkWizardValues,
} from "../../../schema";
import { RadioCardGroup } from "./radio-card-group";
import { CompanySearchSelect } from "./company-search-select";
import { ApiuPlaceholderCard } from "./apiu-placeholder-card";

const OWNER_TYPE_OPTIONS = MERK_OWNER_TYPES.map((value) => ({
  value,
  label: MERK_OWNER_TYPE_LABELS[value],
}));
const API_U_RELATIONSHIP_OPTIONS = MERK_APIU_RELATIONSHIPS.map((value) => ({
  value,
  label: MERK_APIU_RELATIONSHIP_LABELS[value],
}));

type Props = { form: UseFormReturn<MerkWizardValues> };

export function DomesticOwnerSection({ form }: Props) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const ownerType = useWatch({ control, name: "ownerType" }) as MerkOwnerType | undefined;
  const relationshipWithApiu = useWatch({ control, name: "relationshipWithApiu" }) as
    | MerkApiuRelationship
    | undefined;

  function selectOwnerType(next: MerkOwnerType) {
    if (next === "company") {
      setValue("ownerName", "");
      setValue("ownerAddress", "");
    } else {
      setValue("ownerCompanyId", "");
    }
    setValue("ownerType", next, { shouldValidate: true });
  }

  function selectApiuRelationship(next: MerkApiuRelationship) {
    if (next === "apiu_is_importer") {
      setValue("appointmentSource", "brand_owner");
    } else {
      setValue("appointmentSource", undefined);
      setValue("appointmentLetterNumber", "");
      setValue("appointmentStartDate", "");
      setValue("appointmentEndDate", "");
    }
    setValue("relationshipWithApiu", next, { shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-5">
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
          <div className="mt-4">
            <Controller
              control={control}
              name="ownerCompanyId"
              render={({ field }) => (
                <CompanySearchSelect
                  label="Nama Perusahaan / Pemilik Merek"
                  required
                  error={errors.ownerCompanyId?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
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

      <section>
        <p className="mb-3 text-sm font-semibold">Hubungan dengan API-U</p>
        <FormField
          label="Hubungan dengan Perusahaan API-U"
          required
          error={errors.relationshipWithApiu?.message}
        >
          <RadioCardGroup
            value={relationshipWithApiu}
            onChange={selectApiuRelationship}
            options={API_U_RELATIONSHIP_OPTIONS}
          />
        </FormField>

        {relationshipWithApiu === "apiu_is_owner" && (
          <div className="mt-3">
            <ApiuPlaceholderCard badge="API-U + Pemilik Merek" />
          </div>
        )}

        {relationshipWithApiu === "apiu_is_importer" && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border p-3.5">
            <p className="text-xs font-semibold text-muted-foreground">Surat Penunjukan Importir</p>
            <FormField label="Pemberi Penunjukan">
              <Input value={MERK_APPOINTMENT_SOURCE_LABELS.brand_owner} disabled readOnly />
            </FormField>
            <FormField
              label="Nomor Surat Penunjukan"
              required
              error={errors.appointmentLetterNumber?.message}
            >
              <Input placeholder="e.g. SPI/2025/001" {...register("appointmentLetterNumber")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tanggal Berlaku">
                <Input type="date" {...register("appointmentStartDate")} />
              </FormField>
              <FormField label="Tanggal Berakhir">
                <Input type="date" {...register("appointmentEndDate")} />
              </FormField>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
