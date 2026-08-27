"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { Step1CompanySync } from "./steps/step1-company-sync";
import { Step2ContractDetail } from "./steps/step2-contract-detail";
import { Step3Review } from "./steps/step3-review";
import {
  partnerWizardSchema,
  PARTNER_STEP_FIELD_NAMES,
  type PartnerWizardValues,
} from "@/modules/partner/schema";

const STEP_TITLES = ["Sinkronisasi Perusahaan", "Detail Relasi", "Review"];
const TOTAL_STEPS = STEP_TITLES.length;

export function CompanyPartnerWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PartnerWizardValues>({
    resolver: zodResolver(partnerWizardSchema),
    mode: "onBlur",
    defaultValues: { companyId: "" },
  });

  async function goNext() {
    const fields = PARTNER_STEP_FIELD_NAMES[currentStep as 1 | 2 | 3];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function handleSubmit(values: PartnerWizardValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/company-workspace/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan partner");
      }
      const { data } = await response.json();
      toast.success(`Partner "${values.companyName}" berhasil ditambahkan.`);
      router.push(`/company-workspace/supporting/partners/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan partner");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <h1 className="text-lg font-semibold">{STEP_TITLES[currentStep - 1]}</h1>
          <p className="text-sm text-muted-foreground">Tambah Partner Company</p>
        </div>
        <StepIndicator current={currentStep} total={TOTAL_STEPS} />
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        {currentStep === 1 && <Step1CompanySync form={form} />}
        {currentStep === 2 && <Step2ContractDetail form={form} />}
        {currentStep === 3 && <Step3Review form={form} />}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={goBack} disabled={currentStep === 1 || isSubmitting}>
            Kembali
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button type="button" onClick={goNext}>
              Lanjut
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Partner"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
