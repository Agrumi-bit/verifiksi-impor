"use client";

import { useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useCommodityGroups } from "@/modules/master-data/use-commodity-groups";
import type { ApplicationWizardValues } from "../../../../schema";
import { konsumsiProductTotal } from "../../schema";
import { CommodityProductSection } from "./commodity-product-section";
import { CurrencyTotals } from "./product-summary";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  brandId: string;
  brandName: string;
  brandOwnerTitle: string | null;
};

/**
 * One Brand's section — "Sub Kelompok Komoditas" (CommodityGroup master data) slots are added
 * explicitly via "+ Tambah Kelompok Komoditas" (never a free-text name, only a master-data
 * selection), each slot existing independently of whether it has Product rows yet. Does not
 * duplicate Brand Master editing — owner info is display-only, read from the same Brand options
 * the "Merek yang Digunakan" step already resolves.
 */
export function BrandProductSection({ form, brandId, brandName, brandOwnerTitle }: Props) {
  const { control } = form;
  const { groupOptions } = useCommodityGroups();
  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control,
    name: "konsumsiProductGroups",
  });
  const allGroups = useWatch({ control, name: "konsumsiProductGroups" }) ?? [];
  const allProducts = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState("");

  const brandGroups = groupFields
    .map((field, index) => ({ field, index, group: allGroups[index] }))
    .filter(({ group }) => group?.brandId === brandId);
  const brandProducts = allProducts.filter((product) => product.brandId === brandId);
  const availableGroupOptions = groupOptions.filter(
    (option) => !brandGroups.some(({ group }) => group?.commodityGroupId === option.value),
  );

  const totalsByCurrency = new Map<string, number>();
  for (const product of brandProducts) {
    totalsByCurrency.set(product.currency, (totalsByCurrency.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }

  function handleConfirmAddGroup(value: string) {
    const option = availableGroupOptions.find((o) => o.value === value);
    if (!option) return;
    appendGroup({ id: crypto.randomUUID(), brandId, commodityGroupId: value, commodityName: option.label });
    setPendingGroupId("");
    setIsAddingGroup(false);
  }

  function handleRemoveGroup(index: number, commodityGroupId: string) {
    const hasProducts = allProducts.some((p) => p.brandId === brandId && p.commodityGroupId === commodityGroupId);
    if (
      hasProducts &&
      !window.confirm(
        "Kelompok komoditas ini masih memiliki produk. Menghapusnya akan ikut menghapus seluruh produk di dalamnya. Lanjutkan?",
      )
    ) {
      return;
    }
    removeGroup(index);
    if (hasProducts) {
      const current = form.getValues("konsumsiProducts") ?? [];
      form.setValue(
        "konsumsiProducts",
        current.filter((p) => !(p.brandId === brandId && p.commodityGroupId === commodityGroupId)),
        { shouldDirty: true },
      );
    }
  }

  return (
    <section className="rounded-xl border border-border p-4.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{brandName}</p>
          {brandOwnerTitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">Pemilik Merek: {brandOwnerTitle}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {brandGroups.length} Kelompok Komoditas &middot; {brandProducts.length} Produk
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Nilai</p>
          <CurrencyTotals totals={totalsByCurrency} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {brandGroups.map(({ field, index, group }) =>
          group ? (
            <div key={field.id} className="relative">
              <button
                type="button"
                onClick={() => handleRemoveGroup(index, group.commodityGroupId)}
                aria-label="Hapus kelompok komoditas"
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
              <CommodityProductSection
                form={form}
                brandId={brandId}
                brandName={brandName}
                commodityGroupId={group.commodityGroupId}
                commodityName={group.commodityName ?? "Kelompok Komoditas"}
              />
            </div>
          ) : null,
        )}

        {brandGroups.length === 0 && !isAddingGroup && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Belum ada kelompok komoditas.
          </p>
        )}

        {isAddingGroup ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchSelectInput
                value={pendingGroupId}
                onChange={(value) => {
                  setPendingGroupId(value);
                  handleConfirmAddGroup(value);
                }}
                options={availableGroupOptions}
                allowFreeText={false}
                placeholder="Pilih sub kelompok komoditas..."
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingGroup(false)}>
              Batal
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingGroup(true)}>
            <Plus className="size-3.5" />
            Tambah Kelompok Komoditas
          </Button>
        )}
      </div>
    </section>
  );
}
