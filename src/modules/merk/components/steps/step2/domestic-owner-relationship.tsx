"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import {
  MERK_APIU_RELATIONSHIPS,
  MERK_APIU_RELATIONSHIP_LABELS,
  MERK_APPOINTMENT_SOURCE_LABELS,
  type MerkApiuRelationship,
  type MerkWizardValues,
} from "../../../schema";
import { RadioCardGroup } from "./radio-card-group";
import { ApiuPlaceholderCard } from "./apiu-placeholder-card";

const API_U_RELATIONSHIP_OPTIONS = MERK_APIU_RELATIONSHIPS.map((value) => ({
  value,
  label: MERK_APIU_RELATIONSHIP_LABELS[value],
}));

type Props = { form: UseFormReturn<MerkWizardValues> };

/** Step 3 (Perwakilan) — domestic branch. The domestic owner chosen in Step
 * 2 doesn't need a separate "representative" concept the way a foreign owner
 * does — what it needs instead is its legal relationship to the applicant
 * API-U, which is what drives whether an importer-appointment document is
 * required. */
export function DomesticOwnerRelationship({ form }: Props) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const relationshipWithApiu = useWatch({ control, name: "relationshipWithApiu" }) as
    | MerkApiuRelationship
    | undefined;

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
  );
}
