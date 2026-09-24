"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";

import { FileUploadField } from "@/components/form/file-upload-field";
import { NumericInput } from "@/components/form/numeric-input";
import { useHsCodeOptions } from "../../hooks/use-hs-code-options";
import type { ApplicationWizardValues } from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

/** Rows are derived 1:1 from Products (step 8) — never independently added/removed here. */
export function VkiStep9Capacity({ form }: Props) {
  const { control } = form;
  const products = useWatch({ control, name: "products" }) ?? [];
  const { fields, replace } = useFieldArray({ control, name: "capacity", keyName: "_key" });
  const hsCodeOptions = useHsCodeOptions();

  const productIds = products.map((p) => p.id).join(",");
  const productHsCodes = products.map((p) => p.hsCode).join(",");

  function unitFor(hsCode: string | undefined): string {
    return hsCodeOptions.find((option) => option.value === hsCode)?.unit ?? "";
  }

  useEffect(() => {
    const current = form.getValues("capacity") ?? [];
    const synced = products.map((p) => {
      const existing = current.find((row) => row.productId === p.id);
      return { ...(existing ?? { productId: p.id }), satuan: unitFor(p.hsCode) };
    });
    replace(synced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds, productHsCodes, hsCodeOptions.length]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-bold">Kapasitas</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Kapasitas produksi berdasarkan perizinan dan kapasitas terpasang untuk setiap produk.
        </p>
      </div>

      {fields.length === 0 && (
        <p className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
          Tambahkan produk terlebih dahulu di step Product Information.
        </p>
      )}

      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] border-collapse text-xs">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border border-primary/70 p-2.5 font-bold">HS Code</th>
                <th className="border border-primary/70 p-2.5 font-bold">Kapasitas Berdasarkan Perizinan</th>
                <th className="border border-primary/70 p-2.5 font-bold">Kapasitas Terpasang</th>
                <th className="border border-primary/70 p-2.5 font-bold">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const product = products.find((p) => p.id === field.productId);
                const satuan = unitFor(product?.hsCode);
                return (
                  <tr key={field._key}>
                    <td className="border border-border p-2.5">
                      <div className="text-sm font-bold">{product?.hsCode || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{product?.materialType}</div>
                    </td>
                    <td className="border border-border p-1.5">
                      <Controller
                        control={control}
                        name={`capacity.${index}.berdasarkanIzin`}
                        render={({ field: f }) => (
                          <NumericInput placeholder="0" value={f.value} onChange={f.onChange} onBlur={f.onBlur} />
                        )}
                      />
                    </td>
                    <td className="border border-border p-1.5">
                      <Controller
                        control={control}
                        name={`capacity.${index}.kapasitasTerpasang`}
                        render={({ field: f }) => (
                          <NumericInput placeholder="0" value={f.value} onChange={f.onChange} onBlur={f.onBlur} />
                        )}
                      />
                    </td>
                    {/* Not a free-text field — kept in sync via the effect above, follows the product's HS Code. */}
                    <td className="border border-border p-1.5 text-center font-semibold">
                      {satuan || <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Controller
        control={control}
        name="capacityDocumentPath"
        render={({ field }) => (
          <FileUploadField
            namespace="documents"
            value={field.value}
            onChange={field.onChange}
            label="Dokumen Pembuktian Kapasitas"
            hint="Format: PDF/JPG/PNG — mis. Izin Usaha Industri, sertifikat kapasitas terpasang"
          />
        )}
      />
    </div>
  );
}
