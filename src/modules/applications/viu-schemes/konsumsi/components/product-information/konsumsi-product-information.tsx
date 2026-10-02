"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useApplicationBrandOptions } from "../../../../hooks/use-application-brand-options";
import type { ApplicationWizardValues } from "../../../../schema";
import { deriveKonsumsiProductGroups, konsumsiProductTotal } from "../../schema";
import { BrandProductSection } from "./brand-product-section";
import { CurrencyTotals } from "./product-summary";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  /** Jumps the wizard to Step "Merek yang Digunakan" — used by the empty state below when no
   * Brand has been selected yet, so the user isn't stuck on this step with nothing to do. */
  onNavigateToBrandsStep: () => void;
  /** Jumps the wizard to Step "Dokumen Pendukung Merek" — forwarded to each BrandProductSection
   * for its own empty state (a Brand with no commodity grouping yet). */
  onNavigateToQualityTestStep: () => void;
};

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

/**
 * VIU Barang Konsumsi's own Product Information content, composed alongside (never replacing)
 * the shared `Step6ProductInformation` on the same "product-info" step — Industri/Non-Industri's
 * generic free-text product list is untouched by this component and keeps working exactly as
 * before, including on a mixed Industri+Konsumsi application.
 *
 * Structure: Merek (`applicationBrands`, selected in Step "Merek yang Digunakan" — never typed
 * here) > Kelompok Komoditas / Sub Kelompok Komoditas (derived from `brandQualityTests`, Step
 * "Dokumen Pendukung Merek" — never picked independently here) > Produk. Brand source is always
 * `applicationBrands[].brandId`; this component never lets the user type an arbitrary brand name.
 */
export function KonsumsiProductInformation({ form, onNavigateToBrandsStep, onNavigateToQualityTestStep }: Props) {
  const { control } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];
  const applicationBrands = useWatch({ control, name: "applicationBrands" }) ?? [];
  const qualityTests = useWatch({ control, name: "brandQualityTests" }) ?? [];
  const products = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const { data: brandOptions } = useApplicationBrandOptions();

  if (!importTypes.includes("BARANG_KONSUMSI")) return null;

  if (applicationBrands.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold">Belum ada merek yang dipilih.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tambahkan merek terlebih dahulu pada step Merek yang Digunakan.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={onNavigateToBrandsStep}>
          Ke Step Merek yang Digunakan
        </Button>
      </div>
    );
  }

  const totalsByCurrency = new Map<string, number>();
  for (const product of products) {
    totalsByCurrency.set(product.currency, (totalsByCurrency.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }

  const productsError = form.formState.errors.konsumsiProducts?.message;

  return (
    <div className="mt-8 flex flex-col gap-6 border-t border-border pt-8">
      <div>
        <h2 className="text-lg font-bold">Produk — VIU Barang Konsumsi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan produk yang akan diimpor untuk setiap merek dan kelompok komoditas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Jumlah Merek" value={applicationBrands.length} />
        <SummaryStat label="Jumlah Kelompok Komoditas" value={deriveKonsumsiProductGroups(qualityTests).length} />
        <SummaryStat label="Jumlah Produk" value={products.length} />
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Total Nilai Produk</p>
          <CurrencyTotals totals={totalsByCurrency} />
        </div>
      </div>

      {typeof productsError === "string" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {productsError}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {applicationBrands.map((brand) => {
          const brandOption = brandOptions?.find((option) => option.id === brand.brandId);
          return (
            <BrandProductSection
              key={brand.brandId}
              form={form}
              brandId={brand.brandId}
              brandName={brandOption?.brandName ?? "Merek"}
              brandOwnerTitle={brandOption?.ownerTitle ?? null}
              onNavigateToQualityTestStep={onNavigateToQualityTestStep}
            />
          );
        })}
      </div>
    </div>
  );
}
