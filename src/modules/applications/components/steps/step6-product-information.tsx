"use client";

import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useHsCodeOptions } from "../../hooks/use-hs-code-options";
import { createEmptyProduct, type ApplicationWizardValues } from "../../schema";

type Step6Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

export function Step6ProductInformation({ form }: Step6Props) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "products" });
  const errors = formState.errors.products;
  const hsCodeOptions = useHsCodeOptions();

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Rincian produk/material yang akan diimpor. Data ini terkait dengan
        Jenis Impor di Step 2 dan kesesuaian HS Code di Step 3.
      </p>

      {fields.map((field, index) => {
        const itemErrors = errors?.[index];
        return (
          <div
            key={field.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Produk {index + 1}</p>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
              )}
            </div>

            <FormField
              label="Jenis Material yang Akan Disuplai"
              required
              error={itemErrors?.materialType?.message}
            >
              <Input
                placeholder="e.g. Benang Katun 40s"
                {...register(`products.${index}.materialType` as const)}
              />
            </FormField>

            <Controller
              control={control}
              name={`products.${index}.hsCode` as const}
              render={({ field }) => (
                <FormField
                  label="HS Code"
                  required
                  error={itemErrors?.hsCode?.message}
                  hint="Cari dari HS Code Master Data (System Configuration)."
                >
                  <SearchSelectInput
                    value={field.value}
                    onChange={field.onChange}
                    options={hsCodeOptions}
                    placeholder="e.g. 5205.31.00"
                  />
                </FormField>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Estimasi Volume"
                required
                error={itemErrors?.estimatedVolume?.message}
              >
                <Input
                  placeholder="e.g. 5000"
                  {...register(`products.${index}.estimatedVolume` as const)}
                />
              </FormField>
              <FormField
                label="Satuan"
                required
                error={itemErrors?.volumeUnit?.message}
              >
                <Input
                  placeholder="e.g. Kg"
                  {...register(`products.${index}.volumeUnit` as const)}
                />
              </FormField>
            </div>

            <FormField
              label="Tujuan Penggunaan"
              required
              error={itemErrors?.intendedUse?.message}
            >
              <Input
                placeholder="e.g. Bahan baku produksi kain tenun"
                {...register(`products.${index}.intendedUse` as const)}
              />
            </FormField>
          </div>
        );
      })}

      {formState.errors.products?.message && (
        <p className="text-xs text-destructive">
          {formState.errors.products.message}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptyProduct() as any)}
      >
        + Add Product
      </Button>
    </div>
  );
}
