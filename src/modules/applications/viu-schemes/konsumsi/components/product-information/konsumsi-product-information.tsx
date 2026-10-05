"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useApplicationBrandOptions } from "../../../../hooks/use-application-brand-options";
import type { ApplicationWizardValues } from "../../../../schema";
import { deriveProductGroups, konsumsiProductTotal, productGroupKey } from "../../schema";
import { BrandProductSection } from "./brand-product-section";
import { CurrencyTotals } from "./product-summary";
import { ProductGroupMatrix } from "./product-group-matrix";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  /** Jumps the wizard to Step "Merek yang Digunakan" — used by the empty state below when no
   * Brand has been selected yet, so the user isn't stuck on this step with nothing to do. */
  onNavigateToBrandsStep: () => void;
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
 * here) > Sub Kelompok Komoditas (derived bottom-up from each Product's own HS Code — see
 * `deriveProductGroups`) > Produk. Brand source is always `applicationBrands[].brandId`; this
 * component never lets the user type an arbitrary brand name. The Merek x Sub Kelompok matrix
 * above the Brand sections surfaces each group's certificate-coverage status at a glance.
 */
export function KonsumsiProductInformation({ form, onNavigateToBrandsStep }: Props) {
  const { control } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];
  const applicationBrands = useWatch({ control, name: "applicationBrands" }) ?? [];
  const products = useWatch({ control, name: "konsumsiProducts" }) ?? [];
  const certificates = useWatch({ control, name: "productGroupCertificates" }) ?? [];
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
  // Computed fresh from form state (not the raw zod message, which only has commodityGroupId —
  // no brand name, since applyKonsumsiSubmitRules is a synchronous refinement with no DB/network
  // access to resolve one). Shown proactively, not just after a failed "Lanjut" attempt.
  const missingCertificateGroups = deriveProductGroups(products).filter(
    (group) => !certificates.some((certificate) => productGroupKey(certificate) === productGroupKey(group) && certificate.filePath),
  );
  // Products the HS Code master data moved to another Sub Kelompok since they were entered (see
  // resyncKonsumsiProductCommodities) — their group may now need its own certificate.
  const regroupedProducts = products.filter((product) => product.commodityGroupChangedFrom);

  return (
    <div className="mt-8 flex flex-col gap-6 border-t border-border pt-8">
      <div>
        <h2 className="text-lg font-bold">Produk — VIU Barang Konsumsi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan produk yang akan diimpor untuk setiap merek. Sub Kelompok Komoditas ditentukan
          otomatis dari HS Code yang dipilih pada setiap produk.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Jumlah Merek" value={applicationBrands.length} />
        <SummaryStat label="Jumlah Sub Kelompok Komoditas" value={deriveProductGroups(products).length} />
        <SummaryStat label="Jumlah Produk" value={products.length} />
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Total Nilai Produk</p>
          <CurrencyTotals totals={totalsByCurrency} />
        </div>
      </div>

      {regroupedProducts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300">
          <p className="font-semibold">Sub Kelompok Komoditas diperbarui mengikuti master HS Code</p>
          <p className="mt-0.5">
            HS Code berikut dipindahkan admin ke Sub Kelompok lain setelah produk diinput. Pastikan grup barunya memiliki
            sertifikat Hasil Uji Mutu (bisa memakai sertifikat yang sudah ada).
          </p>
          <ul className="mt-1 list-disc pl-4">
            {regroupedProducts.map((product) => (
              <li key={product.id}>
                {product.productName} ({product.hsCode}): {product.commodityGroupChangedFrom} → <strong>{product.commodityName}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(typeof productsError === "string" || missingCertificateGroups.length > 0) && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {typeof productsError === "string" && <p>{productsError}</p>}
          {missingCertificateGroups.length > 0 && (
            <div>
              <p className="font-semibold">Sertifikat Hasil Uji Mutu belum lengkap untuk:</p>
              <ul className="mt-1 list-disc pl-4">
                {missingCertificateGroups.map((group) => (
                  <li key={`${group.brandId}-${group.commodityGroupId}`}>
                    {brandOptions?.find((option) => option.id === group.brandId)?.brandName ?? group.brandId} · {group.commodityName ?? group.commodityGroupId}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ProductGroupMatrix applicationBrands={applicationBrands} brandOptions={brandOptions} products={products} certificates={certificates} />

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
            />
          );
        })}
      </div>
    </div>
  );
}
