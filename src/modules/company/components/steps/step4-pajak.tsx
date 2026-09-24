"use client";

import { useState } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";

import { Field, TextInput, CollapsibleCard, UploadBox } from "../wizard-ui";
import { COMPANY_AGES, TAX_PROOF_TYPES, TAX_PROOF_TYPE_LABELS, type CompanyWizardValues } from "../../schema";

const AGE_LABEL: Record<(typeof COMPANY_AGES)[number], { label: string; desc: string }> = {
  OVER_3: { label: "Lebih dari 3 Tahun", desc: "Perusahaan berdiri > 3 tahun" },
  UNDER_3: { label: "Kurang dari 3 Tahun", desc: "Perusahaan berdiri < 3 tahun" },
};

export function Step4Pajak({ form }: { form: UseFormReturn<CompanyWizardValues> }) {
  const { control, register, watch, setValue, formState } = form;
  const errors = formState.errors;

  const [npwpOpen, setNpwpOpen] = useState(true);
  const [taxOpen, setTaxOpen] = useState(true);
  const [sktOpen, setSktOpen] = useState(true);

  const npwpNumber = watch("npwpNumber");
  const npwpDocumentPath = watch("npwpDocumentPath");
  const npwpSaved = Boolean(npwpNumber && npwpDocumentPath);

  const companyAge = watch("companyAge");
  const { fields: taxFields } = useFieldArray({ control, name: "taxProofs" });
  const taxProofs = watch("taxProofs") ?? [];
  const taxSaved = taxProofs.every((p) => p.type && p.nomor && p.tanggal);

  const sktNumber = watch("sktNumber");
  const sktIssuer = watch("sktIssuer");
  const sktDate = watch("sktDate");
  const sktDocumentPath = watch("sktDocumentPath");
  const sktSaved = Boolean(sktNumber && sktIssuer && sktDate && sktDocumentPath);

  return (
    <div className="flex flex-col gap-5.5">
      <CollapsibleCard
        title="NPWP"
        description="Nomor Pokok Wajib Pajak perusahaan"
        saved={npwpSaved}
        open={npwpOpen}
        onToggle={() => setNpwpOpen((v) => !v)}
      >
        <Field label="NPWP Number" required error={errors.npwpNumber?.message} hint="15-16 digit nomor NPWP perusahaan.">
          <TextInput variant="white" placeholder="e.g. 01.234.567.8-901.000" {...register("npwpNumber")} />
        </Field>
        <div className="mt-3.5">
          <Field label="Upload Document" required error={errors.npwpDocumentPath?.message}>
            <Controller
              control={control}
              name="npwpDocumentPath"
              render={({ field }) => (
                <UploadBox label="Dokumen NPWP" hint="Format: PDF, JPG, PNG" value={field.value} onFile={field.onChange} />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>

      <div className="rounded-xl border border-[#efe2d4] p-4.5">
        <div className="mb-0.5 text-[14px] font-extrabold text-[#20180f]">Usia Perusahaan</div>
        <p className="mb-3 text-[12px] text-[#8a7565]">Menentukan dokumen kepatuhan pajak yang perlu dilampirkan</p>
        <div className="grid grid-cols-2 gap-3">
          {COMPANY_AGES.map((age) => (
            <div
              key={age}
              onClick={() => setValue("companyAge", age, { shouldValidate: true })}
              className="cursor-pointer rounded-[9px] border-[1.5px] p-3.5"
              style={{
                borderColor: companyAge === age ? "#e0662e" : "#e8dccd",
                background: companyAge === age ? "#fdeadd" : "#fff",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold" style={{ color: companyAge === age ? "#c14a1f" : "#261813" }}>
                  {AGE_LABEL[age].label}
                </div>
                {companyAge === age && <span className="text-[16px] text-[#e0662e]">✓</span>}
              </div>
              <div className="mt-0.5 text-[11px] text-[#8a7565]">{AGE_LABEL[age].desc}</div>
            </div>
          ))}
        </div>
        {errors.companyAge?.message && <p className="mt-2 text-[11px] text-[#ba1a1a]">{errors.companyAge.message}</p>}
      </div>

      {companyAge === "OVER_3" && (
        <CollapsibleCard
          title="Bukti Pembayaran Pajak (3 Tahun Terakhir)"
          description="Wajib untuk perusahaan yang telah berdiri lebih dari 3 tahun"
          saved={taxSaved}
          open={taxOpen}
          onToggle={() => setTaxOpen((v) => !v)}
        >
          <div className="flex flex-col gap-4">
            {taxFields.map((field, index) => {
              const entry = taxProofs[index];
              return (
                <div key={field.id} className="rounded-[10px] border border-[#efe2d4] p-3.5">
                  <div className="mb-2.5 text-[12.5px] font-extrabold text-[#20180f]">
                    Bukti Bayar Pajak – {entry?.year}
                  </div>
                  <div className="mb-1.5 text-[11.5px] font-semibold text-[#20180f]">
                    Jenis Bukti <span className="text-[#e0662e]">*</span>
                  </div>
                  <div className="mb-3.5 grid grid-cols-3 gap-2">
                    {TAX_PROOF_TYPES.map((type) => (
                      <div
                        key={type}
                        onClick={() => setValue(`taxProofs.${index}.type`, type)}
                        className="cursor-pointer rounded-lg border-[1.5px] p-2 text-center"
                        style={{
                          borderColor: entry?.type === type ? "#e0662e" : "#e8dccd",
                          background: entry?.type === type ? "#fdeadd" : "#fff",
                        }}
                      >
                        <div
                          className="text-[11px] font-bold leading-tight"
                          style={{ color: entry?.type === type ? "#c14a1f" : "#261813" }}
                        >
                          {TAX_PROOF_TYPE_LABELS[type]}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nomor" required>
                      <TextInput variant="white" placeholder="Nomor dokumen" {...register(`taxProofs.${index}.nomor`)} />
                    </Field>
                    <Field label="Tanggal" required>
                      <TextInput variant="white" type="date" {...register(`taxProofs.${index}.tanggal`)} />
                    </Field>
                  </div>
                  {entry?.type === "ssp" && (
                    <div className="mt-3">
                      <Field label="BPN (Bukti Penerimaan Negara)" required>
                        <TextInput variant="white" placeholder="Nomor BPN" {...register(`taxProofs.${index}.bpn`)} />
                      </Field>
                    </div>
                  )}
                  {entry?.type === "bpe" && (
                    <div className="mt-3">
                      <Field label="NTTE (Nomor Tanda Terima Elektronik)" required>
                        <TextInput variant="white" placeholder="Nomor NTTE" {...register(`taxProofs.${index}.ntte`)} />
                      </Field>
                    </div>
                  )}
                  <div className="mt-3">
                    <Controller
                      control={control}
                      name={`taxProofs.${index}.docPath`}
                      render={({ field: docField }) => (
                        <UploadBox label="Unggah Dokumen" hint="Format: PDF" value={docField.value} onFile={docField.onChange} />
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleCard>
      )}

      {companyAge === "UNDER_3" && (
        <CollapsibleCard
          title="Surat Keterangan Terdaftar Pajak (SKT)"
          description="Wajib untuk perusahaan yang berdiri kurang dari 3 tahun"
          saved={sktSaved}
          open={sktOpen}
          onToggle={() => setSktOpen((v) => !v)}
        >
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Nomor Surat" required hint="Nomor SKT dari Direktorat Jenderal Pajak.">
              <TextInput variant="white" placeholder="e.g. S-12345KT/WPJ.01/2024" {...register("sktNumber")} />
            </Field>
            <Field label="Lembaga Penerbit" required>
              <TextInput variant="white" placeholder="e.g. KPP Pratama Jakarta Barat" {...register("sktIssuer")} />
            </Field>
          </div>
          <div className="mt-3.5">
            <Field label="Tanggal Diterbitkan" required>
              <TextInput variant="white" type="date" {...register("sktDate")} />
            </Field>
          </div>
          <div className="mt-3.5">
            <Controller
              control={control}
              name="sktDocumentPath"
              render={({ field }) => (
                <UploadBox label="Dokumen SKT Pajak" hint="Format: PDF" value={field.value} onFile={field.onChange} />
              )}
            />
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}
