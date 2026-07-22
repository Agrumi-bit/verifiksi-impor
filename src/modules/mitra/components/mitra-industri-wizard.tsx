"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { mitraIndustriSchema, MITRA_STEP_FIELD_NAMES, type MitraIndustriValues } from "../schema";
import { MitraProfileStep } from "./steps/mitra-profile-step";
import { MitraContactStep } from "./steps/mitra-contact-step";
import { MitraLhvkiStep } from "./steps/mitra-lhvki-step";

const STEP_TITLES = ["Profil Mitra", "Kontak", "LHVKI"];
const TOTAL_STEPS = STEP_TITLES.length;

export function MitraIndustriWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MitraIndustriValues>({
    resolver: zodResolver(mitraIndustriSchema),
    mode: "onBlur",
  });

  async function goNext() {
    const fields = Array.from(
      MITRA_STEP_FIELD_NAMES.INDUSTRI[currentStep as 1 | 2 | 3],
    ) as (keyof MitraIndustriValues)[];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function handleSubmit(values: MitraIndustriValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "INDUSTRI", ...values }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan mitra industri");
      }
      const { data } = await response.json();
      toast.success(`Mitra Industri "${data.name}" berhasil ditambahkan.`);
      router.push(`/mitra/industri/${data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan mitra industri",
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
            Tambah Mitra Industri Baru
          </p>
        </div>
        <StepIndicator current={currentStep} total={TOTAL_STEPS} />
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        {currentStep === 1 && <MitraProfileStep form={form} />}
        {currentStep === 2 && <MitraContactStep form={form} />}
        {currentStep === 3 && <MitraLhvkiStep form={form} />}

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
              {isSubmitting ? "Menyimpan..." : "Simpan Mitra Industri"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
