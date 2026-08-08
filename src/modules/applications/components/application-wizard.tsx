"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

import { useApplicationWizard } from "../hooks/use-application-wizard";
import { CompanyProfileFields } from "@/components/wizard/company-profile-fields";
import { CompanyPickerField } from "./company-picker-field";
import { LockedCompanyField } from "./locked-company-field";
import { LegalInformationFields } from "@/components/wizard/legal-information-fields";
import { LocationsField } from "@/components/wizard/locations-field";
import { LOCATION_TYPES } from "@/modules/shared/schema";
import { Step1ApplicationInformation } from "./steps/step1-application-information";
import { Step5SupportDocument } from "./steps/step5-support-document";
import { Step6ProductInformation } from "./steps/step6-product-information";
import { Step7Preview } from "./steps/step7-preview";
import { Step8Submit } from "./steps/step8-submit";
import { VkiStep3Legal } from "./steps/vki-step3-legal";
import { VkiStep4Tax } from "./steps/vki-step4-tax";
import { VkiStep5Locations } from "./steps/vki-step5-locations";
import { VkiStep6SupportDocument } from "./steps/vki-step6-support-document";
import { VkiStep7DataMesin } from "./steps/vki-step7-data-mesin";
import { VkiStep8Product } from "./steps/vki-step8-product";
import { VkiStep9Capacity } from "./steps/vki-step9-capacity";
import { VkiStep10ProductionQty } from "./steps/vki-step10-production-qty";
import { VkiStep11RawMaterialUsage } from "./steps/vki-step11-raw-material-usage";
import { VkiStep12Sales } from "./steps/vki-step12-sales";
import { VkiStep13Preview } from "./steps/vki-step13-preview";
import { VkiStep14Submit } from "./steps/vki-step14-submit";
import type { ApplicationWizardValues, VerificationType } from "../schema";

type SubmitReceipt = {
  applicationNumber: string;
};

const REQUIRED_API_TYPE: Record<VerificationType, string> = {
  VKI: "API-P",
  VIU: "API-U",
};

type Props = {
  lockedVerificationType?: VerificationType;
  /** Company-workspace entry point: applicant is the company, so it's locked in, not picked. */
  hideCompanyPicker?: boolean;
  /** Where the back arrow returns to — differs between the admin and company-workspace entry points. */
  backHref?: string;
  /** Continuing an existing Application(DRAFT) row from the company-workspace Application List. */
  resumeDraftId?: string;
};

