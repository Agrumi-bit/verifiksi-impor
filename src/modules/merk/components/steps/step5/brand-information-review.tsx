"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useActiveTrademarkClasses } from "@/modules/master-data/use-active-trademark-classes";
import {
  MERK_EVIDENCE_TYPE_LABELS,
  MERK_EVIDENCE_TYPES_WITH_OPTIONAL_DATE,
  type MerkEvidenceType,
  type MerkWizardValues,
} from "../../../schema";

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

export function BrandInformationReview({ form, onEdit }: Props) {
  const { control } = form;
  const brandName = useWatch({ control, name: "brandName" });
  const countryOfOrigin = useWatch({ control, name: "countryOfOrigin" });
  const evidenceType = useWatch({ control, name: "evidenceType" }) as MerkEvidenceType | undefined;
  const registrationNumber = useWatch({ control, name: "registrationNumber" });
  const registrationIssuer = useWatch({ control, name: "registrationIssuer" });
  const registrationDate = useWatch({ control, name: "registrationDate" });
  const trademarkClass = useWatch({ control, name: "trademarkClass" });
  const trademarkClassDescription = useWatch({ control, name: "trademarkClassDescription" });
  const merekStatusLabel = useWatch({ control, name: "merekStatusLabel" });
  const logoPath = useWatch({ control, name: "logoPath" });

  const { options: countryOptions } = useActiveCountries();
  const { options: trademarkClassOptions } = useActiveTrademarkClasses();
  const countryLabel = countryOptions.find((o) => o.value === countryOfOrigin)?.label ?? countryOfOrigin;
  const classInfo = trademarkClassOptions.find((c) => c.value === trademarkClass);
  const dateLabel = evidenceType && MERK_EVIDENCE_TYPES_WITH_OPTIONAL_DATE.includes(evidenceType)
    ? "Tanggal Penerbitan"
    : "Tanggal Registrasi / Notifikasi";

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Informasi Merek</p>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit Informasi Merek">
          Edit
        </Button>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <ReviewRow label="Nama Merek" value={brandName} />
        <ReviewRow label="Negara Pemilik Merek" value={countryLabel} />
        <ReviewRow label="Jenis Bukti Merek" value={evidenceType && MERK_EVIDENCE_TYPE_LABELS[evidenceType]} />
        <ReviewRow label="Nomor Sertifikat / Pendaftaran" value={registrationNumber} />
        <ReviewRow label="Lembaga Penerbit" value={registrationIssuer} />
        <ReviewRow
          label={dateLabel}
          value={registrationDate ? new Date(registrationDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : undefined}
        />
        <ReviewRow label="Kelas Merek" value={trademarkClass ? `${trademarkClass} — ${classInfo?.hint ?? ""}` : undefined} />
        <ReviewRow label="Status Merek" value={merekStatusLabel} />
        <ReviewRow label="Logo Merek" value={logoPath ? logoPath.split("/").pop() : "Tidak diunggah"} />
        <div className="sm:col-span-2">
          <ReviewRow label="Uraian Kelas Merek" value={trademarkClassDescription} />
        </div>
      </dl>
    </section>
  );
}
