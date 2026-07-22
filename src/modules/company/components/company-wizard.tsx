"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, CheckCircle2, Eye, FileText, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { CompanyProfileFields } from "@/components/wizard/company-profile-fields";
import { LegalInformationFields } from "@/components/wizard/legal-information-fields";
import { LocationsField } from "@/components/wizard/locations-field";
import { useCompanyWizard } from "../hooks/use-company-wizard";
import { CompanyPreview } from "./company-preview";
import type { CompanyWizardValues } from "../schema";

const STEP_META = [
  { title: "Company Profile", subtitle: "Firm details & contacts", icon: Building2 },
  { title: "Legal Information", subtitle: "Licenses & registrations", icon: FileText },
  { title: "Location Information", subtitle: "Factory & GPS address", icon: MapPin },
  { title: "Preview", subtitle: "Tinjau sebelum submit", icon: Eye },
];

export function CompanyWizard() {
  const router = useRouter();
  const { form, currentStep, totalSteps, goNext, goBack, goToStep, isLastStep } =
    useCompanyWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const meta = STEP_META[currentStep - 1];
  const nextMeta = STEP_META[currentStep];
  const Icon = meta.icon;

  async function handleSubmit(values: CompanyWizardValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan perusahaan");
      }
      const { data } = await response.json();
      setReceiptId(data.id);
      toast.success(`Perusahaan "${data.companyName}" berhasil ditambahkan.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan perusahaan",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNext() {
    await goNext();
  }

  if (receiptId) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 py-20 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" />
        <h1 className="text-xl font-semibold">Perusahaan Berhasil Ditambahkan</h1>
        <Button onClick={() => router.push(`/company/${receiptId}`)}>
          Lihat Company Detail
        </Button>
        <Button variant="outline" onClick={() => router.push("/company")}>
          Kembali ke Company Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {currentStep} of {totalSteps}
              {nextMeta ? ` · Next: ${nextMeta.title}` : ""}
            </p>
            <h1 className="text-lg font-semibold">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
        <StepIndicator current={currentStep} total={totalSteps} />
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        {currentStep === 1 && <CompanyProfileFields form={form} />}
        {currentStep === 2 && <LegalInformationFields form={form} />}
        {currentStep === 3 && <LocationsField form={form} />}
        {currentStep === 4 && <CompanyPreview form={form} onEditStep={goToStep} />}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            Kembali
          </Button>
          {isLastStep ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Perusahaan"}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Lanjut
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
