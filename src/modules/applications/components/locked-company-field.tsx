"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import { FormField } from "@/components/form/form-field";
import { applyCompanyToForm, type CompanyOption } from "../apply-company-to-form";
import type { ApplicationWizardValues } from "../schema";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

/**
 * Company-workspace entry point: the applicant IS the company, so there is
 * nothing to pick — the profile is fetched and locked in automatically.
 * Mirrors CompanyPickerField's admin flow minus the Select.
 */
export function LockedCompanyField({ form }: Props) {
  const { setValue } = form;
  const hasAppliedRef = useRef(false);

  const { data: company, isLoading, isError } = useQuery({
    queryKey: ["company-workspace", "profile"],
    queryFn: async () => {
      const response = await fetch("/api/company-workspace/profile");
      if (!response.ok) throw new Error("Gagal memuat profil perusahaan");
      const json = (await response.json()) as { data: CompanyOption };
      return json.data;
    },
  });

  useEffect(() => {
    if (!company || hasAppliedRef.current) return;
    hasAppliedRef.current = true;
    applyCompanyToForm(setValue, company);
  }, [company, setValue]);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Perusahaan</h2>
        <p className="text-xs text-muted-foreground">
          Permohonan ini diajukan atas nama perusahaan Anda dan tidak dapat diubah.
        </p>
      </div>
      <FormField label="Perusahaan Terdaftar">
        <div className="flex items-center gap-2.5 rounded-md border border-input bg-muted/40 px-3.5 py-2.5 text-sm">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          {isError && <span className="text-destructive">Gagal memuat profil perusahaan.</span>}
          {!isError && isLoading && <span className="text-muted-foreground">Memuat perusahaan...</span>}
          {!isError && !isLoading && company && (
            <span className="font-medium">
              {company.companyName} {company.apiType ? `(${company.apiType})` : ""}
            </span>
          )}
        </div>
      </FormField>
    </section>
  );
}
