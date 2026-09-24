"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { FileUploadField } from "@/components/form/file-upload-field";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS, type PartnerWizardValues } from "../../schema";

type Props = {
  form: UseFormReturn<PartnerWizardValues>;
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-[13px] font-bold text-[#20180f]">
      {children} {required && <span className="text-[#e0662e]">*</span>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border-none bg-[#f7f2ec] px-3.5 py-2.75 text-[13px] text-[#20180f] outline-none placeholder:text-[#a68f80]";

export function PartnerContractStep({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const companyName = form.watch("companyName");
  const type = form.watch("type");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[15px] font-extrabold text-[#20180f]">Detail Relasi Partner</div>
        <p className="mt-0.5 text-[12.5px] text-[#8a7565]">
          Informasi kontrak kerja sama dengan {companyName || "perusahaan terpilih"}.
        </p>
      </div>

      <div className="rounded-lg border border-[#efe2d4] bg-[#f7f2ec] p-3.5">
        <div className="text-[11px] text-[#8a7565]">Perusahaan Terpilih</div>
        <div className="mt-0.5 text-[13.5px] font-extrabold text-[#20180f]">{companyName}</div>
      </div>

      <div>
        <FieldLabel required>Jenis Partner</FieldLabel>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2.5">
              {PARTNER_TYPES.map((option) => {
                const selected = type === option;
                return (
                  <div
                    key={option}
                    onClick={() => field.onChange(option)}
                    className="flex cursor-pointer items-center justify-between rounded-[9px] border-[1.5px] p-3"
                    style={{
                      borderColor: selected ? "#e0662e" : "#e1d8cc",
                      background: selected ? "#fdeadd" : "#fff",
                    }}
                  >
                    <span
                      className="text-[12.5px] font-bold"
                      style={{ color: selected ? "#c14a1f" : "#20180f" }}
                    >
                      {PARTNER_TYPE_LABELS[option]}
                    </span>
                    {selected && <span className="text-[16px] text-[#e0662e]">✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        />
        {errors.type && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.type.message}</p>}
      </div>

      <div>
        <FieldLabel required>Nomor Kontrak</FieldLabel>
        <input className={inputClass} placeholder="Contoh: 012/MoU/2026" {...register("contractNumber")} />
        {errors.contractNumber && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.contractNumber.message}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel required>Tanggal Mulai</FieldLabel>
          <input type="date" className={inputClass} {...register("contractStartDate")} />
          {errors.contractStartDate && (
            <p className="mt-1 text-xs text-[#ba1a1a]">{errors.contractStartDate.message}</p>
          )}
        </div>
        <div>
          <FieldLabel required>Tanggal Berakhir</FieldLabel>
          <input type="date" className={inputClass} {...register("contractEndDate")} />
          {errors.contractEndDate && (
            <p className="mt-1 text-xs text-[#ba1a1a]">{errors.contractEndDate.message}</p>
          )}
        </div>
      </div>

      <div>
        <FieldLabel>Bukti Kontrak</FieldLabel>
        <Controller
          control={control}
          name="contractDocumentPath"
          render={({ field }) => (
            <FileUploadField
              namespace="documents"
              value={field.value}
              onChange={field.onChange}
              label="Upload Bukti Kontrak"
              accept=".pdf"
            />
          )}
        />
      </div>
    </div>
  );
}
