"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import type { MerkSurface } from "@/modules/merk/surface";
import { getRequiredBrandDocuments, isRequirementComplete } from "../document-requirements";
import { mapMerkDetailToWizardValues, type MerkDetailForResume } from "../map-merk-detail-to-wizard-values";
import {
  merkWizardSchema,
  MERK_STEP_FIELD_NAMES,
  createEmptyTrademarkClassEntry,
  type MerkWizardValues,
} from "../schema";
import { Step1BrandInfo } from "./steps/step1-brand-info";
import { Step2Kepemilikan } from "./steps/step2-kepemilikan";
import { Step5BrandReview } from "./steps/step5-review";
import type { ExistingBrandMatch } from "./steps/step5/duplicate-check-summary";

// Perwakilan and the standalone Dokumen Pendukung step were both removed —
// see the note above validateOwnershipStep in schema.ts. Add Merek is now
// Informasi Merek -> Kepemilikan -> Review.
const STEP_TITLES = ["Informasi Merek", "Kepemilikan", "Review"];
const TOTAL_STEPS = STEP_TITLES.length;

const DEFAULT_VALUES: Partial<MerkWizardValues> = {
  brandName: "",
  countryOfOrigin: "",
  registrationNumber: "",
  registrationIssuer: "",
  registrationDate: "",
  registrationExpiryDate: "",
  trademarkClasses: [createEmptyTrademarkClassEntry()],
  merekStatusLabel: "",
  logoPath: "",
  documents: {},
  productLabelDocumentation: [],
  qualityTests: [],
  declarationAccepted: false,
};

// Mirrors MERK_STEP_FIELD_NAMES[2] — kept as its own list only so the
// readiness checklist has a single named source for "is Kepemilikan done".
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
  /** Rendered above the step content — e.g. "Merek ini akan digunakan untuk
   * Permohonan VIU Barang Konsumsi" when launched from that wizard's own
   * "+ Tambah Merek Baru" action. */
  contextBanner?: ReactNode;
  /** Fired after a successful create/update (draft save OR final submit) —
   * lets a caller like the VIU wizard auto-select the resulting Brand
   * (ACTIVE) or offer "Lanjutkan Pengisian Merek" instead (DRAFT) without
   * this component knowing anything about VIU applications itself. Distinct
   * from `onClose`, which also fires on a plain cancel. */
  onBrandSaved?: (result: { id: string; status: "ACTIVE" | "DRAFT" }) => void;
};

