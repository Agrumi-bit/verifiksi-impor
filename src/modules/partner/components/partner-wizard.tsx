"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { partnerWizardSchema, PARTNER_STEP_FIELD_NAMES, type PartnerWizardValues } from "../schema";
import { PartnerCompanySyncStep } from "./steps/partner-company-sync-step";
import { PartnerContractStep } from "./steps/partner-contract-step";
import { PartnerReviewStep } from "./steps/partner-review-step";

const STEP_TITLES = ["Sinkronisasi Perusahaan", "Detail Relasi", "Review"];
const TOTAL_STEPS = STEP_TITLES.length;

export function PartnerWizard() {
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
      const response = await fetch("/api/partners", {
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
      router.push(`/partners/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan partner");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-190">
        <div className="mb-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push("/partners")}
            className="text-[20px] text-[#a68f80]"
          >
            ←
          </button>
          <div className="text-[20px] font-extrabold text-[#2b2420]">Tambah Partner</div>
        </div>

        <div className="flex flex-col rounded-[14px] border border-[#f0ded0] bg-white">
          <div className="px-6.5 pt-5.5">
            <div className="mb-5 flex items-center">
              {STEP_TITLES.map((title, index) => {
                const step = index + 1;
                const isActive = step === currentStep;
                const isDone = step < currentStep;
                const circleColor = isActive || isDone ? "#e0662e" : "#e8dccd";
                return (
                  <div key={title} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <div className="h-0.5 flex-1" style={{ background: index === 0 ? "transparent" : circleColor }} />
                      <div
                        className="flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-bold"
                        style={{
                          borderColor: circleColor,
                          background: isDone ? "#e0662e" : "#fff",
                          color: isDone ? "#fff" : isActive ? "#e0662e" : "#a68f80",
                        }}
                      >
                        {isDone ? "✓" : step}
                      </div>
                      <div
                        className="h-0.5 flex-1"
                        style={{ background: index === STEP_TITLES.length - 1 ? "transparent" : "#e8dccd" }}
                      />
                    </div>
                    <div
                      className="mt-1.5 text-center text-[10.5px] font-semibold"
                      style={{ color: isActive ? "#c14a1f" : "#a68f80" }}
                    >
                      {title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
            <div className="px-6.5 pb-6.5 pt-5">
              {currentStep === 1 && <PartnerCompanySyncStep form={form} />}
              {currentStep === 2 && <PartnerContractStep form={form} />}
              {currentStep === 3 && <PartnerReviewStep form={form} />}
            </div>

            <div className="flex justify-between gap-2.5 border-t border-[#f0ded0] px-6.5 py-4">
              <button
                type="button"
                onClick={goBack}
                disabled={currentStep === 1 || isSubmitting}
                className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-40"
              >
                Kembali
              </button>
              {currentStep < TOTAL_STEPS ? (
                <button
                  key="next"
                  type="button"
                  onClick={goNext}
                  className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white"
                >
                  Lanjut
                </button>
              ) : (
                <button
                  key="submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Partner"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
