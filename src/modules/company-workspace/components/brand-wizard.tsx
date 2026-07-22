"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { Step1BrandInfo } from "@/modules/merk/components/steps/step1-brand-info";
import { Step2Ownership } from "@/modules/merk/components/steps/step2-ownership";
import {
  merkWizardSchema,
  MERK_STEP_FIELD_NAMES,
  type MerkWizardValues,
} from "@/modules/merk/schema";

const STEP_TITLES = ["Informasi Merek", "Kepemilikan"];
const TOTAL_STEPS = STEP_TITLES.length;

export function CompanyBrandWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MerkWizardValues>({
    resolver: zodResolver(merkWizardSchema),
    mode: "onBlur",
  });

  async function goNext() {
    const fields = MERK_STEP_FIELD_NAMES[currentStep] ?? [];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function handleSubmit(values: MerkWizardValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/company-workspace/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan merek");
      }
      const { data } = await response.json();
      toast.success(`Merek "${data.brandName}" berhasil didaftarkan.`);
      router.push("/company-workspace/supporting/brands");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan merek");
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
          <p className="text-sm text-muted-foreground">Register New Brand</p>
        </div>
        <StepIndicator current={currentStep} total={TOTAL_STEPS} />
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        {currentStep === 1 && <Step1BrandInfo form={form} />}
        {currentStep === 2 && <Step2Ownership form={form} />}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            Kembali
          </Button>
          {currentStep < TOTAL_STEPS ? (
            <Button type="button" onClick={goNext}>
              Lanjut
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Merek"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
