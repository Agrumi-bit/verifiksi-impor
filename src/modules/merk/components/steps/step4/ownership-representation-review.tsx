"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useActiveBrandOwners } from "@/modules/master-data/use-active-brand-owners";
import {
  MERK_APIU_RELATIONSHIP_LABELS,
  MERK_AGREEMENT_TYPE_LABELS,
  type MerkApiuRelationship,
  type MerkRepresentationType,
  type MerkAgreementType,
  type MerkWizardValues,
} from "../../../schema";

// Placeholder pending the VIU Application integration (see the Step 2
// ApiuPlaceholderCard note) — there is no real applicant-company record to
// show as "Importir"/"API-U" yet.
const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

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

function dateRangeLabel(start: string | undefined, end: string | undefined): string | undefined {
  if (!start && !end) return undefined;
  const fmt = (v: string | undefined) =>
    v ? new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  return `${fmt(start)} — ${fmt(end)}`;
}

export function OwnershipRepresentationReview({ form, onEdit }: Props) {
  const { control } = form;
  const values = {
    ownerLocation: useWatch({ control, name: "ownerLocation" }),
    ownerType: useWatch({ control, name: "ownerType" }),
    ownerCompanyId: useWatch({ control, name: "ownerCompanyId" }),
    ownerName: useWatch({ control, name: "ownerName" }),
    ownerCountryCode: useWatch({ control, name: "ownerCountryCode" }),
    relationshipWithApiu: useWatch({ control, name: "relationshipWithApiu" }) as
      | MerkApiuRelationship
      | undefined,
    representationType: useWatch({ control, name: "representationType" }) as
      | MerkRepresentationType
      | undefined,
    officialRepresentativeCompanyId: useWatch({ control, name: "officialRepresentativeCompanyId" }),
    agreementType: useWatch({ control, name: "agreementType" }) as MerkAgreementType | undefined,
    agreementNumber: useWatch({ control, name: "agreementNumber" }),
    agreementStartDate: useWatch({ control, name: "agreementStartDate" }),
    agreementEndDate: useWatch({ control, name: "agreementEndDate" }),
    appointmentLetterNumber: useWatch({ control, name: "appointmentLetterNumber" }),
    appointmentStartDate: useWatch({ control, name: "appointmentStartDate" }),
    appointmentEndDate: useWatch({ control, name: "appointmentEndDate" }),
  };

  const { options: countryOptions } = useActiveCountries();
  const { options: brandOwnerOptions } = useActiveBrandOwners();
  const ownerCompanyName = brandOwnerOptions.find((o) => o.value === values.ownerCompanyId)?.label;
  const representativeName = brandOwnerOptions.find(
    (o) => o.value === values.officialRepresentativeCompanyId,
  )?.label;
  const countryLabel =
    countryOptions.find((o) => o.value === values.ownerCountryCode)?.label ?? values.ownerCountryCode;

  const ownerTitle =
    values.ownerLocation === "domestic"
      ? values.ownerType === "company"
        ? ownerCompanyName
        : values.ownerName
      : values.ownerName;

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Kepemilikan &amp; Perwakilan</p>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit Kepemilikan & Perwakilan">
          Edit
        </Button>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <ReviewRow label="Pemilik Merek" value={ownerTitle} />
        <ReviewRow label={values.ownerLocation === "domestic" ? "Lokasi" : "Negara"} value={values.ownerLocation === "domestic" ? "Indonesia" : countryLabel} />

        {values.ownerLocation === "domestic" && (
          <>
            <ReviewRow
              label="Hubungan dengan API-U"
              value={values.relationshipWithApiu && MERK_APIU_RELATIONSHIP_LABELS[values.relationshipWithApiu]}
            />
            {values.relationshipWithApiu === "apiu_is_importer" && (
              <>
                <ReviewRow label="Importir" value={APIU_PLACEHOLDER_NAME} />
                <ReviewRow label="Nomor Surat Penunjukan" value={values.appointmentLetterNumber} />
                <ReviewRow
                  label="Masa Berlaku"
                  value={dateRangeLabel(values.appointmentStartDate, values.appointmentEndDate)}
                />
              </>
            )}
          </>
        )}

        {values.ownerLocation === "foreign" && values.representationType === "apiu_official_representative" && (
          <>
            <ReviewRow label="Perwakilan Resmi" value={APIU_PLACEHOLDER_NAME} />
            <ReviewRow label="Peran" value="API-U + Perwakilan Resmi" />
            <ReviewRow
              label="Jenis Perjanjian"
              value={values.agreementType && MERK_AGREEMENT_TYPE_LABELS[values.agreementType]}
            />
            <ReviewRow label="Nomor Perjanjian" value={values.agreementNumber} />
            <ReviewRow
              label="Masa Berlaku"
              value={dateRangeLabel(values.agreementStartDate, values.agreementEndDate)}
            />
          </>
        )}

        {values.ownerLocation === "foreign" && values.representationType === "other_official_representative" && (
          <>
            <ReviewRow label="Perwakilan Resmi" value={representativeName} />
            <ReviewRow label="Importir" value={APIU_PLACEHOLDER_NAME} />
            <ReviewRow label="Nomor Surat Penunjukan Importir" value={values.appointmentLetterNumber} />
            <ReviewRow
              label="Masa Berlaku"
              value={dateRangeLabel(values.appointmentStartDate, values.appointmentEndDate)}
            />
          </>
        )}

        {values.ownerLocation === "foreign" && values.representationType === "appointed_importer" && (
          <>
            <ReviewRow label="Peran API-U" value="Importir yang Ditunjuk" />
            <ReviewRow
              label={
                values.officialRepresentativeCompanyId
                  ? "Penunjukan dari Perwakilan Resmi"
                  : "Penunjukan dari Pemilik Merek"
              }
              value={values.officialRepresentativeCompanyId ? representativeName : values.ownerName}
            />
            <ReviewRow label="Nomor Surat Penunjukan" value={values.appointmentLetterNumber} />
            <ReviewRow
              label="Masa Berlaku"
              value={dateRangeLabel(values.appointmentStartDate, values.appointmentEndDate)}
            />
          </>
        )}
      </dl>
    </section>
  );
}
