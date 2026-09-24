"use client";

import { useEffect, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, X } from "lucide-react";

import { useApplicationWizard } from "../hooks/use-application-wizard";
import { CompanyProfileFields } from "@/components/wizard/company-profile-fields";
import { CompanyPickerField } from "./company-picker-field";
import { LockedCompanyField } from "./locked-company-field";
import type { CompanyAddressValues } from "@/components/wizard/locations-field";
import { LOCATION_TYPES } from "@/modules/shared/schema";
import { Step1ApplicationInformation } from "./steps/step1-application-information";
import { StepBrandsUsed } from "./steps/step-brands-used/step-brands-used";
import { StepQualityTest } from "./steps/step-quality-test";
import { StepPartnerIndustri } from "./steps/step-partner-industri";
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

type StepValidationIssue = {
  step: number;
  title: string;
  messages: string[];
};

const REQUIRED_API_TYPE: Record<VerificationType, string> = {
  VKI: "API-P",
  VIU: "API-U",
};

/** Walks one field's RHF error node (a plain object for a scalar field, or a
 * nested object/array for a field-array like `locations`/`kbliEntries`) and
 * collects every concrete `.message` string it finds — this is what turns
 * "Step 3 (Legal Information) belum lengkap" into "...: Nomor NIB wajib
 * diisi" instead of leaving the user to guess which field. `seen` dedupes
 * the same message appearing on multiple array items (e.g. every location
 * missing "Jalan wajib diisi"). */
