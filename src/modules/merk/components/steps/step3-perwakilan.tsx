"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import type { MerkOwnerLocation, MerkWizardValues } from "../../schema";
import { DomesticOwnerRelationship } from "./step2/domestic-owner-relationship";
import { ForeignOwnerRepresentation } from "./step2/foreign-owner-representation";
import { BrandRelationshipSummary } from "./step2/brand-relationship-summary";

type Props = { form: UseFormReturn<MerkWizardValues> };

/**
 * Step 3 — Perwakilan: the legal relationship that follows from the owner
 * chosen in Step 2 (API-U relationship for a domestic owner, representation/
 * agreement/appointment for a foreign owner). ownerLocation itself is
 * read-only here — it was already decided in Step 2.
 */
export function Step3Perwakilan({ form }: Props) {
  const { control } = form;
  const ownerLocation = useWatch({ control, name: "ownerLocation" }) as MerkOwnerLocation | undefined;

  return (
    <div className="flex flex-col gap-6">
      {ownerLocation === "domestic" && (
        <div className="rounded-xl border border-border p-4">
          <DomesticOwnerRelationship form={form} />
        </div>
      )}
      {ownerLocation === "foreign" && (
        <div className="rounded-xl border border-border p-4">
          <ForeignOwnerRepresentation form={form} />
        </div>
      )}

      <BrandRelationshipSummary form={form} />
    </div>
  );
}
