"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { useApplicationWizard } from "../hooks/use-application-wizard";
import { EDIT_REASON_MIN_LENGTH, getAdminEditBlockReason, isActiveAssignmentStatus } from "../edit-rules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyProfileFields } from "@/components/wizard/company-profile-fields";
import { CompanyPickerField } from "./company-picker-field";
import { LockedCompanyField } from "./locked-company-field";
import type { CompanyAddressValues } from "@/components/wizard/locations-field";
import { LOCATION_TYPES } from "@/modules/shared/schema";
import { Step1ApplicationInformation } from "./steps/step1-application-information";
import { StepBrandsUsed } from "../viu-schemes/konsumsi/components/step-brands-used/step-brands-used";
import { StepQualityTest } from "../viu-schemes/konsumsi/components/step-quality-test";
import { KonsumsiProductInformation } from "../viu-schemes/konsumsi/components/product-information/konsumsi-product-information";
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
import { getViuWizardSteps, VKI_WIZARD_STEPS } from "../wizard-steps-meta";

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
  /** Continuing an existing Application(DRAFT) row from the Application List (admin or company-workspace). */
  resumeDraftId?: string;
  /** Admin "Edit Permohonan" (/applications/[id]/edit): loads an application in any status but
   * COMPLETED/REJECTED/WITHDRAWN and saves it in place via PUT /api/applications/[id] — status,
   * number and submission date unchanged; no Save as Draft. */
  adminEditApplicationId?: string;
};

type AdminEditState = {
  status: string;
  applicationNumber: string;
  activeAssignmentCount: number;
  blockReason: string | null;
};

