"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Field, TextInput, OptionCard, SimpleOptionCard } from "../wizard-ui";
import { API_TYPES, COMPANY_LEGAL_TYPES, INVESTMENT_STATUSES, type CompanyWizardValues } from "../../schema";

const API_TYPE_DESC: Record<(typeof API_TYPES)[number], string> = {
  "API-P": "Angka Pengenal Impor Produsen",
  "API-U": "Angka Pengenal Impor Umum",
};
const INVESTMENT_DESC: Record<(typeof INVESTMENT_STATUSES)[number], string> = {
  PMDN: "Penanaman Modal Dalam Negeri",
  PMA: "Penanaman Modal Asing",
};

async function uploadLogo(file: File): Promise<string | undefined> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("namespace", "temporary");
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { path: string };
  return data.path;
}

export function Step1DataPerusahaan({ form }: { form: UseFormReturn<CompanyWizardValues> }) {
  const { control, register, watch, setValue, formState } = form;
  const apiType = watch("apiType");
  const companyType = watch("companyType");
  const investmentStatus = watch("investmentStatus");

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3.5">
        <Controller
          control={control}
          name="logoPath"
          render={({ field }) => (
            <label className="flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[10px] border border-[#e8d5c5] bg-[#f2f0ee] text-[10px] font-semibold text-[#a68f80]">
              {field.value ? "✓ Logo" : "Logo"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  const path = await uploadLogo(file);
                  if (path) field.onChange(path);
                }}
              />
            </label>
          )}
        />
        <div className="text-[12px] text-[#8a7565]">Unggah logo perusahaan (opsional)</div>
      </div>

      <Field label="Nama Perusahaan" required error={formState.errors.companyName?.message}>
        <TextInput placeholder="Contoh: PT Textile Export" {...register("companyName")} />
      </Field>

      <Field label="Jenis API" required error={formState.errors.apiType?.message}>
        <div className="grid grid-cols-2 gap-2.5">
          {API_TYPES.map((code) => (
            <OptionCard
              key={code}
              code={code}
              desc={API_TYPE_DESC[code]}
              selected={apiType === code}
              onClick={() => setValue("apiType", code, { shouldValidate: true })}
            />
          ))}
        </div>
      </Field>

      <Field label="Tipe Perusahaan" required error={formState.errors.companyType?.message}>
        <div className="grid grid-cols-3 gap-2.5">
          {COMPANY_LEGAL_TYPES.map((label) => (
            <SimpleOptionCard
              key={label}
              label={label}
              selected={companyType === label}
              onClick={() => setValue("companyType", label, { shouldValidate: true })}
            />
          ))}
        </div>
      </Field>

      <Field label="Status Investasi" required error={formState.errors.investmentStatus?.message}>
        <div className="grid grid-cols-2 gap-2.5">
          {INVESTMENT_STATUSES.map((code) => (
            <OptionCard
              key={code}
              code={code}
              desc={INVESTMENT_DESC[code]}
              selected={investmentStatus === code}
              onClick={() => setValue("investmentStatus", code, { shouldValidate: true })}
            />
          ))}
        </div>
      </Field>

      <Field label="Jalan" required error={formState.errors.addressJalan?.message}>
        <TextInput placeholder="Nama jalan, nomor, RT/RW" {...register("addressJalan")} />
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Desa / Kelurahan" required error={formState.errors.addressDesa?.message}>
          <TextInput placeholder="Contoh: Sukaluyu" {...register("addressDesa")} />
        </Field>
        <Field label="Kecamatan" required error={formState.errors.addressKecamatan?.message}>
          <TextInput placeholder="Contoh: Cibeunying Kaler" {...register("addressKecamatan")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Kota / Kabupaten" required error={formState.errors.addressKota?.message}>
          <TextInput placeholder="Contoh: Bandung" {...register("addressKota")} />
        </Field>
        <Field label="Provinsi" required error={formState.errors.addressProvinsi?.message}>
          <TextInput placeholder="Contoh: Jawa Barat" {...register("addressProvinsi")} />
        </Field>
      </div>

      <div className="w-1/2 pr-1.75">
        <Field label="Kode Pos" required error={formState.errors.addressKodePos?.message}>
          <TextInput placeholder="Contoh: 40122" {...register("addressKodePos")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Nomor Perusahaan (Telepon)" required error={formState.errors.companyPhone?.message}>
          <TextInput placeholder="Contoh: 021-5551234" {...register("companyPhone")} />
        </Field>
        <Field label="Email Perusahaan" required error={formState.errors.companyEmail?.message}>
          <TextInput placeholder="info@perusahaan.co.id" {...register("companyEmail")} />
        </Field>
      </div>

      <Field label="Website" error={formState.errors.companyWebsite?.message}>
        <TextInput placeholder="https://www.perusahaan.co.id" {...register("companyWebsite")} />
      </Field>
    </div>
  );
}
