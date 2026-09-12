"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useActiveBrandOwners } from "@/modules/master-data/use-active-brand-owners";
import type { MerkSurface } from "@/modules/merk/surface";
import { getRequiredBrandDocuments } from "../document-requirements";
import { mapMerkDetailToWizardValues, type MerkDetailForResume } from "../map-merk-detail-to-wizard-values";
import {
  merkWizardSchema,
  MERK_STEP_FIELD_NAMES,
  MERK_TRADEMARK_CLASSES,
  type MerkWizardValues,
} from "../schema";
import { Step1BrandInfo } from "./steps/step1-brand-info";
import { Step2OwnershipRepresentation } from "./steps/step2-ownership-representation";
import { Step3DokumenPendukung } from "./steps/step3-dokumen-pendukung";
import { Step4BrandReview } from "./steps/step4-review";
import { isRequirementComplete } from "./steps/step3/document-completeness-summary";
import type { ExistingBrandMatch } from "./steps/step4/duplicate-check-summary";

const STEP_TITLES = ["Informasi Merek", "Kepemilikan & Perwakilan", "Dokumen Pendukung", "Review"];
const TOTAL_STEPS = STEP_TITLES.length;

const DEFAULT_VALUES: Partial<MerkWizardValues> = {
  brandName: "",
  countryOfOrigin: "",
  registrationNumber: "",
  registrationDate: "",
  trademarkClass: "",
  merekStatusLabel: "",
  logoPath: "",
  documents: {},
  productLabelDocumentation: [],
  qualityTests: [],
  declarationAccepted: false,
};

// Step 2's own field list bundles ownership + representation together; these
// two subsets exist only so the readiness checklist can report on them as
// the two separate lines the spec asks for ("Data kepemilikan lengkap" /
// "Hubungan perwakilan lengkap") without a second source of truth for what
// "valid" means — both still resolve to the same MERK_STEP_FIELD_NAMES[2]
// entries validated by validateOwnershipStep.
const OWNERSHIP_CORE_FIELDS = [
  "ownerLocation",
  "ownerType",
  "ownerCompanyId",
  "ownerName",
  "ownerAddress",
  "foreignEntityType",
  "ownerCountryCode",
  "foreignRegistrationNumber",
] as const;
const REPRESENTATION_FIELDS = [
  "relationshipWithApiu",
  "representationType",
  "officialRepresentativeCompanyId",
  "agreementType",
  "agreementNumber",
  "agreementStartDate",
  "agreementEndDate",
  "appointmentSource",
  "appointmentLetterNumber",
  "appointmentStartDate",
  "appointmentEndDate",
] as const;

const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

type Props = {
  surface: MerkSurface;
  /** When opened inline from the Brands list (drawer over the same page)
   * instead of a direct route navigation to `/new`. */
  onClose?: () => void;
  /** Set when resuming a previously "Simpan Draft"-ed brand — the wizard
   * loads that record's data instead of starting blank, and Save
   * Draft/submit PATCH the existing row instead of creating a new one. See
   * BR-002 in the Add Brand review. */
  draftId?: string;
};

