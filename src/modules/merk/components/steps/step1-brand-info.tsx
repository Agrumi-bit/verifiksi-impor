"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import type { MerkWizardValues } from "../../schema";

type Props = {
  form: UseFormReturn<MerkWizardValues>;
};

export function Step1BrandInfo({ form }: Props) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const { options: countryOptions, isLoading: isLoadingCountries } = useActiveCountries();

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nama Merek" required error={errors.brandName?.message}>
        <Input placeholder="e.g. Katunia" {...register("brandName")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Kategori Produk"
          required
          error={errors.productCategory?.message}
        >
          <Input
            placeholder="e.g. Pakaian Jadi"
            {...register("productCategory")}
          />
        </FormField>
        <Controller
          control={control}
          name="countryOfOrigin"
          render={({ field }) => (
            <FormField
              label="Negara Asal Merek"
              required
              error={errors.countryOfOrigin?.message}
            >
              <SearchSelectInput
                value={field.value ?? ""}
                onChange={field.onChange}
                options={countryOptions}
                allowFreeText={false}
                placeholder={
                  isLoadingCountries ? "Memuat negara..." : "Cari negara asal..."
                }
              />
            </FormField>
          )}
        />
      </div>

      <FormField
        label="Nomor Pendaftaran / Sertifikat Merek"
        required
        error={errors.registrationNumber?.message}
        hint="Sesuai sertifikat merek yang diterbitkan DJKI/otoritas terkait."
      >
        <Input
          placeholder="e.g. IDM000123456"
          {...register("registrationNumber")}
        />
      </FormField>

      <FormField
        label="Lembaga Penerbit"
        required
        error={errors.registrationIssuer?.message}
        hint="Otoritas yang menerbitkan sertifikat merek, mis. DJKI Kemenkumham."
      >
        <Input
          placeholder="e.g. DJKI Kemenkumham"
          {...register("registrationIssuer")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Tanggal Terdaftar"
          required
          error={errors.registrationDate?.message}
        >
          <Input type="date" {...register("registrationDate")} />
        </FormField>
        <FormField
          label="Tanggal Kadaluarsa"
          required
          error={errors.registrationExpiryDate?.message}
        >
          <Input type="date" {...register("registrationExpiryDate")} />
        </FormField>
      </div>

      <Controller
        control={control}
        name="registrationDocumentPath"
        render={({ field }) => (
          <FormField
            label="Upload Sertifikat Merek"
            required
            error={errors.registrationDocumentPath?.message}
          >
            <FileUploadField
              namespace="documents"
              value={field.value}
              onChange={field.onChange}
              label="Upload Sertifikat Merek"
            />
          </FormField>
        )}
      />
    </div>
  );
}
