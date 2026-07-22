"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompanyWizardValues } from "../schema";

type Props = {
  form: UseFormReturn<CompanyWizardValues>;
  onEditStep: (step: number) => void;
};

function Section({
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
        <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(step)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  );
}

export function CompanyPreview({ form, onEditStep }: Props) {
  const values = useWatch({ control: form.control });

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Tinjau kembali seluruh data sebelum submit.
      </p>

      <Section title="Company Profile" step={1} onEditStep={onEditStep}>
        <Item label="Company Name" value={values.companyName} />
        <Item label="Company Type" value={values.companyType} />
        <Item label="Investment Status" value={values.investmentStatus} />
        <Item label="Company Email" value={values.companyEmail} />
        <Item label="Contact Name" value={values.contactFullName} />
        <Item label="Contact Designation" value={values.contactDesignation} />
      </Section>

      <Section title="Legal Information" step={2} onEditStep={onEditStep}>
        <Item label="NIB Number" value={values.nibNumber} />
        <Item
          label="KBLI"
          value={values.kbliEntries?.map((entry) => entry?.code).filter(Boolean).join(", ")}
        />
        <Item label="Notarial Deed Number" value={values.notarialDeedNumber} />
        <Item label="Issuing Authority" value={values.notarialIssuingAuthority} />
      </Section>

      <Section title="Location Information" step={3} onEditStep={onEditStep}>
        <Item label="Jumlah Lokasi" value={values.locations?.length?.toString()} />
        <Item
          label="Jenis Lokasi"
          value={values.locations
            ?.map((location) => location?.locationType)
            .filter(Boolean)
            .join(", ")}
        />
      </Section>
    </div>
  );
}
