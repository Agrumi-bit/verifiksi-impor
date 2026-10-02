"use client";

import { useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ApplicationWizardValues } from "../../../../schema";
import { deriveKonsumsiProductGroups, konsumsiProductTotal } from "../../schema";
import { CommodityProductSection } from "./commodity-product-section";
import { CurrencyTotals } from "./product-summary";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  brandId: string;
  brandName: string;
  brandOwnerTitle: string | null;
  /** Jumps the wizard to Step "Dokumen Pendukung Merek" — used by the empty state when this
   * Brand has no commodity grouping to add products into yet. */
  onNavigateToQualityTestStep: () => void;
};

/**
 * One Brand's section — collapsible (click the header), since a permohonan with several Brands
 * each carrying several commodity groups can get long. Kelompok Komoditas / Sub Kelompok
 * Komoditas groupings are never picked independently here. They're derived from this Brand's own
 * `brandQualityTests` entries (Step "Dokumen Pendukung Merek"), so Product Information always
 * stays in sync with whatever commodity groupings were already established there; this step only
 * ever adds Products into them. Does not duplicate Brand Master editing — owner info is display-
 * only, read from the same Brand options the "Merek yang Digunakan" step already resolves.
 */
export function BrandProductSection({ form, brandId, brandName, brandOwnerTitle, onNavigateToQualityTestStep }: Props) {
  const { control } = form;
  const qualityTests = useWatch({ control, name: "brandQualityTests" }) ?? [];
  const allProducts = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const [collapsed, setCollapsed] = useState(false);

  const brandGroups = deriveKonsumsiProductGroups(qualityTests.filter((qt) => qt.brandId === brandId));
  const brandProducts = allProducts.filter((product) => product.brandId === brandId);

  const totalsByCurrency = new Map<string, number>();
  for (const product of brandProducts) {
    totalsByCurrency.set(product.currency, (totalsByCurrency.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full flex-wrap items-center gap-3 p-4.5 text-left hover:bg-muted/30"
        aria-expanded={!collapsed}
      >
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        <div className="flex-1">
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
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-3 border-t border-border p-4.5">
          {brandGroups.map((group) => (
            <CommodityProductSection
              key={group.commodityGroupId}
              form={form}
              brandId={brandId}
              brandName={brandName}
              industryGroupId={group.industryGroupId}
              industryName={group.industryName ?? "Kelompok Komoditas"}
              commodityGroupId={group.commodityGroupId}
              commodityName={group.commodityName ?? "Sub Kelompok Komoditas"}
            />
          ))}

          {brandGroups.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Belum ada kelompok komoditas. Kelompok Komoditas &amp; Sub Kelompok Komoditas untuk
                merek ini ditentukan di Step &quot;Dokumen Pendukung Merek&quot;.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onNavigateToQualityTestStep}>
                Ke Step Dokumen Pendukung Merek
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