export function ApplicationWizard({
  lockedVerificationType,
  hideCompanyPicker,
  backHref = "/applications",
  resumeDraftId,
  adminEditApplicationId,
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
  // Steps from "Partner Industri" onward shift their number whenever it's
  // filtered out of activeSteps (see getViuWizardSteps) — look its current
  // number up by stable key instead of hardcoding it, same as everywhere
  // else keyed off a step's identity rather than its position.
  const stepNumberByKey = useMemo(
    () => Object.fromEntries(activeSteps.map((s) => [s.key, s.step])) as Record<string, number | undefined>,
    [activeSteps],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [receipt, setReceipt] = useState<SubmitReceipt | null>(null);
  const hasLoadedDraft = useRef(false);
  // "Save as Draft" upserts a real Application(DRAFT) row (both admin and
  // company-workspace entry points) so it shows up in Application List —
  // this tracks the row so repeat saves (and the final submit) update it in
  // place instead of creating duplicates.
  const [draftApplicationId, setDraftApplicationId] = useState<string | null>(null);
  // Display-only, for Step "Merek yang Digunakan"'s "+ Tambah Merek Baru"
  // context banner — never sent anywhere, just lets the user see which
  // application they're attaching the new Brand to.
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);
  // Every invalid step at once, not just the first — set on a failed final
  // submit, cleared on a successful one or the user dismissing it. Lets the
  // user see everything that needs fixing across the whole wizard instead of
  // discovering one step at a time on repeated submit attempts.
  const [validationIssues, setValidationIssues] = useState<StepValidationIssue[]>([]);
  const isAdminEdit = Boolean(adminEditApplicationId);
  const [adminEdit, setAdminEdit] = useState<AdminEditState | null>(null);
  const [pendingEditValues, setPendingEditValues] = useState<ApplicationWizardValues | null>(null);
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    if (!adminEditApplicationId || hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;
    (async () => {
      const response = await fetch(`/api/applications/${adminEditApplicationId}`);
      if (!response.ok) {
        toast.error("Permohonan tidak ditemukan, atau tidak dapat diakses.");
        return;
      }
      const { data } = (await response.json()) as {
        data: {
          status: string;
          applicationNumber: string;
          payload: ApplicationWizardValues;
          assignments: { status: string }[];
        };
      };
      const blockReason = getAdminEditBlockReason(data.status);
      setAdminEdit({
        status: data.status,
        applicationNumber: data.applicationNumber,
        activeAssignmentCount: data.assignments.filter((a) => isActiveAssignmentStatus(a.status)).length,
        blockReason,
      });
      setApplicationNumber(data.applicationNumber);
      if (!blockReason) form.reset(data.payload);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminEditApplicationId]);

  async function saveAdminEdit() {
    if (!adminEditApplicationId || !pendingEditValues) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/applications/${adminEditApplicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: pendingEditValues, reason: editReason.trim() }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; data?: { changedCount: number } } | null;
      if (!response.ok) throw new Error(body?.error ?? "Gagal menyimpan perubahan");
      toast.success(`Perubahan disimpan (${body?.data?.changedCount ?? 0} data diubah).`);
      setPendingEditValues(null);
      router.push(`/applications/${adminEditApplicationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Final form submit — a real submit normally, the "Alasan perubahan" dialog in Admin edit. */
  function handleValidSubmit(values: ApplicationWizardValues) {
    if (isAdminEdit) {
      setEditReason("");
      setPendingEditValues(values);
      return;
    }
    return handleSubmitApplication(values);
  }

  useEffect(() => {
    if (!resumeDraftId || hasLoadedDraft.current) return;
    hasLoadedDraft.current = true;
    (async () => {
      const resumeUrl = hideCompanyPicker
        ? `/api/company-workspace/applications/${resumeDraftId}`
        : `/api/applications/${resumeDraftId}`;
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        toast.error("Draft tidak ditemukan, atau tidak dapat diakses.");
        return;
      }
      const { data } = (await response.json()) as {
        data: {
          status: string;
          payload: ApplicationWizardValues & { _meta?: { currentStepKey?: string } };
        };
      };
      if (data.status !== "DRAFT" && data.status !== "RETURNED") {
        toast.error("Permohonan ini tidak dapat diedit lagi.");
        return;
      }
      form.reset(data.payload);
      setDraftApplicationId(resumeDraftId);
      // Resolve the saved step by its stable key against the step list the
      // RESUMED payload's own verificationType/importTypes produce — not
      // this component's own `activeSteps`, which still reflects whatever
      // was on screen before `form.reset` above and hasn't re-rendered yet
      // in this same effect tick. Falls back to step 1 when there's no
      // saved key (legacy drafts, saved before this feature existed) or
      // when the saved step no longer exists (e.g. its scheme was
      // deselected before this save) — never crashes, never guesses.
      const savedKey = data.payload._meta?.currentStepKey;
      if (savedKey) {
        const resumedSteps =
          data.payload.verificationType === "VKI" ? VKI_WIZARD_STEPS : getViuWizardSteps(data.payload.importTypes ?? []);
        const target = resumedSteps.find((s) => s.key === savedKey)?.step;
        if (target) restoreStep(target);
      }
      toast.info(data.status === "RETURNED" ? "Memuat permohonan untuk direvisi." : "Melanjutkan draft tersimpan.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeDraftId]);

  const verificationType = form.watch("verificationType");
  const companyId = form.watch("companyId");
  // "Ubah di profil perusahaan" on Step 5's location cards — the company's own profile page in
  // Company Workspace, the admin Company detail otherwise.
  const companyProfileHref = hideCompanyPicker ? "/company-workspace/profile" : companyId ? `/company/${companyId}` : undefined;
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
        body: JSON.stringify({ ...values, draftApplicationId: draftApplicationId ?? undefined }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal mengirim permohonan");
      }
      const data = (await response.json()) as { applicationNumber: string };
      setDraftApplicationId(null);
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
    const moved = await goNext();
    if (moved !== false) {
      setValidationIssues([]);
      return;
    }
    // goNext() refused to move (a gated step failed validation). Never fail silently: say which
    // step and what is wrong — including per-product messages for Konsumsi product rows, whose
    // table has no per-cell error slot of its own.
    const meta = activeSteps.find((step) => step.step === currentStep);
    if (!meta) return;
    const errorRecord = form.formState.errors as Record<string, unknown>;
    const fields = activeFieldNames[meta.key] ?? [];
    const messages: string[] = [];
    for (const field of fields) {
      const fieldErrors = errorRecord[field];
      if (field === "konsumsiProducts" && Array.isArray(fieldErrors)) {
        const products = form.getValues("konsumsiProducts") ?? [];
        fieldErrors.forEach((productError, index) => {
          if (!productError) return;
          const name = products[index]?.productName?.trim() || `Produk #${index + 1}`;
          const productMessages = [...new Set(collectErrorMessages(productError))];
          if (productMessages.length > 0) messages.push(`${name}: ${productMessages.join(", ")}`);
        });
        continue;
      }
      messages.push(...collectErrorMessages(fieldErrors));
    }
    const uniqueMessages = [...new Set(messages)];
    setValidationIssues([{ step: meta.step, title: meta.title, messages: uniqueMessages }]);
    toast.error(
      `Step ${meta.step} (${meta.title}) belum lengkap atau tidak valid${
        uniqueMessages.length > 0 ? `: ${uniqueMessages.slice(0, 3).join("; ")}${uniqueMessages.length > 3 ? " …" : ""}` : ""
      }`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleInvalidSubmit(errors: FieldErrors<ApplicationWizardValues>) {
    const errorRecord = errors as Record<string, unknown>;
    const invalidFields = new Set(Object.keys(errorRecord));
    const claimedFields = new Set<string>();

    // Every step with at least one invalid field of its own — not just the first — so the
    // summary panel below can show the user everything that needs fixing at once.
    const issues: StepValidationIssue[] = activeSteps
      .map((meta): StepValidationIssue | null => {
        const stepFields = (activeFieldNames[meta.key] ?? []).filter((field) => invalidFields.has(field));
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
      const draftUrl = hideCompanyPicker ? "/api/company-workspace/applications" : "/api/applications/draft";
      // Stable key, not the raw number — same reasoning as everywhere else
      // that looks steps up by `key` (see stepNumberByKey above): this
      // number can mean a different step next time the draft is resumed if
      // a scheme gets enabled/disabled in between. Stored inside the same
      // payload JSON (no schema/DB change) and stripped by
      // applicationSubmitSchema's "unknown keys" default on final submit,
      // so it never reaches a persisted SUBMITTED application.
      const currentStepKey = activeSteps[currentStep - 1]?.key;
      const response = await fetch(draftUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: draftApplicationId ?? undefined,
          payload: { ...form.getValues(), _meta: { currentStepKey } },
        }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan draft");
      const { id, applicationNumber: savedApplicationNumber } = (await response.json()) as {
        id: string;
        applicationNumber: string;
      };
      setDraftApplicationId(id);
      setApplicationNumber(savedApplicationNumber);
      toast.success("Draft berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan draft");
    } finally {
      setIsSavingDraft(false);
    }
  }

  // VKI's last step (13, Submit) is a self-contained screen with its own
  // "Submit Permohonan" button + confirm modal — no Kembali/Lanjut footer.
  const showFooter = isAdminEdit || !(isVki && isLastImplementedStep);

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
            {isAdminEdit ? `Edit Permohonan ${adminEdit?.applicationNumber ?? ""}` : "Create New Application"}
            {lockedVerificationType && (
              <span className="ml-2 rounded-full bg-[#fdeadd] px-2.5 py-1 align-middle text-[11px] font-bold text-[#c14a1f]">
                {lockedVerificationType}
              </span>
            )}
          </div>
        </div>

        {isAdminEdit && adminEdit && !adminEdit.blockReason && (
          <div className="mb-4 flex flex-col gap-2">
            <div className="rounded-lg border border-[#c9d8f5] bg-[#eef3fd] p-3.5 text-[12.5px] text-[#1f3f7a]">
              <strong>Mode Edit Admin</strong> — perubahan akan langsung diterapkan pada permohonan berstatus{" "}
              <strong>{adminEdit.status}</strong>. Status, nomor permohonan dan tanggal pengajuan tidak berubah; perusahaan
              pemohon dan jenis verifikasi tidak dapat diganti. Setiap penyimpanan wajib disertai alasan perubahan.
            </div>
            {adminEdit.activeAssignmentCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-[#f0c78a] bg-[#fdf0d5] p-3.5 text-[12.5px] text-[#7a4a10]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Permohonan ini memiliki <strong>{adminEdit.activeAssignmentCount} penugasan aktif</strong>. Data yang sedang
                  diverifikasi akan berubah, dan penugasan terkait akan diberi penanda &quot;Data permohonan diubah setelah
                  penugasan dibuat&quot;.
                </span>
              </div>
            )}
          </div>
        )}
        {isAdminEdit && adminEdit?.blockReason ? (
          <div className="rounded-[14px] border border-[#f0ded0] bg-white p-6.5 text-[13px] text-[#594138]">
            <p className="font-bold text-[#20180f]">Permohonan berstatus {adminEdit.status} — hanya dapat dilihat.</p>
            <p className="mt-1">{adminEdit.blockReason}</p>
            <button
              type="button"
              onClick={() => router.push(`/applications/${adminEditApplicationId}`)}
              className="mt-4 rounded-lg border border-[#e1bfb3] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#261813]"
            >
              Lihat Detail Permohonan
            </button>
          </div>
        ) : (
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
                const hasStepError = (activeFieldNames[meta.key] ?? []).some((field) => Boolean(form.formState.errors[field]));
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

          <form onSubmit={form.handleSubmit(handleValidSubmit, handleInvalidSubmit)} className="flex flex-col">
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
                  companyProfileHref={companyProfileHref}
                  applicationId={draftApplicationId ?? adminEditApplicationId ?? null}
                />
              )}
              {!isVki && currentStep === stepNumberByKey["brands-used"] && (
                <StepBrandsUsed
                  form={form}
                  apiBase={hideCompanyPicker ? "/api/company-workspace/brands" : "/api/merk"}
                  brandDetailHrefBase={
                    hideCompanyPicker ? "/company-workspace/supporting/brands" : "/mitra/merk"
                  }
                  applicationNumber={applicationNumber ?? undefined}
                />
              )}
              {!isVki && currentStep === stepNumberByKey["quality-test"] && <StepQualityTest form={form} />}
              {!isVki && currentStep === stepNumberByKey["partner-industri"] && (
                <StepPartnerIndustri
                  form={form}
                  partnerManagementHref={
                    hideCompanyPicker ? "/company-workspace/supporting/partners/new" : "/partners/new"
                  }
                />
              )}
              {!isVki && currentStep === stepNumberByKey["support-document"] && <Step5SupportDocument form={form} />}
              {!isVki && currentStep === stepNumberByKey["product-info"] && (
                <>
                  <Step6ProductInformation form={form} />
                  <KonsumsiProductInformation
                    form={form}
                    onNavigateToBrandsStep={() => {
                      const brandsStepNumber = stepNumberByKey["brands-used"];
                      if (brandsStepNumber) goToStep(brandsStepNumber);
                    }}
                  />
                </>
              )}
              {!isVki && currentStep === stepNumberByKey.preview && (
                <Step7Preview form={form} onEditStep={goToStep} stepNumberByKey={stepNumberByKey} />
              )}
              {!isVki && currentStep === stepNumberByKey.submit && <Step8Submit form={form} />}

              {isVki && currentStep === 3 && <VkiStep3Legal form={form} />}
              {isVki && currentStep === 4 && <VkiStep4Tax form={form} />}
              {isVki && currentStep === 5 && (
                <VkiStep5Locations
                  form={form}
                  companyAddress={companyAddress}
                  companyProfileHref={companyProfileHref}
                  applicationId={draftApplicationId ?? adminEditApplicationId ?? null}
                />
              )}
              {isVki && currentStep === 6 && <VkiStep6SupportDocument form={form} />}
              {isVki && currentStep === 7 && <VkiStep7DataMesin form={form} />}
              {isVki && currentStep === 8 && <VkiStep8Product form={form} />}
              {isVki && currentStep === 9 && <VkiStep9Capacity form={form} />}
              {isVki && currentStep === 10 && <VkiStep10ProductionQty form={form} />}
              {isVki && currentStep === 11 && <VkiStep11RawMaterialUsage form={form} />}
              {isVki && currentStep === 12 && <VkiStep12Sales form={form} />}
              {isVki && currentStep === 13 && <VkiStep13Preview form={form} onEditStep={goToStep} />}
              {isVki && currentStep === 14 && !isAdminEdit && (
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
                  {isAdminEdit ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg border border-[#e0662e] bg-white px-4.5 py-2.5 text-[13px] font-bold text-[#c14a1f] disabled:opacity-60"
                    >
                      Simpan Perubahan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft}
                      className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#594138] disabled:opacity-60"
                    >
                      {isSavingDraft ? "Menyimpan..." : "Save as Draft"}
                    </button>
                  )}
                  {isAdminEdit && isLastImplementedStep ? null : isLastImplementedStep ? (
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
        )}
      </div>

      <Dialog open={pendingEditValues !== null} onOpenChange={(open) => !open && !isSubmitting && setPendingEditValues(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Simpan Perubahan — {adminEdit?.applicationNumber}</DialogTitle>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">
              Alasan perubahan <span className="text-destructive">*</span>
            </span>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={4}
              placeholder="Mis. koreksi data sesuai surat permohonan perubahan dari perusahaan..."
              className="rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">
              Minimal {EDIT_REASON_MIN_LENGTH} karakter. Alasan ini dicatat di Riwayat Perubahan dan dikirim ke perusahaan.
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setPendingEditValues(null)}>
              Batal
            </Button>
            <Button type="button" disabled={isSubmitting || editReason.trim().length < EDIT_REASON_MIN_LENGTH} onClick={saveAdminEdit}>
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
