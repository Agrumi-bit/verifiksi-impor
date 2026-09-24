"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { Field, TextInput } from "../wizard-ui";
import { createEmptyContact, type CompanyWizardValues } from "../../schema";

export function Step2Pic({ form }: { form: UseFormReturn<CompanyWizardValues> }) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "contacts" });
  const errors = formState.errors.contacts;

  return (
    <div className="flex flex-col gap-3.5">
      {fields.map((field, index) => (
        <div key={field.id} className="relative rounded-[10px] border border-[#e8dccd] p-4">
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute right-3 top-3 text-[18px] text-[#a68f80]"
              aria-label="Hapus contact"
            >
              ✕
            </button>
          )}
          <div className="mb-3 text-[11.5px] font-bold tracking-[0.03em] text-[#a68f80]">
            CONTACT PERSON {index + 1}
          </div>
          <div className="flex flex-col gap-3">
            <Field label="Nama" required error={errors?.[index]?.name?.message}>
              <TextInput placeholder="Nama penanggung jawab" {...register(`contacts.${index}.name`)} />
            </Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Jabatan" required error={errors?.[index]?.jabatan?.message}>
                <TextInput placeholder="Contoh: Direktur" {...register(`contacts.${index}.jabatan`)} />
              </Field>
              <Field label="Nomor WhatsApp" required error={errors?.[index]?.whatsapp?.message}>
                <TextInput placeholder="08xx-xxxx-xxxx" {...register(`contacts.${index}.whatsapp`)} />
              </Field>
            </div>
            <Field label="Email" required error={errors?.[index]?.email?.message}>
              <TextInput placeholder="email@perusahaan.co.id" {...register(`contacts.${index}.email`)} />
            </Field>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append(createEmptyContact())}
        className="flex items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] border-dashed border-[#e1bfb3] p-3 text-[12.5px] font-bold text-[#c14a1f]"
      >
        + Tambah Contact Person
      </button>
    </div>
  );
}