export function MerkWizard({ surface, onClose, draftId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isDuplicateAcknowledged, setIsDuplicateAcknowledged] = useState(false);

  const form = useForm<MerkWizardValues>({
    resolver: zodResolver(merkWizardSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_VALUES,
  });
  const { control, formState } = form;

  // Resume a saved Draft: fetch its full record and reset the form to it
  // once loaded. `isDirty` intentionally resets alongside (fresh baseline —
  // reopening a draft you haven't touched yet isn't an unsaved change).
  const { data: draftDetail } = useQuery({
    queryKey: ["merk-surface", surface.apiBase, draftId],
    queryFn: async () => {
      const response = await fetch(`${surface.apiBase}/${draftId}`);
      if (!response.ok) throw new Error("Gagal memuat draft merek");
      const json = (await response.json()) as { data: MerkDetailForResume };
      return json.data;
    },
    enabled: Boolean(draftId),
  });
  useEffect(() => {
    if (draftDetail) form.reset(mapMerkDetailToWizardValues(draftDetail));
    // form is a stable ref from useForm; only a newly-loaded draft should
    // trigger a reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftDetail]);

  const brandName = useWatch({ control, name: "brandName" });
  const countryOfOrigin = useWatch({ control, name: "countryOfOrigin" });
  const trademarkClass = useWatch({ control, name: "trademarkClass" });
  const evidenceType = useWatch({ control, name: "evidenceType" });
  const ownerLocation = useWatch({ control, name: "ownerLocation" });
  const ownerType = useWatch({ control, name: "ownerType" });
  const ownerCompanyId = useWatch({ control, name: "ownerCompanyId" });
  const ownerName = useWatch({ control, name: "ownerName" });
  const relationshipWithApiu = useWatch({ control, name: "relationshipWithApiu" });
  const representationType = useWatch({ control, name: "representationType" });
  const officialRepresentativeCompanyId = useWatch({ control, name: "officialRepresentativeCompanyId" });
  const appointmentSource = useWatch({ control, name: "appointmentSource" });
  const agreementType = useWatch({ control, name: "agreementType" });
  const documents = useWatch({ control, name: "documents" }) ?? {};
  const productLabelDocumentation = useWatch({ control, name: "productLabelDocumentation" }) ?? [];
  const qualityTests = useWatch({ control, name: "qualityTests" }) ?? [];
  const declarationAccepted = useWatch({ control, name: "declarationAccepted" });

  const { options: countryOptions } = useActiveCountries();
  const { options: brandOwnerOptions } = useActiveBrandOwners();

  const { data: existingBrands } = useQuery({
    queryKey: ["merk-surface", surface.apiBase],
    queryFn: async () => {
      const response = await fetch(surface.apiBase);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: ExistingBrandMatch[] };
      return json.data;
    },
  });
  const duplicate = (existingBrands ?? []).find(
    (b) => b.brandName.trim().toLowerCase() === brandName?.trim().toLowerCase(),
  );

  // Required-document completeness — same rule engine Step 3 uses to gate
  // its own upload cards, reused here for the checklist and the top summary.
  const documentRequirements = getRequiredBrandDocuments({
    evidenceType,
    ownerLocation,
    relationshipWithApiu,
    representationType,
    appointmentSource,
    agreementType,
  });
  const requiredDocuments = documentRequirements.filter((r) => r.required);
  const missingRequiredDocuments = requiredDocuments.filter(
    (r) => !isRequirementComplete(r, documents, productLabelDocumentation),
  );
  const isDocumentsComplete = missingRequiredDocuments.length === 0;

  const step1HasErrors = MERK_STEP_FIELD_NAMES[1].some((field) => Boolean(formState.errors[field]));
  const isStep1Complete = !step1HasErrors && Boolean(brandName?.trim());
  const ownershipHasErrors = OWNERSHIP_CORE_FIELDS.some((field) => Boolean(formState.errors[field]));
  const representationHasErrors = REPRESENTATION_FIELDS.some((field) => Boolean(formState.errors[field]));
  const isOwnershipComplete = Boolean(ownerLocation) && !ownershipHasErrors;
  const isRepresentationComplete = Boolean(ownerLocation) && !representationHasErrors;
  const isDuplicateResolved = !duplicate || isDuplicateAcknowledged;

  const isReviewReady =
    isStep1Complete &&
    isOwnershipComplete &&
    isRepresentationComplete &&
    isDocumentsComplete &&
    isDuplicateResolved &&
    declarationAccepted === true;

  // Display-only derivations for the top summary / relationship rows —
  // duplicated in spirit from OwnershipRepresentationReview/
  // BrandRelationshipSummary (same source data, different components); kept
  // separate since these three only need short one-off strings, not shared
  // state.
  const ownerCompanyName = brandOwnerOptions.find((o) => o.value === ownerCompanyId)?.label;
  const representativeName = brandOwnerOptions.find((o) => o.value === officialRepresentativeCompanyId)?.label;
  const countryLabel = countryOptions.find((o) => o.value === countryOfOrigin)?.label ?? countryOfOrigin;
  const classInfo = MERK_TRADEMARK_CLASSES.find((c) => c.value === trademarkClass);
  const ownerTitle =
    ownerLocation === "domestic" ? (ownerType === "company" ? ownerCompanyName : ownerName) : ownerName;
  const representativeTitle =
    ownerLocation === "foreign"
      ? representationType === "apiu_official_representative"
        ? APIU_PLACEHOLDER_NAME
        : representationType === "other_official_representative"
          ? representativeName
          : appointmentSource === "official_representative"
            ? representativeName
            : undefined
      : undefined;
  const importerTitle = ownerLocation ? APIU_PLACEHOLDER_NAME : undefined;

  const checklist = [
    { key: "step1", label: "Informasi merek lengkap", ok: isStep1Complete, step: 1, issueLabel: "Informasi merek belum lengkap." },
    { key: "ownership", label: "Data kepemilikan lengkap", ok: isOwnershipComplete, step: 2, issueLabel: "Data kepemilikan belum lengkap." },
    { key: "representation", label: "Hubungan perwakilan lengkap", ok: isRepresentationComplete, step: 2, issueLabel: "Hubungan perwakilan belum lengkap." },
    {
      key: "documents",
      label: "Dokumen wajib lengkap",
      ok: isDocumentsComplete,
      step: 3,
      issueLabel:
        missingRequiredDocuments.length > 0
          ? `${missingRequiredDocuments[0].label} belum diunggah.`
          : undefined,
    },
    {
      key: "duplicate",
      label: "Tidak ada konflik duplikasi",
      ok: isDuplicateResolved,
      step: 1,
      issueLabel: "Konflik duplikasi merek belum diselesaikan.",
    },
    // No global "upload in progress" tracker exists across upload cards —
    // every value that reaches form state is already a completed upload, so
    // this is structurally always true. See the Step 4 report.
    { key: "uploads", label: "Semua upload selesai", ok: true },
  ];

  const representationDocsRequired = documentRequirements.some(
    (r) => r.category === "representation" || r.category === "official_representative_legal" || r.category === "import_authorization",
  );
  const isTrademarkDocComplete = !documentRequirements
    .filter((r) => r.category === "trademark" && r.required)
    .some((r) => !isRequirementComplete(r, documents, productLabelDocumentation));
  const isRepresentationDocsComplete = !documentRequirements
    .filter(
      (r) =>
        (r.category === "representation" || r.category === "official_representative_legal" || r.category === "import_authorization") &&
        r.required,
    )
    .some((r) => !isRequirementComplete(r, documents, productLabelDocumentation));
  const isLabelDocsComplete = !documentRequirements
    .filter((r) => r.category === "product_compliance" && r.required)
    .some((r) => !isRequirementComplete(r, documents, productLabelDocumentation));

  const completionRows = [
    { label: "Informasi Merek", complete: isStep1Complete },
    { label: "Kepemilikan & Perwakilan", complete: isOwnershipComplete && isRepresentationComplete },
    { label: "Dokumen Merek", complete: isTrademarkDocComplete },
    ...(representationDocsRequired ? [{ label: "Dokumen Perwakilan", complete: isRepresentationDocsComplete }] : []),
    { label: "Dokumen Label", complete: isLabelDocsComplete },
    { label: "Hasil Uji Mutu", complete: true, detail: `${qualityTests.length} records` },
  ];
  const gatingRows = completionRows.filter((r) => r.detail === undefined);
  const completionPercent =
    gatingRows.length === 0
      ? 100
      : Math.round((gatingRows.filter((r) => r.complete).length / gatingRows.length) * 100);

  function close() {
    if (onClose) onClose();
    else router.push(surface.listHref);
  }

  // Unsaved-changes guard — a dirty form closes only after explicit
  // confirmation instead of discarding silently (see BR-004 in the Add
  // Brand review). Undirtied wizards (nothing touched yet, or a draft just
  // freshly loaded) close immediately.
  function requestClose() {
    if (formState.isDirty) setIsCloseConfirmOpen(true);
    else close();
  }

  function goToStep(step: number) {
    setCurrentStep(Math.min(TOTAL_STEPS, Math.max(1, step)));
  }

  async function goNext() {
    const fields = MERK_STEP_FIELD_NAMES[currentStep] ?? [];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function saveDraft() {
    setIsSavingDraft(true);
    try {
      const values = form.getValues();
      const response = await fetch(draftId ? `${surface.apiBase}/${draftId}` : surface.apiBase, {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, draft: true }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan draft merek");
      }
      queryClient.invalidateQueries({ queryKey: ["merk-surface", surface.apiBase] });
      form.reset(values); // clears isDirty against the just-saved snapshot
      toast.success("Draft merek berhasil disimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan draft merek");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function submitBrand() {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const response = await fetch(draftId ? `${surface.apiBase}/${draftId}` : surface.apiBase, {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Merek belum berhasil ditambahkan. Silakan coba kembali.");
      }
      const { data } = await response.json();
      queryClient.invalidateQueries({ queryKey: ["merk-surface", surface.apiBase] });
      toast.success("Merek berhasil ditambahkan.");
      if (onClose) onClose();
      else if (surface.detailHrefBase) router.push(`${surface.detailHrefBase}/${data.id}`);
      else router.push(surface.listHref);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Merek belum berhasil ditambahkan. Silakan coba kembali.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-black/40"
        onClick={requestClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tambah Merek"
        className="relative z-10 flex h-full w-full max-w-[720px] flex-col bg-background shadow-2xl"
      >
        <div className="flex-none border-b border-border px-8 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold">{currentStep === TOTAL_STEPS ? "Review Merek" : "Tambah Merek"}</h1>
              <p className="mt-1 max-w-[46ch] text-sm text-muted-foreground">
                {currentStep === TOTAL_STEPS
                  ? "Periksa kembali seluruh informasi merek, hubungan kepemilikan dan perwakilan, serta dokumen pendukung sebelum menambahkan merek ke permohonan."
                  : "Tambahkan informasi dasar merek yang terkait dengan produk yang akan diimpor."}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Tutup"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="mt-5 flex items-center" aria-label="Tahapan pendaftaran merek">
            {STEP_TITLES.map((title, index) => {
              const step = index + 1;
              const isActive = step === currentStep;
              const isDone = step < currentStep;
              return (
                <div key={title} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <div
                      className={
                        isActive || isDone
                          ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                          : "flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground"
                      }
                    >
                      {step}
                    </div>
                    <span
                      className={
                        isActive
                          ? "whitespace-nowrap text-xs font-semibold"
                          : "whitespace-nowrap text-xs text-muted-foreground"
                      }
                    >
                      {title}
                    </span>
                  </div>
                  {step < TOTAL_STEPS && <div className="mx-3 h-px flex-1 bg-border" />}
                </div>
              );
            })}
          </nav>
        </div>

        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-8 py-5">
            {currentStep === 1 && <Step1BrandInfo form={form} surface={surface} />}
            {currentStep === 2 && <Step2OwnershipRepresentation form={form} />}
            {currentStep === 3 && <Step3DokumenPendukung form={form} />}
            {currentStep === 4 && (
              <Step4BrandReview
                form={form}
                onGoToStep={goToStep}
                duplicate={duplicate}
                isDuplicateAcknowledged={isDuplicateAcknowledged}
                onAcknowledgeDuplicate={() => setIsDuplicateAcknowledged(true)}
                readiness={{
                  isReady: isReviewReady,
                  checklist,
                  completionRows,
                  completionPercent,
                  brandTitle: brandName || "Merek belum diberi nama",
                  classLabel: trademarkClass ? `Kelas ${trademarkClass} — ${classInfo?.hint ?? ""}` : undefined,
                  countryLabel,
                  ownerTitle,
                  representativeTitle,
                  importerTitle,
                  documentsCompleteCount: requiredDocuments.length - missingRequiredDocuments.length,
                  documentsTotalCount: requiredDocuments.length,
                }}
              />
            )}
          </div>

          <div className="flex flex-none items-center justify-between gap-3 border-t border-border px-8 py-4">
            {currentStep === 1 ? (
              <Button type="button" variant="ghost" onClick={requestClose}>
                Batalkan
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={goBack}>
                Kembali
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={isSavingDraft} onClick={saveDraft}>
                {isSavingDraft ? "Menyimpan..." : "Simpan Draft"}
              </Button>
              {currentStep < TOTAL_STEPS ? (
                <Button type="button" onClick={goNext}>
                  Lanjutkan →
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    type="button"
                    disabled={isSubmitting || !isReviewReady}
                    onClick={() => setIsConfirmOpen(true)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Menambahkan Merek...
                      </>
                    ) : (
                      "Tambah Merek"
                    )}
                  </Button>
                  {!isReviewReady && !isSubmitting && (
                    <p className="text-xs text-muted-foreground">
                      Lengkapi {checklist.filter((c) => !c.ok).length} persyaratan sebelum menambahkan merek.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </aside>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambahkan Merek?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pastikan seluruh informasi dan dokumen telah sesuai. Merek akan ditambahkan ke
            permohonan VIU Barang Konsumsi.
          </p>
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Merek</dt>
              <dd className="font-semibold">{brandName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pemilik</dt>
              <dd className="font-semibold">{ownerTitle || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Importir</dt>
              <dd className="font-semibold">{importerTitle || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Documents</dt>
              <dd className="font-semibold">
                {requiredDocuments.length - missingRequiredDocuments.length} / {requiredDocuments.length}{" "}
                Complete
              </dd>
            </div>
          </dl>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="button" onClick={submitBrand} disabled={isSubmitting}>
              {isSubmitting ? "Menambahkan..." : "Ya, Tambahkan Merek"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup tanpa menyimpan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Perubahan yang belum disimpan akan hilang. Gunakan Simpan Draft terlebih dahulu apabila
            ingin melanjutkan pengisian ini nanti.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCloseConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setIsCloseConfirmOpen(false);
                close();
              }}
            >
              Ya, Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
