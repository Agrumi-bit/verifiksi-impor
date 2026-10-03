"use client";

import type { ApplicationBrandEntryValues, ApplicationKonsumsiProductValues, ProductGroupCertificateValues } from "../../schema";
import { konsumsiProductTotal } from "../../schema";
import { CERTIFICATE_STATUS_CLASSES, CERTIFICATE_STATUS_LABELS, computeCertificateStatus } from "./certificate-status";

type BrandOption = { id: string; brandName: string };

type Props = {
  applicationBrands: ApplicationBrandEntryValues[];
  brandOptions: BrandOption[] | undefined;
  products: ApplicationKonsumsiProductValues[];
  certificates: ProductGroupCertificateValues[];
};

function formatMoney(value: number): string {
  if (value === 0) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

/**
 * Merek x Sub Kelompok Komoditas requirement matrix — one row per Brand on this application, one
 * column per Sub Kelompok Komoditas that has at least one Product anywhere on the application.
 * A cell with no Product for that (Brand, Sub Kelompok) pair is blank/unclickable (nothing to show
 * or scroll to — there's no requirement for a combination that doesn't exist). Clicking a
 * non-empty cell scrolls to that group's section (see commodity-product-section.tsx's own
 * `id={konsumsi-group-${brandId}-${commodityGroupId}}`).
 */
export function ProductGroupMatrix({ applicationBrands, brandOptions, products, certificates }: Props) {
  const columns = new Map<string, string>();
  for (const product of products) {
    if (!columns.has(product.commodityGroupId)) columns.set(product.commodityGroupId, product.commodityName || product.commodityGroupId);
  }
  if (columns.size === 0 || applicationBrands.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function brandLabel(brandId: string): string {
    return brandOptions?.find((option) => option.id === brandId)?.brandName ?? brandId;
  }

  function scrollToGroup(brandId: string, commodityGroupId: string) {
    document.getElementById(`konsumsi-group-${brandId}-${commodityGroupId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Merek</th>
            {[...columns.entries()].map(([commodityGroupId, commodityName]) => (
              <th key={commodityGroupId} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {commodityName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applicationBrands.map((brand) => (
            <tr key={brand.brandId} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5 font-semibold">{brandLabel(brand.brandId)}</td>
              {[...columns.keys()].map((commodityGroupId) => {
                const groupProducts = products.filter((p) => p.brandId === brand.brandId && p.commodityGroupId === commodityGroupId);
                if (groupProducts.length === 0) {
                  return <td key={commodityGroupId} className="px-3 py-2.5 text-center text-muted-foreground">—</td>;
                }
                const total = groupProducts.reduce((sum, p) => sum + konsumsiProductTotal(p), 0);
                const certificate = certificates.find((c) => c.brandId === brand.brandId && c.commodityGroupId === commodityGroupId);
                const status = computeCertificateStatus(certificate, { brandId: brand.brandId, commodityGroupId }, today);
                return (
                  <td key={commodityGroupId} className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => scrollToGroup(brand.brandId, commodityGroupId)}
                      className="flex w-full flex-col items-start gap-1 rounded-lg p-1.5 text-left hover:bg-muted/50"
                    >
                      <span className="text-xs text-muted-foreground">{groupProducts.length} produk &middot; {formatMoney(total)}</span>
                      <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold ${CERTIFICATE_STATUS_CLASSES[status]}`}>
                        {CERTIFICATE_STATUS_LABELS[status]}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
