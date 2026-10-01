"use client";

import { useMemo } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { FormField } from "@/components/form/form-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { applyCompanyToForm, type CompanyOption } from "../apply-company-to-form";
import type { ApplicationWizardValues } from "../schema";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  /** When set, only companies with this apiType are selectable (e.g. locked "Tambah Application VKI" entry point). */
  restrictApiType?: string;
};

export function CompanyPickerField({ form, restrictApiType }: Props) {
  const { control, setValue, formState } = form;

  const { data, isLoading } = useQuery({
    queryKey: ["companies", "picker"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Gagal memuat data perusahaan");
      const json = (await response.json()) as { data: CompanyOption[] };
      return json.data;
    },
  });

  const companies = useMemo(
    () => (restrictApiType ? (data ?? []).filter((c) => c.apiType === restrictApiType) : (data ?? [])),
    [data, restrictApiType],
  );

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: c.companyName, hint: c.apiType ?? "-" })),
    [companies],
  );

  function applyCompany(company: CompanyOption) {
    applyCompanyToForm(setValue, company);
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Company Selection</h2>
        <p className="text-xs text-muted-foreground">
          {restrictApiType
            ? `Hanya perusahaan dengan Jenis API: ${restrictApiType} yang ditampilkan untuk permohonan ini.`
            : "Pilih perusahaan terdaftar yang akan mengajukan permohonan ini. Jenis verifikasi (VKI/VIU) akan disesuaikan otomatis di step berikutnya berdasarkan Jenis API perusahaan ini."}
        </p>
      </div>
      <FormField label="Perusahaan Terdaftar" required error={formState.errors.companyId?.message}>
        <Controller
          control={control}
          name="companyId"
          render={({ field }) => (
            <SearchSelectInput
              value={field.value ?? ""}
              onChange={(value) => {
                const company = companies.find((c) => c.id === value);
                if (company) applyCompany(company);
              }}
              options={companyOptions}
              allowFreeText={false}
              placeholder={
                isLoading
                  ? "Memuat perusahaan..."
                  : companies.length === 0
                    ? restrictApiType
                      ? `Tidak ada perusahaan dengan Jenis API ${restrictApiType}.`
                      : "Belum ada perusahaan terdaftar."
                    : "Cari dan pilih perusahaan..."
              }
            />
          )}
        />
      </FormField>
    </section>
  );
}
