"use client";

import { useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { Check, MapPin, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocationItemFields, type CompanyAddressValues } from "@/components/wizard/locations-field";
import {
  LOCATION_TYPES,
  REQUIRED_LOCATION_TYPE_LABELS,
  createEmptyLocation,
  getRequiredLocationTypes,
  missingRequiredLocationTypes,
  type LocationType,
} from "@/modules/shared/schema";
import type { ApplicationWizardValues } from "../../schema";

const OWNERSHIP_LABEL: Record<string, string> = {
  MILIK_SENDIRI: "Milik Sendiri",
  SEWA: "Sewa",
};

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  companyAddress?: CompanyAddressValues;
  availableTypes?: readonly LocationType[];
  typeHint?: string;
};

export function VkiStep5Locations({ form, companyAddress, availableTypes = LOCATION_TYPES, typeHint }: Props) {
  const { control } = form;
  // react-hook-form's default keyName is "id", which would clobber the real
  // location id (locationSchema also has its own `id` field) — use a distinct
  // keyName so `field.id` still reflects the actual business id below.
  const { fields, append, remove } = useFieldArray({ control, name: "locations", keyName: "fieldKey" });
  const verificationType = useWatch({ control, name: "verificationType" }) === "VKI" ? "VKI" : "VIU";

  // Locations already on the company record (pulled in at Step 1) are locked/read-only.
  // Anything appended afterwards via "+ Tambah Lokasi" is a new site for this
  // application and gets the full editable location form.
  const [lockedIds] = useState(() => new Set(form.getValues("locations").map((l) => l.id)));

  const requiredTypes = getRequiredLocationTypes(verificationType);
  const presentTypes = new Set(fields.map((f) => f.locationType));
  const missingTypes = missingRequiredLocationTypes(fields, verificationType);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">Company Locations</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lokasi milik perusahaan diambil otomatis dan tidak perlu diisi ulang. Tambahkan lokasi baru jika ada
            fasilitas yang belum terdaftar di data perusahaan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <span className="text-xs font-semibold text-muted-foreground">Lokasi wajib:</span>
        {requiredTypes.map((type) => {
          const present = presentTypes.has(type);
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                present ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
              }`}
            >
              {present ? <Check className="size-3" /> : <X className="size-3" />}
              {REQUIRED_LOCATION_TYPE_LABELS[type]}
            </span>
          );
        })}
      </div>

      {missingTypes.length > 0 && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {missingTypes.map((type) => `Lokasi ${REQUIRED_LOCATION_TYPE_LABELS[type]} wajib ditambahkan`).join(". ")}.
          Tambahkan lewat tombol &quot;Tambah Lokasi&quot; di bawah, atau lengkapi dulu di profil perusahaan supaya
          lokasi ini otomatis terisi di sini.
        </p>
      )}

      {fields.map((field, index) =>
        lockedIds.has(field.id) ? (
          <LockedLocationCard key={field.fieldKey} location={field} />
        ) : (
          <LocationItemFields
            key={field.fieldKey}
            form={form}
            index={index}
            onRemove={() => remove(index)}
            canRemove
            availableTypes={availableTypes}
            typeHint={typeHint}
            companyAddress={companyAddress}
          />
        ),
      )}

      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptyLocation() as any)}
      >
        <Plus className="size-4" />
        Tambah Lokasi
      </Button>
    </div>
  );
}

function LockedLocationCard({ location }: { location: ApplicationWizardValues["locations"][number] }) {
  const cityProvince = [location.city, location.province].filter(Boolean).join(", ");
  const street = [location.address, location.addressDesa, location.addressKecamatan].filter(Boolean).join(", ");
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{location.locationType}</div>
        <div className="mt-2 text-sm font-semibold text-primary">{street}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {cityProvince}
          <br />
          {location.country} {location.postalCode}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
          {OWNERSHIP_LABEL[location.buildingStatus] ?? location.buildingStatus}
        </span>
      </div>
    </div>
  );
}
