"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deriveKonsumsiProductGroups, konsumsiProductTotal } from "../../viu-schemes/konsumsi/schema";
import type { ApplicationWizardValues } from "../../schema";

type Step7Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  onEditStep: (step: number) => void;
  /** Resolves a step's stable key to its current displayed number — step numbers shift whenever
   * a conditional step (Partner Industri, Konsumsi's own steps) is filtered out of activeSteps,
   * so a section's Edit button must never hardcode a position (see application-wizard.tsx's own
   * `stepNumberByKey`, built the same way). A key with no match (e.g. "product-info" simply isn't
   * in activeSteps for VKI) disables that section's Edit button rather than jumping to the wrong
   * step. */
  stepNumberByKey: Record<string, number | undefined>;
};

function formatMoney(value: number): string {
  return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SummarySection({
  title,
  step,
  onEditStep,
  children,
}: {
  title: string;
  step: number | undefined;
  onEditStep: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={step === undefined}
          onClick={() => step !== undefined && onEditStep(step)}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

export function Step7Preview({ form, onEditStep, stepNumberByKey }: Step7Props) {
  const values = useWatch({ control: form.control });

  const konsumsiTotalsByCurrency = new Map<string, number>();
  for (const product of values.konsumsiProducts ?? []) {
    if (!product) continue;
    const currency = product.currency ?? "USD";
    const total = konsumsiProductTotal({
      quantity: product.quantity ?? "",
      averageUnitPrice: product.averageUnitPrice ?? "",
    });
    konsumsiTotalsByCurrency.set(currency, (konsumsiTotalsByCurrency.get(currency) ?? 0) + total);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Tinjau kembali seluruh data sebelum submit. Klik &quot;Edit&quot; untuk
        kembali ke step terkait jika ada yang perlu diperbaiki.
      </p>

      <SummarySection title="Company Information" step={stepNumberByKey.company} onEditStep={onEditStep}>
        <SummaryItem label="Company Name" value={values.companyName} />
        <SummaryItem label="Company Type" value={values.companyType} />
        <SummaryItem label="Investment Status" value={values.investmentStatus} />
        <SummaryItem label="Company Email" value={values.companyEmail} />
        <SummaryItem label="Contact Name" value={values.contactFullName} />
        <SummaryItem label="Contact Designation" value={values.contactDesignation} />
      </SummarySection>

      <SummarySection title="Application Information" step={stepNumberByKey["application-info"]} onEditStep={onEditStep}>
        <SummaryItem label="Verification Type" value={values.verificationType} />
        <SummaryItem label="Application Category" value={values.applicationCategory} />
        <SummaryItem
          label="Jenis Impor"
          value={values.importTypes?.join(", ")}
        />
      </SummarySection>

      <SummarySection title="Legal Information" step={stepNumberByKey.legal} onEditStep={onEditStep}>
        <SummaryItem label="NIB Number" value={values.nibNumber} />
        <SummaryItem
          label="KBLI"
          value={values.kbliEntries
            ?.map((entry) => entry?.code)
            .filter(Boolean)
            .join(", ")}
        />
        <SummaryItem label="Notarial Deed Number" value={values.notarialDeedNumber} />
        <SummaryItem
          label="Issuing Authority"
          value={values.notarialIssuingAuthority}
        />
      </SummarySection>

      <SummarySection title="Tax Information" step={stepNumberByKey.tax} onEditStep={onEditStep}>
        <SummaryItem label="NPWP Number" value={values.npwpNumber} />
      </SummarySection>

      <SummarySection title="Location Information" step={stepNumberByKey.location} onEditStep={onEditStep}>
        <SummaryItem
          label="Jumlah Lokasi"
          value={values.locations?.length?.toString()}
        />
        <SummaryItem
          label="Jenis Lokasi"
          value={values.locations
            ?.map((location) => location?.locationType)
            .filter(Boolean)
            .join(", ")}
        />
      </SummarySection>

      {(values.importTypes ?? []).includes("BARANG_KONSUMSI") && (
        <SummarySection title="Merek yang Digunakan" step={stepNumberByKey["brands-used"]} onEditStep={onEditStep}>
          <SummaryItem
            label="Jumlah Merek"
            value={values.applicationBrands?.length?.toString()}
          />
        </SummarySection>
      )}

      {(values.importTypes ?? []).includes("BARANG_KONSUMSI") && (
        <SummarySection title="Dokumen Pendukung Merek" step={stepNumberByKey["quality-test"]} onEditStep={onEditStep}>
          <SummaryItem
            label="Sertifikat Uji Mutu Terunggah"
            value={values.brandQualityTests?.filter((qt) => qt?.filePath).length?.toString()}
          />
        </SummarySection>
      )}

      {(values.importTypes ?? []).includes("BAHAN_BAKU_INDUSTRI") && (
        <SummarySection title="Partner Industri" step={stepNumberByKey["partner-industri"]} onEditStep={onEditStep}>
          <SummaryItem
            label="Partner Industri Aktif"
            value={values.partnerIndustriEntries?.filter((entry) => entry?.enabled).length?.toString()}
          />
        </SummarySection>
      )}

      <SummarySection title="Support Document" step={stepNumberByKey["support-document"]} onEditStep={onEditStep}>
        {((values.importTypes ?? []).includes("BAHAN_BAKU_INDUSTRI") || (values.importTypes ?? []).includes("BAHAN_BAKU_NON_INDUSTRI")) && (
          <SummaryItem
            label="Dokumen Modal Terunggah"
            value={values.nonIndustriDocuments?.filter((doc) => doc?.documentPath).length?.toString()}
          />
        )}
        {(values.importTypes ?? []).includes("BARANG_KONSUMSI") && (
          <SummaryItem
            label="Dokumen Modal Konsumsi Terunggah"
            value={values.konsumsiFinancialDocuments?.filter((doc) => doc?.documentPath).length?.toString()}
          />
        )}
      </SummarySection>

      {((values.importTypes ?? []).includes("BAHAN_BAKU_INDUSTRI") || (values.importTypes ?? []).includes("BAHAN_BAKU_NON_INDUSTRI")) && (
        <SummarySection title="Product Information" step={stepNumberByKey["product-info"]} onEditStep={onEditStep}>
          <SummaryItem
            label="Jumlah Produk"
            value={values.products?.length?.toString()}
          />
          <SummaryItem
            label="Jenis Material"
            value={values.products
              ?.map((product) => product?.materialType)
              .filter(Boolean)
              .join(", ")}
          />
        </SummarySection>
      )}

      {(values.importTypes ?? []).includes("BARANG_KONSUMSI") && (
        <SummarySection title="Produk — VIU Barang Konsumsi" step={stepNumberByKey["product-info"]} onEditStep={onEditStep}>
          <SummaryItem label="Jumlah Merek" value={values.applicationBrands?.length?.toString()} />
          <SummaryItem
            label="Jumlah Kelompok Komoditas"
            value={deriveKonsumsiProductGroups(
              (values.brandQualityTests ?? []).flatMap((qt) =>
                qt?.brandId && qt.industryGroupId && qt.commodityGroupId
                  ? [
                      {
                        brandId: qt.brandId,
                        industryGroupId: qt.industryGroupId,
                        industryName: qt.industryName,
                        commodityGroupId: qt.commodityGroupId,
                        commodityName: qt.commodityName ?? "",
                      },
                    ]
                  : [],
              ),
            ).length.toString()}
          />
          <SummaryItem label="Jumlah Produk" value={values.konsumsiProducts?.length?.toString()} />
          <SummaryItem
            label="Total Nilai Produk"
            value={
              konsumsiTotalsByCurrency.size > 0
                ? [...konsumsiTotalsByCurrency.entries()].map(([currency, total]) => `${currency} ${formatMoney(total)}`).join(" / ")
                : undefined
            }
          />
        </SummarySection>
      )}
    </div>
  );
}
