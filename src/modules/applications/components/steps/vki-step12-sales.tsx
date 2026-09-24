"use client";

import { useEffect } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { ApplicationWizardValues } from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

/** Rows are derived 1:1 from Products (step 8) — never independently added/removed here. */
export function VkiStep12Sales({ form }: Props) {
  const { control, register } = form;
  const products = useWatch({ control, name: "products" }) ?? [];
  const { fields, replace } = useFieldArray({ control, name: "sales", keyName: "_key" });

  const productIds = products.map((p) => p.id).join(",");

  useEffect(() => {
    const current = form.getValues("sales") ?? [];
    const synced = products.map((p) => {
      const existing = current.find((row) => row.productId === p.id);
      return existing ?? { productId: p.id, satuan: p.volumeUnit ?? "" };
    });
    replace(synced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-bold">Penjualan</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Data penjualan produk dalam negeri dan luar negeri.
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
                <th className="border border-primary/70 p-2.5 font-bold">HS Code Produk</th>
                <th className="border border-primary/70 p-2.5 font-bold">Penjualan Dalam Negeri</th>
                <th className="border border-primary/70 p-2.5 font-bold">Penjualan Luar Negeri</th>
                <th className="border border-primary/70 p-2.5 font-bold">Negara Tujuan</th>
                <th className="border border-primary/70 p-2.5 font-bold">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const product = products.find((p) => p.id === field.productId);
                return (
                  <tr key={field._key}>
                    <td className="border border-border p-2.5">
                      <div className="text-sm font-bold">{product?.hsCode || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{product?.materialType}</div>
                    </td>
                    <td className="border border-border p-1.5">
                      <Input placeholder="0" {...register(`sales.${index}.dalamNegeri`)} />
                    </td>
                    <td className="border border-border p-1.5">
                      <Input placeholder="0" {...register(`sales.${index}.luarNegeri`)} />
                    </td>
                    <td className="border border-border p-1.5">
                      <Input placeholder="Contoh: Malaysia" {...register(`sales.${index}.negaraTujuan`)} />
                    </td>
                    <td className="border border-border p-1.5">
                      <Input placeholder="kg" {...register(`sales.${index}.satuan`)} />
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
