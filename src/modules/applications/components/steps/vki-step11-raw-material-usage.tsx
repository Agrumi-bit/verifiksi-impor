"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";

import { NumericInput } from "@/components/form/numeric-input";
import { useHsCodeOptions } from "../../hooks/use-hs-code-options";
import type { ApplicationWizardValues } from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

/** Rows are derived 1:1 from Raw Materials (step 8) — never independently added/removed here. */
export function VkiStep11RawMaterialUsage({ form }: Props) {
  const { control } = form;
  const products = useWatch({ control, name: "products" }) ?? [];
  const rawMaterials = useWatch({ control, name: "rawMaterials" }) ?? [];
  const rawMaterialConversions = useWatch({ control, name: "rawMaterialConversions" }) ?? [];
  const { fields, replace } = useFieldArray({ control, name: "rawMaterialUsage", keyName: "_key" });
  const hsCodeOptions = useHsCodeOptions();

  /** A raw material can now be paired with several products (many-to-many via the conversion table on step 8) — show the first pairing found. */
  function productFor(rawMaterialId: string | undefined) {
    const conversion = rawMaterialConversions.find((c) => c.rawMaterialId === rawMaterialId);
    return products.find((p) => p.id === conversion?.productId);
  }

  const rawMaterialIds = rawMaterials.map((r) => r.id).join(",");
  const rawMaterialHsCodes = rawMaterials.map((r) => r.hsCode).join(",");

  function unitFor(hsCode: string | undefined): string {
    return hsCodeOptions.find((option) => option.value === hsCode)?.unit ?? "";
  }

  useEffect(() => {
    const current = form.getValues("rawMaterialUsage") ?? [];
    const synced = rawMaterials.map((r) => {
      const existing = current.find((row) => row.rawMaterialId === r.id);
      return { ...(existing ?? { rawMaterialId: r.id }), satuan: unitFor(r.hsCode) };
    });
    replace(synced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMaterialIds, rawMaterialHsCodes, hsCodeOptions.length]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-bold">Bahan Baku yang Digunakan</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Estimasi kebutuhan bahan baku untuk proses produksi.
        </p>
      </div>

      {fields.length === 0 && (
        <p className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
          Tambahkan bahan baku terlebih dahulu di step Product Information.
        </p>
      )}

      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[820px] border-collapse text-xs">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="border border-primary/70 p-2.5 font-bold">Untuk Produk</th>
                <th className="border border-primary/70 p-2.5 font-bold">HS Code</th>
                <th className="border border-primary/70 p-2.5 font-bold">Penggunaan Bahan Baku Periode</th>
                <th className="border border-primary/70 p-2.5 font-bold">Data Stock Bahan Baku</th>
                <th className="border border-primary/70 p-2.5 font-bold">Rencana Kebutuhan 1 Tahun Berikutnya</th>
                <th className="border border-primary/70 p-2.5 font-bold">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const rawMaterial = rawMaterials.find((r) => r.id === field.rawMaterialId);
                const satuan = unitFor(rawMaterial?.hsCode);
                const product = productFor(rawMaterial?.id);
                return (
                  <tr key={field._key}>
                    <td className="border border-border p-2.5">
                      <div className="text-sm font-bold">{product?.materialType || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{product?.hsCode}</div>
                    </td>
                    <td className="border border-border p-2.5">
                      <div className="text-sm font-bold">{rawMaterial?.hsCode || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{rawMaterial?.jenis}</div>
                    </td>
                    <td className="border border-border p-1.5">
                      <Controller
                        control={control}
                        name={`rawMaterialUsage.${index}.penggunaan`}
                        render={({ field: f }) => (
                          <NumericInput placeholder="0" value={f.value} onChange={f.onChange} onBlur={f.onBlur} />
                        )}
                      />
                    </td>
                    <td className="border border-border p-1.5">
                      <Controller
                        control={control}
                        name={`rawMaterialUsage.${index}.dataStock`}
                        render={({ field: f }) => (
                          <NumericInput placeholder="0" value={f.value} onChange={f.onChange} onBlur={f.onBlur} />
                        )}
                      />
                    </td>
                    <td className="border border-border p-1.5">
                      <Controller
                        control={control}
                        name={`rawMaterialUsage.${index}.rencanaKebutuhan`}
                        render={({ field: f }) => (
                          <NumericInput placeholder="0" value={f.value} onChange={f.onChange} onBlur={f.onBlur} />
                        )}
                      />
                    </td>
                    {/* Not a free-text field — kept in sync with `rawMaterialUsage[].satuan` via the effect above, follows the raw material's HS Code. */}
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
    </div>
  );
}
