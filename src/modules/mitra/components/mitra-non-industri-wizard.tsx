"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import {
  mitraNonIndustriSchema,
  MITRA_STEP_FIELD_NAMES,
  type MitraNonIndustriValues,
} from "../schema";
import { MitraProfileStep } from "./steps/mitra-profile-step";
import { MitraContactStep } from "./steps/mitra-contact-step";
import { MitraContractStep } from "./steps/mitra-contract-step";

const STEP_TITLES = ["Profil Mitra", "Kontak", "Kontrak Kerja Sama"];
const TOTAL_STEPS = STEP_TITLES.length;

export function MitraNonIndustriWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MitraNonIndustriValues>({
    resolver: zodResolver(mitraNonIndustriSchema),
    mode: "onBlur",
  });

  async function goNext() {
    const fields = Array.from(
      MITRA_STEP_FIELD_NAMES.NON_INDUSTRI[currentStep as 1 | 2 | 3],
    ) as (keyof MitraNonIndustriValues)[];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function handleSubmit(values: MitraNonIndustriValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "NON_INDUSTRI", ...values }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan mitra non industri");
      }
      const { data } = await response.json();
      toast.success(`Mitra Non Industri "${data.name}" berhasil ditambahkan.`);
      router.push(`/mitra/non-industri/${data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan mitra non industri",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <h1 className="text-lg font-semibold">
            {STEP_TITLES[currentStep - 1]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tambah Mitra Non Industri Baru
          </p>
        </div>
        <StepIndicator current={currentStep} total={TOTAL_STEPS} />
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        {currentStep === 1 && <MitraProfileStep form={form} />}
        {currentStep === 2 && <MitraContactStep form={form} />}
        {currentStep === 3 && <MitraContractStep form={form} />}

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
              {isSubmitting ? "Menyimpan..." : "Simpan Mitra Non Industri"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
