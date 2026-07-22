"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";

import { GeneralInformationFields } from "./general-information-fields";
import { ContactPersonFields } from "./contact-person-fields";
import type { CompanyProfileValues } from "@/modules/shared/schema";

type Props<T extends FieldValues & CompanyProfileValues> = {
  form: UseFormReturn<T>;
};

export function CompanyProfileFields<T extends FieldValues & CompanyProfileValues>({
  form,
}: Props<T>) {
  return (
    <div className="flex flex-col gap-8">
      <GeneralInformationFields form={form} />
      <ContactPersonFields form={form} />
    </div>
  );
}
