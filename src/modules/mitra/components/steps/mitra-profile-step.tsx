"use client";

import { Controller, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";

type ProfileFields = {
  name: string;
  nibNumber: string;
  nibDocumentPath: string;
  address: string;
  city: string;
  province: string;
};

type Props<T extends FieldValues & ProfileFields> = {
  form: UseFormReturn<T>;
};

export function MitraProfileStep<T extends FieldValues & ProfileFields>({
  form,
}: Props<T>) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <FormField
        label="Nama Mitra"
        required
        error={errors.name?.message as string | undefined}
      >
        <Input
          placeholder="e.g. PT Mitra Sejahtera"
          {...register("name" as Path<T>)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nomor NIB"
          required
          error={errors.nibNumber?.message as string | undefined}
        >
          <Input
            placeholder="e.g. 1234567890123"
            {...register("nibNumber" as Path<T>)}
          />
        </FormField>
        <FormField label="Kota" required error={errors.city?.message as string | undefined}>
          <Input placeholder="e.g. Bandung" {...register("city" as Path<T>)} />
        </FormField>
      </div>

      <FormField
        label="Alamat"
        required
        error={errors.address?.message as string | undefined}
      >
        <Input
          placeholder="e.g. Jl. Industri No. 10"
          {...register("address" as Path<T>)}
        />
      </FormField>

      <FormField
        label="Provinsi"
        required
        error={errors.province?.message as string | undefined}
      >
        <Input
          placeholder="e.g. Jawa Barat"
          {...register("province" as Path<T>)}
        />
      </FormField>

      <Controller
        control={control}
        name={"nibDocumentPath" as Path<T>}
        render={({ field }) => (
          <FormField
            label="Upload Dokumen NIB"
            required
            error={errors.nibDocumentPath?.message as string | undefined}
          >
            <FileUploadField
              namespace="documents"
              value={field.value as string | undefined}
              onChange={field.onChange}
              label="Upload Dokumen NIB"
            />
          </FormField>
        )}
      />
    </div>
  );
}
