"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApplicationWizard } from "../hooks/use-application-wizard";
import { TOTAL_WIZARD_STEPS, WIZARD_STEPS } from "../wizard-steps-meta";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { CompanyProfileFields } from "@/components/wizard/company-profile-fields";
import { LegalInformationFields } from "@/components/wizard/legal-information-fields";
import { LocationsField } from "@/components/wizard/locations-field";
import { LOCATION_TYPES } from "@/modules/shared/schema";
import { Step1ApplicationInformation } from "./steps/step1-application-information";
import { Step5SupportDocument } from "./steps/step5-support-document";
import { Step6ProductInformation } from "./steps/step6-product-information";
import { Step7Preview } from "./steps/step7-preview";
import { Step8Submit } from "./steps/step8-submit";
import type { ApplicationWizardValues } from "../schema";

type SubmitReceipt = {
  applicationNumber: string;
};

export function ApplicationWizard() {
  const { form, currentStep, goNext, goBack, goToStep, isLastImplementedStep } =
    useApplicationWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SubmitReceipt | null>(null);

  const meta = WIZARD_STEPS[currentStep - 1];
  const nextMeta = WIZARD_STEPS[currentStep];
  const Icon = meta.icon;
  const verificationType = form.watch("verificationType");
  const locationAvailableTypes =
    verificationType === "VIU"
      ? LOCATION_TYPES.filter((type) => type !== "PABRIK")
      : LOCATION_TYPES;

  async function handleSubmitApplication(values: ApplicationWizardValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal mengirim permohonan");
      }
      const data = (await response.json()) as { applicationNumber: string };
      setReceipt({ applicationNumber: data.applicationNumber });
      toast.success(`Permohonan berhasil disubmit: ${data.applicationNumber}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mengirim permohonan, coba lagi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNext() {
    await goNext();
  }

  if (receipt) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 py-20 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" />
        <h1 className="text-xl font-semibold">Permohonan Berhasil Disubmit</h1>
        <p className="text-sm text-muted-foreground">
          Nomor aplikasi Anda:
        </p>
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-2 font-mono text-sm">
          {receipt.applicationNumber}
        </p>
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
              Step {currentStep} of {TOTAL_WIZARD_STEPS}
              {nextMeta ? ` · Next: ${nextMeta.title}` : ""}
            </p>
            <h1 className="text-lg font-semibold">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
        <StepIndicator current={currentStep} total={TOTAL_WIZARD_STEPS} />
      </div>

      <form
        onSubmit={form.handleSubmit(handleSubmitApplication)}
        className="flex flex-col gap-6"
      >
        {currentStep === 1 && <Step1ApplicationInformation form={form} />}
        {currentStep === 2 && <CompanyProfileFields form={form} />}
        {currentStep === 3 && <LegalInformationFields form={form} />}
        {currentStep === 4 && (
          <LocationsField
            form={form}
            availableTypes={locationAvailableTypes}
            typeHint={
              verificationType === "VIU"
                ? "VIU hanya memerlukan informasi Kantor dan Gudang"
                : undefined
            }
          />
        )}
        {currentStep === 5 && <Step5SupportDocument form={form} />}
        {currentStep === 6 && <Step6ProductInformation form={form} />}
        {currentStep === 7 && (
          <Step7Preview form={form} onEditStep={goToStep} />
        )}
        {currentStep === 8 && <Step8Submit form={form} />}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            Kembali
          </Button>
          {isLastImplementedStep ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Mengirim..." : "Submit Application"}
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
