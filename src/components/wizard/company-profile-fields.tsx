"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";

import { GeneralInformationFields } from "./general-information-fields";
import { ContactPersonFields } from "./contact-person-fields";
import type { CompanyProfileValues } from "@/modules/shared/schema";

type Props<T extends FieldValues & CompanyProfileValues> = {
  form: UseFormReturn<T>;
  readOnly?: boolean;
};

export function CompanyProfileFields<T extends FieldValues & CompanyProfileValues>({
  form,
  readOnly = false,
}: Props<T>) {
  return (
    <div className="flex flex-col gap-8">
      <GeneralInformationFields form={form} readOnly={readOnly} />
      <ContactPersonFields form={form} readOnly={readOnly} />
    </div>
  );
}
