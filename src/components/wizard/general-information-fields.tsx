"use client";

import { Controller, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form/form-field";
import { SelectableCard } from "@/components/form/selectable-card";
import type { GeneralInformationValues } from "@/modules/shared/schema";

const COMPANY_TYPE_OPTIONS = [
  "Perseroan Terbatas (PT)",
  "Perseroan Terbatas Terbuka (Tbk)",
  "Commanditaire Vennootschap (CV)",
  "Firma",
  "Koperasi",
  "Perusahaan Perseorangan",
];

const INVESTMENT_STATUS_OPTIONS = [
  { value: "PMDN", label: "PMDN", description: "Penanaman Modal Dalam Negeri" },
  { value: "PMA", label: "PMA", description: "Penanaman Modal Asing" },
] as const;

type Props<T extends FieldValues & GeneralInformationValues> = {
  form: UseFormReturn<T>;
};

export function GeneralInformationFields<T extends FieldValues & GeneralInformationValues>({
  form,
}: Props<T>) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold">Company Profile</h2>
        <p className="text-xs text-muted-foreground">
          Informasi identitas resmi perusahaan
        </p>
      </div>

      <FormField
        label="Company Name"
        htmlFor="companyName"
        required
        error={errors.companyName?.message as string | undefined}
        hint="Nama lengkap perusahaan sesuai dengan dokumen legal perusahaan."
      >
        <Input
          id="companyName"
          placeholder="e.g. PT Textile Indonesia"
          {...register("companyName" as Path<T>)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Company Type"
          required
          error={errors.companyType?.message as string | undefined}
          hint="Pilih jenis badan usaha perusahaan."
        >
          <Controller
            control={control}
            name={"companyType" as Path<T>}
            render={({ field }) => (
              <Select
                value={(field.value as string) ?? ""}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih jenis badan usaha..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          label="Investment Status"
          required
          error={errors.investmentStatus?.message as string | undefined}
        >
          <Controller
            control={control}
            name={"investmentStatus" as Path<T>}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {INVESTMENT_STATUS_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option.value}
                    selected={field.value === option.value}
                    onSelect={() => field.onChange(option.value)}
                    className="flex-row items-center gap-2 py-2"
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </SelectableCard>
                ))}
              </div>
            )}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Company Email"
          htmlFor="companyEmail"
          required
          error={errors.companyEmail?.message as string | undefined}
        >
          <Input
            id="companyEmail"
            type="email"
            placeholder="info@textileindonesia.co.id"
            {...register("companyEmail" as Path<T>)}
          />
        </FormField>
        <FormField
          label="Company Phone Number"
          htmlFor="companyPhone"
          required
          error={errors.companyPhone?.message as string | undefined}
        >
          <Input
            id="companyPhone"
            type="tel"
            placeholder="+62 22 1234567"
            {...register("companyPhone" as Path<T>)}
          />
        </FormField>
      </div>

      <FormField
        label="Company Website"
        htmlFor="companyWebsite"
        error={errors.companyWebsite?.message as string | undefined}
      >
        <Input
          id="companyWebsite"
          placeholder="www.textileindonesia.co.id"
          {...register("companyWebsite" as Path<T>)}
        />
      </FormField>
    </section>
  );
}