export function ApplicationWizard({
  lockedVerificationType,
  hideCompanyPicker,
  backHref = "/applications",
  resumeDraftId,
}: Props) {
  const router = useRouter();
  const {
    form,
    currentStep,
    goNext,
    goBack,
    goToStep,
    restoreStep,
    activeSteps,
    activeFieldNames,
    isVki,
    isLastImplementedStep,
  } = useApplicationWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [receipt, setReceipt] = useState<SubmitReceipt | null>(null);
  const hasLoadedDraft = useRef(false);
  // Company-workspace drafts are real Application(DRAFT) rows (so they show up
  // in Application List) rather than the admin's per-user ApplicationDraft
  // singleton — this tracks the row so repeat saves (and the final submit)
  // update it in place instead of creating duplicates.
  const [companyDraftApplicationId, setCompanyDraftApplicationId] = useState<string | null>(null);

  useEffect(() => {
    if (hideCompanyPicker) return;
    if (hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;
    (async () => {
      const response = await fetch("/api/applications/drafts");
      if (!response.ok) return;
      const { data } = (await response.json()) as {
        data: { payload: Partial<ApplicationWizardValues>; currentStep: number } | null;
      };
      if (!data) return;
      form.reset(data.payload as ApplicationWizardValues);
      restoreStep(data.currentStep);
      toast.info("Draft tersimpan ditemukan, melanjutkan pengisian.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!resumeDraftId || hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;
    (async () => {
      const response = await fetch(`/api/company-workspace/applications/${resumeDraftId}`);
      if (!response.ok) {
        toast.error("Draft tidak ditemukan, atau bukan milik perusahaan Anda.");
        return;
      }
      const { data } = (await response.json()) as {
        data: { status: string; payload: ApplicationWizardValues };
      };
      if (data.status !== "DRAFT") {
        toast.error("Permohonan ini sudah tidak berstatus draft.");
        return;
      }
      form.reset(data.payload);
      setCompanyDraftApplicationId(resumeDraftId);
      toast.info("Melanjutkan draft tersimpan.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeDraftId]);

  const verificationType = form.watch("verificationType");
  const companyId = form.watch("companyId");
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
        body: JSON.stringify({ ...values, draftApplicationId: companyDraftApplicationId ?? undefined }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal mengirim permohonan");
      }
      const data = (await response.json()) as { applicationNumber: string };
      await fetch("/api/applications/drafts", { method: "DELETE" });
      setCompanyDraftApplicationId(null);
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

  function handleInvalidSubmit(errors: FieldErrors<ApplicationWizardValues>) {
    const invalidFields = new Set(Object.keys(errors));
    const firstInvalidStep = activeSteps.find((meta) =>
      (activeFieldNames[meta.step] ?? []).some((field) => invalidFields.has(field)),
    );

    if (firstInvalidStep) {
      goToStep(firstInvalidStep.step);
      toast.error(
        `Step ${firstInvalidStep.step} (${firstInvalidStep.title}) belum lengkap atau tidak valid. Silakan periksa kembali.`,
      );
      return;
    }

    toast.error("Ada data yang belum lengkap atau tidak valid. Periksa kembali step sebelumnya.");
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      if (hideCompanyPicker) {
        const response = await fetch("/api/company-workspace/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: companyDraftApplicationId ?? undefined,
            payload: form.getValues(),
          }),
        });
        if (!response.ok) throw new Error("Gagal menyimpan draft");
        const { id } = (await response.json()) as { id: string; applicationNumber: string };
        setCompanyDraftApplicationId(id);
      } else {
        const response = await fetch("/api/applications/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: form.getValues(), currentStep }),
        });
        if (!response.ok) throw new Error("Gagal menyimpan draft");
      }
      toast.success("Draft berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan draft");
    } finally {
      setIsSavingDraft(false);
    }
  }

  // VKI's last step (13, Submit) is a self-contained screen with its own
  // "Submit Permohonan" button + confirm modal — no Kembali/Lanjut footer.
  const showFooter = !(isVki && isLastImplementedStep);

  if (receipt) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-[#fbeee5] p-7 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#e2f7ea]">
          <CheckCircle2 className="size-9 text-[#1a7a4c]" />
        </div>
        <h1 className="text-[20px] font-extrabold text-[#20180f]">Permohonan Berhasil Disubmit</h1>
        <p className="text-[13px] text-[#8a7565]">Nomor aplikasi Anda:</p>
        <p className="rounded-lg border border-[#f0ded0] bg-white px-5 py-2.5 font-mono text-[13px] font-bold text-[#261813]">
          {receipt.applicationNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-240">
        <div className="mb-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="text-[20px] text-[#a68f80]"
          >
            ←
          </button>
          <div className="text-[20px] font-extrabold text-[#2b2420]">
            Create New Application
            {lockedVerificationType && (
              <span className="ml-2 rounded-full bg-[#fdeadd] px-2.5 py-1 align-middle text-[11px] font-bold text-[#c14a1f]">
                {lockedVerificationType}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-[14px] border border-[#f0ded0] bg-white">
          <div className="px-6.5 pt-5.5">
            <div className="mb-5 flex items-center">
              {activeSteps.map((meta, index) => {
                const step = meta.step;
                const isActive = step === currentStep;
                // A step only counts as "done" once visited AND its own fields are
                // currently error-free — `formState.errors` is only populated after
                // a trigger/submit, so pre-submit every visited step still reads as
                // done (unchanged behavior); after a failed final submit, steps with
                // unfilled required data stop showing a false checkmark.
                const hasStepError = (activeFieldNames[step] ?? []).some((field) => Boolean(form.formState.errors[field]));
                const isVisited = step < currentStep;
                const isDone = isVisited && !hasStepError;
                const isInvalid = isVisited && hasStepError;
                const circleColor = isInvalid ? "#c1361f" : isActive || isDone ? "#e0662e" : "#e8dccd";
                return (
                  <div key={meta.title} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      <div className="h-0.5 flex-1" style={{ background: index === 0 ? "transparent" : circleColor }} />
                      <button
                        type="button"
                        onClick={() => goToStep(step)}
                        aria-label={`Ke step ${step}: ${meta.title}${isInvalid ? " (belum lengkap)" : ""}`}
                        className="flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-[12px] font-bold"
                        style={{
                          borderColor: circleColor,
                          background: isDone ? "#e0662e" : isInvalid ? "#fbe4de" : "#fff",
                          color: isDone ? "#fff" : isInvalid ? "#c1361f" : isActive ? "#e0662e" : "#a68f80",
                        }}
                      >
                        {isDone ? "✓" : isInvalid ? "!" : step}
                      </button>
                      <div
                        className="h-0.5 flex-1"
                        style={{ background: index === activeSteps.length - 1 ? "transparent" : "#e8dccd" }}
                      />
                    </div>
                    <div
                      className="mt-1.5 text-center text-[10.5px] font-semibold"
                      style={{ color: isInvalid ? "#c1361f" : isActive ? "#c14a1f" : "#a68f80" }}
                    >
                      {meta.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmitApplication, handleInvalidSubmit)} className="flex flex-col">
            <div className="px-6.5 pb-6.5 pt-5">
              {currentStep === 1 && (
                <div className="flex flex-col gap-8">
                  {hideCompanyPicker ? (
                    <LockedCompanyField form={form} />
                  ) : (
                    <CompanyPickerField
                      form={form}
                      restrictApiType={lockedVerificationType ? REQUIRED_API_TYPE[lockedVerificationType] : undefined}
                    />
                  )}
                  <CompanyProfileFields form={form} readOnly={Boolean(companyId)} />
                </div>
              )}
              {currentStep === 2 && <Step1ApplicationInformation form={form} />}

              {!isVki && currentStep === 3 && <LegalInformationFields form={form} />}
              {!isVki && currentStep === 4 && (
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
              {!isVki && currentStep === 5 && <Step5SupportDocument form={form} />}
              {!isVki && currentStep === 6 && <Step6ProductInformation form={form} />}
              {!isVki && currentStep === 7 && <Step7Preview form={form} onEditStep={goToStep} />}
              {!isVki && currentStep === 8 && <Step8Submit form={form} />}

              {isVki && currentStep === 3 && <VkiStep3Legal form={form} />}
              {isVki && currentStep === 4 && <VkiStep4Tax form={form} />}
              {isVki && currentStep === 5 && <VkiStep5Locations form={form} />}
              {isVki && currentStep === 6 && <VkiStep6SupportDocument form={form} />}
              {isVki && currentStep === 7 && <VkiStep7DataMesin form={form} />}
              {isVki && currentStep === 8 && <VkiStep8Product form={form} />}
              {isVki && currentStep === 9 && <VkiStep9Capacity form={form} />}
              {isVki && currentStep === 10 && <VkiStep10ProductionQty form={form} />}
              {isVki && currentStep === 11 && <VkiStep11RawMaterialUsage form={form} />}
              {isVki && currentStep === 12 && <VkiStep12Sales form={form} />}
              {isVki && currentStep === 13 && <VkiStep13Preview form={form} onEditStep={goToStep} />}
              {isVki && currentStep === 14 && (
                <VkiStep14Submit
                  isSubmitting={isSubmitting}
                  onConfirmSubmit={() => form.handleSubmit(handleSubmitApplication, handleInvalidSubmit)()}
                />
              )}
            </div>

            {showFooter && (
              <div className="flex justify-between gap-2.5 border-t border-[#f0ded0] px-6.5 py-4">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 1 || isSubmitting}
                  className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-40"
                >
                  Kembali
                </button>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#594138] disabled:opacity-60"
                  >
                    {isSavingDraft ? "Menyimpan..." : "Save as Draft"}
                  </button>
                  {isLastImplementedStep ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                    >
                      {isSubmitting ? "Mengirim..." : "Submit Application"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white"
                    >
                      Lanjut
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
