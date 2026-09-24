"use client";

import type { UseFormReturn } from "react-hook-form";

import { PARTNER_TYPE_LABELS, type PartnerWizardValues } from "../../schema";

type Props = {
  form: UseFormReturn<PartnerWizardValues>;
};

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-[#8a7565]">{label}</span>
      <span className="font-bold text-[#20180f]">{value || "—"}</span>
    </div>
  );
}

export function PartnerReviewStep({ form }: Props) {
  const values = form.watch();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[15px] font-extrabold text-[#20180f]">Review</div>
        <p className="mt-0.5 text-[12.5px] text-[#8a7565]">Periksa kembali sebelum menyimpan relasi partner.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-[#efe2d4] p-4.5">
        <ReviewRow label="Perusahaan" value={values.companyName} />
        <ReviewRow label="Jenis Partner" value={values.type ? PARTNER_TYPE_LABELS[values.type] : undefined} />
        <ReviewRow label="NIB" value={values.nibNumber} />
        <ReviewRow label="NPWP" value={values.npwpInput} />
        <ReviewRow label="SK Kemenkumham" value={values.skInput} />
        <ReviewRow label="Nomor Kontrak" value={values.contractNumber} />
        <ReviewRow
          label="Masa Berlaku"
          value={
            values.contractStartDate && values.contractEndDate
              ? `${values.contractStartDate} — ${values.contractEndDate}`
              : undefined
          }
        />
        <ReviewRow label="Bukti Kontrak" value={values.contractDocumentPath ? "Terunggah" : "Belum diunggah"} />
      </div>
    </div>
  );
}
