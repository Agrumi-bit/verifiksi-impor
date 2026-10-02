"use client";

import { useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ApplicationWizardValues } from "../../../../schema";
import { konsumsiProductTotal, type ApplicationKonsumsiProductValues } from "../../schema";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductTable } from "./product-table";
import { CurrencyTotals } from "./product-summary";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  brandId: string;
  brandName: string;
  commodityGroupId: string;
  commodityName: string;
};

type DialogState = { mode: "add" } | { mode: "edit"; index: number };

/** One Kelompok Komoditas slot under a Brand — its own product table, scoped to rows matching
 * both `brandId` and `commodityGroupId`. Reads/writes `konsumsiProducts` directly via
 * getValues/setValue rather than a nested `useFieldArray` (the rendered rows are a filtered view
 * over one flat array shared across every Brand x Commodity Group combination, same pattern
 * StepQualityTest already uses for its own per-brand grouping). */
export function CommodityProductSection({ form, brandId, brandName, commodityGroupId, commodityName }: Props) {
  const { control } = form;
  const allProducts = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const rows = allProducts
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => product.brandId === brandId && product.commodityGroupId === commodityGroupId);

  const totalsByCurrency = new Map<string, number>();
  for (const { product } of rows) {
    totalsByCurrency.set(product.currency, (totalsByCurrency.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }

  function handleSave(values: ApplicationKonsumsiProductValues) {
    const current = form.getValues("konsumsiProducts") ?? [];
    if (dialogState?.mode === "edit") {
      form.setValue(
        "konsumsiProducts",
        current.map((product, index) => (index === dialogState.index ? values : product)),
        { shouldDirty: true },
      );
    } else {
      form.setValue("konsumsiProducts", [...current, values], { shouldDirty: true });
    }
    setDialogState(null);
  }

  function handleRemove(index: number) {
    if (!window.confirm("Hapus produk dari permohonan?\n\nProduk hanya akan dihapus dari permohonan VIU ini.")) return;
    const current = form.getValues("konsumsiProducts") ?? [];
    form.setValue(
      "konsumsiProducts",
      current.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  }

  const editingProduct = dialogState?.mode === "edit" ? rows.find((row) => row.index === dialogState.index)?.product : undefined;

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelompok Komoditas</p>
          <p className="text-sm font-bold">{commodityName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{rows.length} Produk</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Nilai</p>
          <CurrencyTotals totals={totalsByCurrency} />
        </div>
      </div>

      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Belum ada produk pada kelompok komoditas ini.
          </p>
        ) : (
          <ProductTable rows={rows} onEdit={(index) => setDialogState({ mode: "edit", index })} onRemove={handleRemove} />
        )}
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setDialogState({ mode: "add" })}>
        <Plus className="size-3.5" />
        Tambah Produk
      </Button>

      {dialogState && (
        <ProductFormDialog
          brandId={brandId}
          brandName={brandName}
          commodityGroupId={commodityGroupId}
          commodityName={commodityName}
          initialValues={editingProduct}
          existingProducts={allProducts}
          excludeIndex={dialogState.mode === "edit" ? dialogState.index : undefined}
          onSave={handleSave}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  );
}
