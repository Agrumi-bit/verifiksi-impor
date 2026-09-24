"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form/form-field";
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

  const companies = restrictApiType
    ? (data ?? []).filter((c) => c.apiType === restrictApiType)
    : (data ?? []);

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
            <Select
              value={field.value ?? ""}
              onValueChange={(value) => {
                const company = companies.find((c) => c.id === value);
                if (company) applyCompany(company);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    if (!value) return isLoading ? "Memuat perusahaan..." : "Pilih perusahaan...";
                    const company = companies.find((c) => c.id === value);
                    return company ? `${company.companyName} (${company.apiType ?? "-"})` : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {!isLoading && companies.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {restrictApiType
                      ? `Tidak ada perusahaan dengan Jenis API ${restrictApiType}.`
                      : "Belum ada perusahaan terdaftar."}
                  </div>
                )}
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName} ({c.apiType ?? "-"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
    </section>
  );
}
