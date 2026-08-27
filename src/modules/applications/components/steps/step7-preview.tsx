"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ApplicationWizardValues } from "../../schema";

type Step7Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  onEditStep: (step: number) => void;
};

function SummarySection({
  title,
  step,
  onEditStep,
  children,
}: {
  title: string;
  step: number;
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
          onClick={() => onEditStep(step)}
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

export function Step7Preview({ form, onEditStep }: Step7Props) {
  const values = useWatch({ control: form.control });

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Tinjau kembali seluruh data sebelum submit. Klik &quot;Edit&quot; untuk
        kembali ke step terkait jika ada yang perlu diperbaiki.
      </p>

      <SummarySection title="Company Information" step={1} onEditStep={onEditStep}>
        <SummaryItem label="Company Name" value={values.companyName} />
        <SummaryItem label="Company Type" value={values.companyType} />
        <SummaryItem label="Investment Status" value={values.investmentStatus} />
        <SummaryItem label="Company Email" value={values.companyEmail} />
        <SummaryItem label="Contact Name" value={values.contactFullName} />
        <SummaryItem label="Contact Designation" value={values.contactDesignation} />
      </SummarySection>

      <SummarySection title="Application Information" step={2} onEditStep={onEditStep}>
        <SummaryItem label="Verification Type" value={values.verificationType} />
        <SummaryItem label="Application Category" value={values.applicationCategory} />
        <SummaryItem
          label="Jenis Impor"
          value={values.importTypes?.join(", ")}
        />
      </SummarySection>

      <SummarySection title="Legal Information" step={3} onEditStep={onEditStep}>
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

      <SummarySection title="Tax Information" step={4} onEditStep={onEditStep}>
        <SummaryItem label="NPWP Number" value={values.npwpNumber} />
      </SummarySection>

      <SummarySection title="Location Information" step={5} onEditStep={onEditStep}>
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

      <SummarySection title="Partner Industri" step={6} onEditStep={onEditStep}>
        <SummaryItem
          label="Partner Industri Aktif"
          value={values.partnerIndustriEntries?.filter((entry) => entry?.enabled).length?.toString()}
        />
      </SummarySection>

      <SummarySection title="Support Document" step={7} onEditStep={onEditStep}>
        <SummaryItem
          label="Dokumen Non Industri Terunggah"
          value={values.nonIndustriDocuments?.filter((doc) => doc?.documentPath).length?.toString()}
        />
        <SummaryItem
          label="Dokumen Konsumsi"
          value={values.konsumsiDocuments?.length?.toString()}
        />
      </SummarySection>

      <SummarySection title="Product Information" step={8} onEditStep={onEditStep}>
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
    </div>
  );
}