function collectErrorMessages(node: unknown, seen: Set<string> = new Set()): string[] {
  if (!node || typeof node !== "object") return [];
  const messages: string[] = [];
  const record = node as Record<string, unknown>;
  if (typeof record.message === "string" && !seen.has(record.message)) {
    seen.add(record.message);
    messages.push(record.message);
  }
  for (const key of Object.keys(record)) {
    if (key === "message" || key === "type" || key === "ref") continue;
    messages.push(...collectErrorMessages(record[key], seen));
  }
  return messages;
}

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
  // Display-only, for Step "Merek yang Digunakan"'s "+ Tambah Merek Baru"
  // context banner — never sent anywhere, just lets the user see which
  // application they're attaching the new Brand to.
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);
  // Every invalid step at once, not just the first — set on a failed final
  // submit, cleared on a successful one or the user dismissing it. Lets the
  // user see everything that needs fixing across the whole wizard instead of
  // discovering one step at a time on repeated submit attempts.
  const [validationIssues, setValidationIssues] = useState<StepValidationIssue[]>([]);

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
      if (data.status !== "DRAFT" && data.status !== "RETURNED") {
        toast.error("Permohonan ini tidak dapat diedit lagi.");
        return;
      }
      form.reset(data.payload);
      setCompanyDraftApplicationId(resumeDraftId);
      toast.info(data.status === "RETURNED" ? "Memuat permohonan untuk direvisi." : "Melanjutkan draft tersimpan.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeDraftId]);

  const verificationType = form.watch("verificationType");
  const companyId = form.watch("companyId");
  const locationAvailableTypes =
    verificationType === "VIU"
      ? LOCATION_TYPES.filter((type) => type !== "PABRIK")
      : LOCATION_TYPES;

  // Selected company's own address — not part of the wizard's own form fields, so it's
  // fetched directly for the "Sama dengan alamat perusahaan" checkbox on the Locations step.
  const { data: selectedCompany } = useQuery({
    queryKey: ["companies", companyId, "address"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error("Gagal memuat alamat perusahaan");
      const json = (await response.json()) as {
        data: {
          addressJalan: string | null;
          addressDesa: string | null;
          addressKecamatan: string | null;
          addressKota: string | null;
          addressProvinsi: string | null;
          addressKodePos: string | null;
        };
      };
      return json.data;
    },
    enabled: Boolean(companyId),
  });
  const companyAddress: CompanyAddressValues | undefined = selectedCompany
    ? {
        address: selectedCompany.addressJalan ?? "",
        addressDesa: selectedCompany.addressDesa ?? "",
        addressKecamatan: selectedCompany.addressKecamatan ?? "",
        city: selectedCompany.addressKota ?? "",
        province: selectedCompany.addressProvinsi ?? "",
        postalCode: selectedCompany.addressKodePos ?? "",
      }
    : undefined;

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
      setValidationIssues([]);
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
    const errorRecord = errors as Record<string, unknown>;
    const invalidFields = new Set(Object.keys(errorRecord));
    const claimedFields = new Set<string>();

    // Every step with at least one invalid field of its own — not just the first — so the
    // summary panel below can show the user everything that needs fixing at once.
    const issues: StepValidationIssue[] = activeSteps
      .map((meta): StepValidationIssue | null => {
        const stepFields = (activeFieldNames[meta.step] ?? []).filter((field) => invalidFields.has(field));
        if (stepFields.length === 0) return null;
        stepFields.forEach((field) => claimedFields.add(field));
        const messages = stepFields.flatMap((field) => collectErrorMessages(errorRecord[field]));
        return { step: meta.step, title: meta.title, messages };
      })
      .filter((issue): issue is StepValidationIssue => issue !== null);

    // Invalid fields no step's map claims (a mapping gap) — still surface them rather than
    // silently dropping the detail, grouped under a generic "Lainnya" bucket.
    const unclaimedFields = [...invalidFields].filter((field) => !claimedFields.has(field));
    if (unclaimedFields.length > 0) {
      const messages = unclaimedFields.flatMap((field) => collectErrorMessages(errorRecord[field]));
      issues.push({ step: 0, title: "Lainnya", messages });
    }

    setValidationIssues(issues);

    const firstIssue = issues.find((issue) => issue.step > 0) ?? issues[0];
    if (firstIssue && firstIssue.step > 0) goToStep(firstIssue.step);

    const totalMessages = issues.reduce((sum, issue) => sum + Math.max(issue.messages.length, 1), 0);
    toast.error(
      issues.length > 1
        ? `${issues.length} step belum lengkap atau tidak valid (${totalMessages} hal). Lihat rincian di bawah.`
        : firstIssue
          ? `Step ${firstIssue.step} (${firstIssue.title}) belum lengkap atau tidak valid${
              firstIssue.messages.length > 0 ? `: ${firstIssue.messages.slice(0, 4).join("; ")}` : ""
            }`
          : "Ada data yang belum lengkap atau tidak valid. Periksa kembali step sebelumnya.",
    );
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
        const { id, applicationNumber: savedApplicationNumber } = (await response.json()) as {
          id: string;
          applicationNumber: string;
        };
        setCompanyDraftApplicationId(id);
        setApplicationNumber(savedApplicationNumber);
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
            {validationIssues.length > 0 && (
              <div className="mx-6.5 mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-destructive">
                    {validationIssues.length} bagian belum lengkap atau tidak valid — perbaiki sebelum submit:
                  </p>
                  <button
                    type="button"
                    onClick={() => setValidationIssues([])}
                    aria-label="Tutup ringkasan validasi"
                    className="shrink-0 text-destructive/70 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {validationIssues.map((issue) => (
                    <li key={issue.step}>
                      {issue.step > 0 ? (
                        <button
                          type="button"
                          onClick={() => goToStep(issue.step)}
                          className="font-semibold text-destructive underline-offset-2 hover:underline"
                        >
                          Step {issue.step} ({issue.title})
                        </button>
                      ) : (
                        <span className="font-semibold text-destructive">{issue.title}</span>
                      )}
                      {issue.messages.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-destructive/90">
                          {issue.messages.map((message, index) => (
                            <li key={`${issue.step}-${index}`}>{message}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

              {!isVki && currentStep === 3 && <VkiStep3Legal form={form} />}
              {!isVki && currentStep === 4 && <VkiStep4Tax form={form} />}
              {!isVki && currentStep === 5 && (
                <VkiStep5Locations
                  form={form}
                  availableTypes={locationAvailableTypes}
                  typeHint="VIU hanya memerlukan informasi Kantor dan Gudang"
                  companyAddress={companyAddress}
                />
              )}
              {!isVki && currentStep === 6 && (
                <StepBrandsUsed
                  form={form}
                  apiBase={hideCompanyPicker ? "/api/company-workspace/brands" : "/api/merk"}
                  brandDetailHrefBase={
                    hideCompanyPicker ? "/company-workspace/supporting/brands" : "/mitra/merk"
                  }
                  applicationNumber={applicationNumber ?? undefined}
                />
              )}
              {!isVki && currentStep === 7 && <StepQualityTest form={form} />}
              {!isVki && currentStep === 8 && (
                <StepPartnerIndustri
                  form={form}
                  partnerManagementHref={
                    hideCompanyPicker ? "/company-workspace/supporting/partners/new" : "/partners/new"
                  }
                />
              )}
              {!isVki && currentStep === 9 && <Step5SupportDocument form={form} />}
              {!isVki && currentStep === 10 && <Step6ProductInformation form={form} />}
              {!isVki && currentStep === 11 && <Step7Preview form={form} onEditStep={goToStep} />}
              {!isVki && currentStep === 12 && <Step8Submit form={form} />}

              {isVki && currentStep === 3 && <VkiStep3Legal form={form} />}
              {isVki && currentStep === 4 && <VkiStep4Tax form={form} />}
              {isVki && currentStep === 5 && <VkiStep5Locations form={form} companyAddress={companyAddress} />}
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
