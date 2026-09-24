"use client";

import type { UseFormReturn } from "react-hook-form";

import { TAX_PROOF_TYPE_LABELS, type CompanyWizardValues } from "../../schema";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[12.5px]">
      <span className="text-[#a68f80]">{label}</span>
      <span className="max-w-[60%] text-right font-bold text-[#261813]">{value || "—"}</span>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#efe2d4] p-4.5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13.5px] font-extrabold text-[#20180f]">{title}</div>
        <button type="button" onClick={onEdit} className="text-[11.5px] font-bold text-[#c14a1f]">
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function Step6Review({
  form,
  onEditStep,
}: {
  form: UseFormReturn<CompanyWizardValues>;
  onEditStep: (step: number) => void;
}) {
  const values = form.getValues();
  const address = [values.addressJalan, values.addressDesa, values.addressKecamatan, values.addressKota, values.addressProvinsi, values.addressKodePos]
    .filter(Boolean)
    .join(", ");
  const kbliSummary = (values.kbliEntries ?? []).map((k) => k.code).join(", ");

  return (
    <div className="flex flex-col gap-4.5">
      <p className="text-[13px] text-[#594138]">
        Tinjau seluruh data yang telah diisi sebelum menyimpan perusahaan baru.
      </p>

      <ReviewCard title="Data Perusahaan" onEdit={() => onEditStep(1)}>
        <Row label="Nama Perusahaan" value={values.companyName} />
        <Row label="Jenis API" value={values.apiType} />
        <Row label="Tipe Perusahaan" value={values.companyType} />
        <Row label="Status Investasi" value={values.investmentStatus} />
        <Row label="Alamat" value={address} />
        <Row label="Nomor Perusahaan (Telepon)" value={values.companyPhone} />
        <Row label="Email Perusahaan" value={values.companyEmail} />
        <Row label="Website" value={values.companyWebsite ?? ""} />
      </ReviewCard>

      <ReviewCard title="PIC / Contact Person" onEdit={() => onEditStep(2)}>
        {(values.contacts ?? []).map((c, i) => (
          <div key={i} className="border-t border-[#f5ebe1] pt-2.5 first:border-t-0 first:pt-0">
            <div className="mb-1 text-[11.5px] font-bold text-[#a68f80]">CONTACT {i + 1}</div>
            <Row label="Nama" value={c.name} />
            <Row label="Jabatan" value={c.jabatan} />
            <Row label="WhatsApp" value={c.whatsapp} />
            <Row label="Email" value={c.email} />
          </div>
        ))}
      </ReviewCard>

      <ReviewCard title="Legal" onEdit={() => onEditStep(3)}>
        <Row label="NIB" value={values.nibNumber} />
        <Row label="NIB Tanggal Terbit" value={values.nibIssueDate} />
        <Row label="KBLI" value={kbliSummary} />
        <Row label="Notarial Deed No." value={values.notarialDeedNumber} />
        <Row label="Notarial Deed Tanggal" value={values.notarialDeedIssueDate} />
        <Row label="Issuing Authority" value={values.notarialIssuingAuthority} />
        {values.hasAmendment && (
          <>
            <Row label="Akta Perubahan No." value={values.notarialAmendmentNumber ?? ""} />
            <Row label="Akta Perubahan Tanggal" value={values.notarialAmendmentDate ?? ""} />
          </>
        )}
        <Row label="SK Kemenkumham No." value={values.skNumber} />
        <Row label="SK Tanggal Terbit" value={values.skDate} />
      </ReviewCard>

      <ReviewCard title="Pajak" onEdit={() => onEditStep(4)}>
        <Row label="NPWP" value={values.npwpNumber} />
        <Row label="Usia Perusahaan" value={values.companyAge === "OVER_3" ? "Lebih dari 3 Tahun" : "Kurang dari 3 Tahun"} />
        {values.companyAge === "OVER_3" &&
          (values.taxProofs ?? []).map((tp, i) => (
            <div key={i} className="border-t border-[#f5ebe1] pt-2.5">
              <div className="mb-1 text-[11.5px] font-bold text-[#a68f80]">
                {tp.year} — {tp.type ? TAX_PROOF_TYPE_LABELS[tp.type] : "—"}
              </div>
              <Row label="Nomor / Tanggal" value={`${tp.nomor ?? ""} · ${tp.tanggal ?? ""}`} />
              {tp.bpn && <Row label="BPN" value={tp.bpn} />}
              {tp.ntte && <Row label="NTTE" value={tp.ntte} />}
            </div>
          ))}
        {values.companyAge === "UNDER_3" && (
          <>
            <Row label="Nomor SKT" value={values.sktNumber ?? ""} />
            <Row label="Lembaga Penerbit" value={values.sktIssuer ?? ""} />
            <Row label="Tanggal Diterbitkan" value={values.sktDate ?? ""} />
          </>
        )}
      </ReviewCard>

      <ReviewCard title="Lokasi Verifikasi" onEdit={() => onEditStep(5)}>
        <Row label="Jumlah Lokasi" value={String((values.locations ?? []).length)} />
      </ReviewCard>
    </div>
  );
}
