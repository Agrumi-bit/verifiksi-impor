"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import type { MerkWizardValues } from "../../../schema";

type Props = {
  form: UseFormReturn<MerkWizardValues>;
  onEdit: () => void;
};

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

/** Step 2 (Kepemilikan) review card — who owns the brand. The legal
 * relationship that follows from this owner is reviewed separately by
 * RepresentationReview (Step 3). */
export function OwnershipReview({ form, onEdit }: Props) {
  const { control } = form;
  const ownerLocation = useWatch({ control, name: "ownerLocation" });
  const ownerName = useWatch({ control, name: "ownerName" });
  const ownerCountryCode = useWatch({ control, name: "ownerCountryCode" });

  const { options: countryOptions } = useActiveCountries();
  const countryLabel = countryOptions.find((o) => o.value === ownerCountryCode)?.label ?? ownerCountryCode;

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Kepemilikan</p>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit Kepemilikan">
          Edit
        </Button>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <ReviewRow label="Pemilik Merek" value={ownerName} />
        <ReviewRow
          label={ownerLocation === "domestic" ? "Lokasi" : "Negara"}
          value={ownerLocation === "domestic" ? "Indonesia" : countryLabel}
        />
      </dl>
    </section>
  );
}
