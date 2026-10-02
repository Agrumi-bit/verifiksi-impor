"use client";

import { useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApplicationWizardValues } from "../../../../schema";
import { konsumsiProductTotal, type ApplicationKonsumsiProductValues } from "../../schema";
import { ProductFormSheet } from "./product-form-sheet";
import { ProductTable } from "./product-table";
import { CurrencyTotals } from "./product-summary";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  brandId: string;
  brandName: string;
  industryGroupId: string;
  industryName: string;
  commodityGroupId: string;
  commodityName: string;
};

type SheetState = { mode: "add" } | { mode: "edit"; index: number };

/** One Sub Kelompok Komoditas slot under a Brand (part of a Kelompok Komoditas / Sub Kelompok
 * Komoditas pair derived from Step "Dokumen Pendukung Merek" — see BrandProductSection) — its own
 * product table, scoped to rows matching both `brandId` and `commodityGroupId`. Reads/writes
 * `konsumsiProducts` directly via getValues/setValue rather than a nested `useFieldArray` (the
 * rendered rows are a filtered view over one flat array shared across every Brand x Commodity
 * Group combination, same pattern StepQualityTest already uses for its own per-brand grouping). */
export function CommodityProductSection({
  form,
  brandId,
  brandName,
  industryGroupId,
  industryName,
  commodityGroupId,
  commodityName,
}: Props) {
  const { control } = form;
  const allProducts = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const [sheetState, setSheetState] = useState<SheetState | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const rows = allProducts
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => product.brandId === brandId && product.commodityGroupId === commodityGroupId);

  const totalsByCurrency = new Map<string, number>();
  for (const { product } of rows) {
    totalsByCurrency.set(product.currency, (totalsByCurrency.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }

  function handleSave(values: ApplicationKonsumsiProductValues) {
    const current = form.getValues("konsumsiProducts") ?? [];
    if (sheetState?.mode === "edit") {
      form.setValue(
        "konsumsiProducts",
        current.map((product, index) => (index === sheetState.index ? values : product)),
        { shouldDirty: true },
      );
    } else {
      form.setValue("konsumsiProducts", [...current, values], { shouldDirty: true });
    }
    setSheetState(null);
  }

  function confirmDelete() {
    if (deleteIndex === null) return;
    const current = form.getValues("konsumsiProducts") ?? [];
    form.setValue(
      "konsumsiProducts",
      current.filter((_, i) => i !== deleteIndex),
      { shouldDirty: true },
    );
    setDeleteIndex(null);
  }

  const editingProduct = sheetState?.mode === "edit" ? rows.find((row) => row.index === sheetState.index)?.product : undefined;

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelompok Komoditas</p>
          <p className="text-sm font-bold">{industryName}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub Kelompok Komoditas</p>
          <p className="text-sm font-bold">{commodityName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{rows.length} Produk</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Nilai</p>
          <CurrencyTotals totals={totalsByCurrency} />
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
        Hasil Uji Mutu akan dikelola berdasarkan Merek + Kelompok Komoditas.
      </p>

      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Belum ada produk pada kelompok komoditas ini.
          </p>
        ) : (
          <ProductTable rows={rows} onEdit={(index) => setSheetState({ mode: "edit", index })} onRemove={setDeleteIndex} />
        )}
      </div>

      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSheetState({ mode: "add" })}>
        <Plus className="size-3.5" />
        Tambah Produk
      </Button>

      {sheetState && (
        <ProductFormSheet
          brandId={brandId}
          brandName={brandName}
          industryGroupId={industryGroupId}
          industryName={industryName}
          commodityGroupId={commodityGroupId}
          commodityName={commodityName}
          initialValues={editingProduct}
          existingProducts={allProducts}
          excludeIndex={sheetState.mode === "edit" ? sheetState.index : undefined}
          onSave={handleSave}
          onClose={() => setSheetState(null)}
        />
      )}

      <Dialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <DialogTitle>Hapus Produk?</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Produk hanya akan dihapus dari permohonan VIU ini.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteIndex(null)}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
