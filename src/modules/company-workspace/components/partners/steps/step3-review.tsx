"use client";

import type { UseFormReturn } from "react-hook-form";

import { PARTNER_TYPE_LABELS, type PartnerWizardValues } from "@/modules/partner/schema";

type Props = {
  form: UseFormReturn<PartnerWizardValues>;
};

function ReviewItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

export function Step3Review({ form }: Props) {
  const values = form.watch();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Periksa kembali sebelum menyimpan relasi partner.</p>
      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-2">
        <ReviewItem label="Perusahaan" value={values.companyName} />
        <ReviewItem label="Jenis Partner" value={values.type ? PARTNER_TYPE_LABELS[values.type] : undefined} />
        <ReviewItem label="NIB" value={values.nibNumber} />
        <ReviewItem label="NPWP" value={values.npwpInput} />
        <ReviewItem label="SK Kemenkumham" value={values.skInput} />
        <ReviewItem label="Nomor Kontrak" value={values.contractNumber} />
        <ReviewItem
          label="Masa Berlaku"
          value={
            values.contractStartDate && values.contractEndDate
              ? `${values.contractStartDate} — ${values.contractEndDate}`
              : undefined
          }
        />
        <ReviewItem label="Bukti Kontrak" value={values.contractDocumentPath ? "Terunggah" : "Belum diunggah"} />
      </dl>
    </div>
  );
}
