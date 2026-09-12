"use client";

import { useEffect, useRef } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { FormField } from "@/components/form/form-field";
import {
  MERK_OWNER_LOCATIONS,
  MERK_OWNER_LOCATION_LABELS,
  MERK_OWNER_LOCATION_DESCRIPTIONS,
  type MerkOwnerLocation,
  type MerkWizardValues,
} from "../../schema";
import { RadioCardGroup } from "./step2/radio-card-group";
import { DomesticOwnerOwnership } from "./step2/domestic-owner-ownership";
import { ForeignOwnerOwnership } from "./step2/foreign-owner-ownership";

type Props = { form: UseFormReturn<MerkWizardValues> };

const OWNER_LOCATION_OPTIONS = MERK_OWNER_LOCATIONS.map((value) => ({
  value,
  label: MERK_OWNER_LOCATION_LABELS[value],
  description: MERK_OWNER_LOCATION_DESCRIPTIONS[value],
}));

// Every field that only belongs to one of the two ownerLocation branches —
// cleared on the branch that's no longer selected so a stale value from a
// scenario the user backed out of never reaches the submit payload. Spans
// both this step's own fields and Step 3 (Perwakilan)'s, since switching
// ownerLocation invalidates that whole downstream branch too.
const DOMESTIC_ONLY_FIELDS = ["ownerType", "ownerCompanyId", "relationshipWithApiu"] as const;
const FOREIGN_ONLY_FIELDS = [
  "foreignEntityType",
  "ownerCountryCode",
  "foreignRegistrationNumber",
  "representationType",
  "officialRepresentativeCompanyId",
  "agreementType",
  "agreementNumber",
  "agreementStartDate",
  "agreementEndDate",
] as const;
// ownerName/ownerAddress/appointment* are intentionally NOT cleared here —
// they're shared concepts (see schema.ts) that stay meaningful across a
// domestic↔foreign switch for an individual/foreign owner.

export function Step2Kepemilikan({ form }: Props) {
  const { control, setValue } = form;
  const ownerLocation = useWatch({ control, name: "ownerLocation" }) as MerkOwnerLocation | undefined;
  const countryOfOrigin = useWatch({ control, name: "countryOfOrigin" });
  const hasAppliedDefault = useRef(false);

  // One-time default from Step 1's country — never runs again once the user
  // has made (or the default has made) a selection, so a later edit to Step
  // 1's country doesn't silently flip this choice back.
  useEffect(() => {
    if (hasAppliedDefault.current || ownerLocation) return;
    hasAppliedDefault.current = true;
    const isIndonesia = countryOfOrigin?.trim().toLowerCase() === "indonesia";
    setValue("ownerLocation", isIndonesia ? "domestic" : "foreign");
    if (!isIndonesia && countryOfOrigin) {
      setValue("ownerCountryCode", countryOfOrigin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately one-time
  }, []);

  function selectOwnerLocation(next: MerkOwnerLocation) {
    const staleFields = next === "domestic" ? FOREIGN_ONLY_FIELDS : DOMESTIC_ONLY_FIELDS;
    for (const field of staleFields) setValue(field, undefined);
    if (next === "foreign" && !form.getValues("ownerCountryCode") && countryOfOrigin) {
      setValue("ownerCountryCode", countryOfOrigin);
    }
    setValue("ownerLocation", next, { shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">Lokasi Pemilik Merek</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Tentukan pemilik merek. Hubungan hukum dengan Perwakilan Resmi dan perusahaan API-U
          dilengkapi pada Step 3 — Perwakilan.
        </p>
        <FormField
          label="Lokasi Pemilik Merek"
          required
          error={form.formState.errors.ownerLocation?.message}
        >
          <RadioCardGroup
            value={ownerLocation}
            onChange={selectOwnerLocation}
            options={OWNER_LOCATION_OPTIONS}
            columns={2}
          />
        </FormField>
      </section>

      {ownerLocation === "domestic" && (
        <div className="rounded-xl border border-border p-4">
          <DomesticOwnerOwnership form={form} />
        </div>
      )}
      {ownerLocation === "foreign" && (
        <div className="rounded-xl border border-border p-4">
          <ForeignOwnerOwnership form={form} />
        </div>
      )}
    </div>
  );
}
