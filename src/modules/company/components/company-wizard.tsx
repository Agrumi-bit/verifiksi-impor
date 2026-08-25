"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { LocationsField } from "@/components/wizard/locations-field";
import { useCompanyWizard } from "../hooks/use-company-wizard";
import { Step1DataPerusahaan } from "./steps/step1-data-perusahaan";
import { Step2Pic } from "./steps/step2-pic";
import { Step3Legal } from "./steps/step3-legal";
import { Step4Pajak } from "./steps/step4-pajak";
import { Step6Review } from "./steps/step6-review";
import type { CompanyWizardValues } from "../schema";

const STEP_LABELS = ["Data Perusahaan", "PIC", "Legal", "Pajak", "Lokasi", "Review"];

export function CompanyWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDraftId = searchParams.get("draftId");
  const { form, currentStep, goNext, goBack, goToStep, isLastStep } = useCompanyWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const hasLoadedDraft = useRef(false);

  useEffect(() => {
    if (hasLoadedDraft.current || !initialDraftId) return;
    hasLoadedDraft.current = true;
    (async () => {
      const response = await fetch(`/api/companies/drafts/${initialDraftId}`);
      if (!response.ok) {
        toast.error("Draft tidak ditemukan.");
        return;
      }
      const { data } = (await response.json()) as {
        data: { payload: Partial<CompanyWizardValues>; currentStep: number };
      };
      form.reset(data.payload as CompanyWizardValues);
      goToStep(data.currentStep);
      toast.info("Melanjutkan draft tersimpan.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraftId]);

  async function submitCompany(values: CompanyWizardValues) {
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
      if (draftId) await fetch(`/api/companies/drafts/${draftId}`, { method: "DELETE" });
      toast.success(`Perusahaan "${data.companyName}" berhasil ditambahkan.`);
      router.push(`/company/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perusahaan");
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  }

  async function handleNext() {
    await goNext();
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      const response = await fetch(draftId ? `/api/companies/drafts/${draftId}` : "/api/companies/drafts", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: form.getValues(), currentStep }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan draft");
      if (!draftId) {
        const { data } = (await response.json()) as { data: { id: string } };
        setDraftId(data.id);
        router.replace(`/company/new?draftId=${data.id}`);
      }
      toast.success("Draft berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan draft");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleOpenConfirm() {
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("Lengkapi data yang wajib diisi sebelum submit.");
      return;
    }
    setShowConfirm(true);
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-5 flex items-center gap-2.5">
          <button type="button" onClick={() => router.push("/company")} className="text-[20px] text-[#a68f80]">
            ←
          </button>
          <div className="text-[20px] font-extrabold text-[#2b2420]">Tambah Perusahaan</div>
        </div>

        <div className="flex flex-col rounded-[14px] border border-[#f0ded0] bg-white">
          <div className="px-6.5 pt-5.5">
            <div className="mb-5 flex items-center">
              {STEP_LABELS.map((label, index) => {
                const step = index + 1;
                const isActive = step === currentStep;
                const isDone = step < currentStep;
                const circleColor = isActive || isDone ? "#e0662e" : "#e8dccd";
                return (
                  <div key={label} className="flex flex-1 flex-col items-center">
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
                        style={{ background: index === STEP_LABELS.length - 1 ? "transparent" : "#e8dccd" }}
                      />
                    </div>
                    <div
                      className="mt-1.5 text-center text-[10.5px] font-semibold"
                      style={{ color: isActive ? "#c14a1f" : "#a68f80" }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="px-6.5 pb-6.5 pt-5">
              {currentStep === 1 && <Step1DataPerusahaan form={form} />}
              {currentStep === 2 && <Step2Pic form={form} />}
              {currentStep === 3 && <Step3Legal form={form} />}
              {currentStep === 4 && <Step4Pajak form={form} />}
              {currentStep === 5 && (
                <LocationsField
                  form={form}
                  companyAddress={{
                    address: form.watch("addressJalan"),
                    addressDesa: form.watch("addressDesa"),
                    addressKecamatan: form.watch("addressKecamatan"),
                    city: form.watch("addressKota"),
                    province: form.watch("addressProvinsi"),
                    postalCode: form.watch("addressKodePos"),
                  }}
                />
              )}
              {currentStep === 6 && <Step6Review form={form} onEditStep={goToStep} />}
            </div>

            <div className="flex justify-between gap-2.5 border-t border-[#f0ded0] px-6.5 py-4">
              <button
                type="button"
                onClick={goBack}
                disabled={currentStep === 1}
                className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-40"
              >
                Kembali
              </button>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={isSavingDraft}
                  onClick={handleSaveDraft}
                  className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#594138] disabled:opacity-60"
                >
                  {isSavingDraft ? "Menyimpan..." : "Save as Draft"}
                </button>
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white"
                  >
                    Lanjut
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenConfirm}
                    className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(43,36,32,.45)" }}>
          <div className="w-[420px] max-w-[92vw] rounded-2xl bg-white p-7 text-center">
            <div className="mx-auto mb-4 flex size-13 items-center justify-center rounded-full bg-[#fdeadd] text-[26px] text-[#e0662e]">
              ?
            </div>
            <div className="text-[16px] font-extrabold text-[#20180f]">Kirim Data Perusahaan?</div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#8a7565]">
              Pastikan seluruh data pada tahap Data Perusahaan, PIC, Legal, dan Pajak sudah benar. Data yang telah
              dikirim akan masuk ke proses verifikasi dan tidak dapat diubah sembarangan.
            </p>
            <div className="mt-5.5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813]"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => form.handleSubmit(submitCompany)()}
                className="flex-1 rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {isSubmitting ? "Mengirim..." : "Ya, Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