export function MerkWizard({ surface, onClose, draftId, contextBanner, onBrandSaved }: Props) {
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
  const trademarkClasses = useWatch({ control, name: "trademarkClasses" }) ?? [];
  const evidenceType = useWatch({ control, name: "evidenceType" });
  const ownerLocation = useWatch({ control, name: "ownerLocation" });
  const ownerName = useWatch({ control, name: "ownerName" });
  const documents = useWatch({ control, name: "documents" }) ?? {};
  const productLabelDocumentation = useWatch({ control, name: "productLabelDocumentation" }) ?? [];
  const declarationAccepted = useWatch({ control, name: "declarationAccepted" });

  const { options: countryOptions } = useActiveCountries();

  const { data: existingBrands } = useQuery({
    queryKey: ["merk-surface", surface.apiBase],
    queryFn: async () => {
      const response = await fetch(surface.apiBase);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: ExistingBrandMatch[] };
      return json.data;
    },
  });
  // Excludes the row currently being resumed — otherwise every resumed
  // Draft/edit trivially "conflicts" with itself, permanently blocking
  // submission with a duplicate warning it can never resolve.
  const duplicate = (existingBrands ?? []).find(
    (b) => b.id !== draftId && b.brandName.trim().toLowerCase() === brandName?.trim().toLowerCase(),
  );

  // Only the trademark evidence doc remains collectible in this wizard
  // (Step 1's own upload card) — the fuller per-scenario document set
  // getRequiredBrandDocuments() can compute is used by VIU Application
  // creation instead, now that Perwakilan/Dokumen Pendukung are gone.
  const documentRequirements = getRequiredBrandDocuments({ evidenceType }).filter(
    (r) => r.category === "trademark",
  );
  const requiredDocuments = documentRequirements.filter((r) => r.required);
  const missingRequiredDocuments = requiredDocuments.filter(
    (r) => !isRequirementComplete(r, documents, productLabelDocumentation),
  );

  const step1HasErrors = MERK_STEP_FIELD_NAMES[1].some((field) => Boolean(formState.errors[field]));
  const isStep1Complete = !step1HasErrors && Boolean(brandName?.trim());
  const ownershipHasErrors = OWNERSHIP_CORE_FIELDS.some((field) => Boolean(formState.errors[field]));
  const isOwnershipComplete = Boolean(ownerLocation) && !ownershipHasErrors;
  const isDuplicateResolved = !duplicate || isDuplicateAcknowledged;

  // Documents intentionally do NOT gate readiness — see the
  // documentRequirements comment above.
  const isReviewReady =
    isStep1Complete && isOwnershipComplete && isDuplicateResolved && declarationAccepted === true;

  // Display-only derivations for the top summary — duplicated in spirit
  // from OwnershipReview (same source data, different component); kept
  // separate since this only needs a short one-off string, not shared state.
  const countryLabel = countryOptions.find((o) => o.value === countryOfOrigin)?.label ?? countryOfOrigin;
  // "Kelas 09, 25" — every selected class's number, comma-joined.
  const classesLabel = trademarkClasses
    .map((entry) => entry.trademarkClass)
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const ownerTitle = ownerName;
  const importerTitle = ownerLocation ? APIU_PLACEHOLDER_NAME : undefined;

  const checklist = [
    { key: "step1", label: "Informasi merek lengkap", ok: isStep1Complete, step: 1, issueLabel: "Informasi merek belum lengkap." },
    { key: "ownership", label: "Data kepemilikan lengkap", ok: isOwnershipComplete, step: 2, issueLabel: "Data kepemilikan belum lengkap." },
    // Documents are informational only here (see documentRequirements
    // comment) — no checklist entry, so a missing "wajib" document never
    // shows as a blocker in BrandReadinessSummary. Status still visible via
    // the "X / Y Lengkap" count and the completion progress bar below.
    {
      key: "duplicate",
      label: "Tidak ada konflik duplikasi",
      ok: isDuplicateResolved,
      step: 1,
      issueLabel: "Konflik duplikasi merek belum diselesaikan.",
    },
    // No global "upload in progress" tracker exists across upload cards —
    // every value that reaches form state is already a completed upload, so
    // this is structurally always true. See the Step 5 report.
    { key: "uploads", label: "Semua upload selesai", ok: true },
  ];

  const isTrademarkDocComplete = !requiredDocuments.some(
    (r) => !isRequirementComplete(r, documents, productLabelDocumentation),
  );

  const completionRows = [
    { label: "Informasi Merek", complete: isStep1Complete },
    { label: "Kepemilikan", complete: isOwnershipComplete },
    { label: "Dokumen Merek", complete: isTrademarkDocComplete },
  ];
  const completionPercent =
    completionRows.length === 0
      ? 100
      : Math.round((completionRows.filter((r) => r.complete).length / completionRows.length) * 100);

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
      const { data } = await response.json();
      queryClient.invalidateQueries({ queryKey: ["merk-surface", surface.apiBase] });
      form.reset(values); // clears isDirty against the just-saved snapshot
      toast.success("Draft merek berhasil disimpan.");
      onBrandSaved?.({ id: data.id, status: "DRAFT" });
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
      onBrandSaved?.({ id: data.id, status: "ACTIVE" });
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
                  ? "Periksa kembali seluruh informasi merek dan hubungan kepemilikan sebelum menambahkan merek ke permohonan."
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

        {/* A plain div, not <form> — this wizard has no native-submit button
            (every action is an explicit onClick), and MerkWizard can now be
            mounted inside another wizard's own <form> (e.g. VIU's "+ Tambah
            Merek Baru" — see step-brands-used/add-brand-launcher.tsx); a
            nested <form> there is invalid HTML and triggers a hydration
            error. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-8 py-5">
            {contextBanner && <div className="mb-5">{contextBanner}</div>}
            {currentStep === 1 && <Step1BrandInfo form={form} surface={surface} draftId={draftId} />}
            {currentStep === 2 && <Step2Kepemilikan form={form} />}
            {currentStep === 3 && (
              <Step5BrandReview
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
                  classLabel: classesLabel ? `Kelas ${classesLabel}` : undefined,
                  countryLabel,
                  ownerTitle,
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
        </div>
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
