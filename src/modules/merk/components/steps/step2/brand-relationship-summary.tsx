"use client";

import { ArrowDown } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useActiveBrandOwners } from "@/modules/master-data/use-active-brand-owners";
import { MERK_AGREEMENT_TYPE_LABELS, type MerkAgreementType, type MerkWizardValues } from "../../../schema";

type Props = { form: UseFormReturn<MerkWizardValues> };

// Placeholder pending the VIU Application integration — see ApiuPlaceholderCard.
const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

function RelationshipNode({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {badge && (
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {badge}
        </span>
      )}
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pl-3.5 text-xs text-muted-foreground">
      <ArrowDown className="size-3.5" />
      {label}
    </div>
  );
}

export function BrandRelationshipSummary({ form }: Props) {
  const { control } = form;
  const values = useWatch({ control });
  const { options: countryOptions } = useActiveCountries();
  const { options: brandOwnerOptions } = useActiveBrandOwners();

  if (!values.ownerLocation) return null;

  const ownerCompanyName = brandOwnerOptions.find((o) => o.value === values.ownerCompanyId)?.label;
  const representativeName = brandOwnerOptions.find(
    (o) => o.value === values.officialRepresentativeCompanyId,
  )?.label;
  const foreignCountryLabel = countryOptions.find((o) => o.value === values.ownerCountryCode)?.label;
  const agreementLabel = values.agreementType
    ? MERK_AGREEMENT_TYPE_LABELS[values.agreementType as MerkAgreementType]
    : "Lisensi";

  const ownerTitle =
    values.ownerLocation === "domestic"
      ? values.ownerType === "company"
        ? ownerCompanyName || "Pemilik merek belum dipilih"
        : values.ownerName || "Pemilik merek belum diisi"
      : values.ownerName || "Pemilik merek belum diisi";
  const ownerCountryLabel = values.ownerLocation === "domestic" ? "Indonesia" : foreignCountryLabel;

  return (
    <section>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Ringkasan Hubungan Merek
      </p>
      <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3.5">
        <RelationshipNode title={ownerTitle} subtitle={`Pemilik Merek · ${ownerCountryLabel ?? "—"}`} />

        {values.ownerLocation === "domestic" && values.relationshipWithApiu && (
          <>
            <Connector
              label={values.relationshipWithApiu === "apiu_is_owner" ? "Pemilik Merek" : "Penunjukan Importir"}
            />
            <RelationshipNode
              title={APIU_PLACEHOLDER_NAME}
              badge={values.relationshipWithApiu === "apiu_is_owner" ? "API-U + Pemilik Merek" : "API-U"}
            />
          </>
        )}

        {values.ownerLocation === "foreign" && values.representationType === "apiu_official_representative" && (
          <>
            <Connector label={agreementLabel} />
            <RelationshipNode title={APIU_PLACEHOLDER_NAME} badge="API-U + Perwakilan Resmi" />
          </>
        )}

        {values.ownerLocation === "foreign" && values.representationType === "other_official_representative" && (
          <>
            <Connector label={agreementLabel} />
            <RelationshipNode
              title={representativeName || "Perwakilan resmi belum dipilih"}
              badge="Perwakilan Resmi"
            />
            <Connector label="Penunjukan Importir" />
            <RelationshipNode title={APIU_PLACEHOLDER_NAME} badge="API-U" />
          </>
        )}

        {values.ownerLocation === "foreign" && values.representationType === "appointed_importer" && (
          <>
            <Connector label="Penunjukan Importir" />
            <RelationshipNode title={APIU_PLACEHOLDER_NAME} badge="API-U" />
          </>
        )}
      </div>
    </section>
  );
}
