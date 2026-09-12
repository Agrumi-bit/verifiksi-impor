"use client";

import type { UseFormReturn } from "react-hook-form";

import type { MerkWizardValues } from "../../schema";
import type { ReadinessChecklistItem } from "./step5/brand-readiness-summary";
import type { CompletionRow } from "./step5/completion-progress";
import type { ExistingBrandMatch } from "./step5/duplicate-check-summary";
import { BrandReadinessSummary } from "./step5/brand-readiness-summary";
import { CompletionProgress } from "./step5/completion-progress";
import { BrandInformationReview } from "./step5/brand-information-review";
import { OwnershipReview } from "./step5/ownership-review";
import { DuplicateCheckSummary } from "./step5/duplicate-check-summary";
import { FinalDeclaration } from "./step5/final-declaration";

export type ReviewReadiness = {
  isReady: boolean;
  checklist: ReadinessChecklistItem[];
  completionRows: CompletionRow[];
  completionPercent: number;
  brandTitle: string;
  classLabel?: string;
  countryLabel?: string;
  ownerTitle?: string;
  importerTitle?: string;
  documentsCompleteCount: number;
  documentsTotalCount: number;
};

type Props = {
  form: UseFormReturn<MerkWizardValues>;
  onGoToStep: (step: number) => void;
  readiness: ReviewReadiness;
  duplicate: ExistingBrandMatch | undefined;
  isDuplicateAcknowledged: boolean;
  onAcknowledgeDuplicate: () => void;
};

/**
 * Step 3 (Review) — read-only review of Informasi Merek + Kepemilikan, plus
 * the final declaration. Perwakilan and Dokumen Pendukung no longer exist as
 * wizard steps, so there's nothing left here to review for them. No new
 * data-entry fields: every value here already lives in the shared wizard
 * form state (see MerkWizard) and every "Edit" button just calls
 * onGoToStep to jump back without losing anything.
 */
export function Step5BrandReview({
  form,
  onGoToStep,
  readiness,
  duplicate,
  isDuplicateAcknowledged,
  onAcknowledgeDuplicate,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <BrandReadinessSummary
        brandName={readiness.brandTitle}
        classLabel={readiness.classLabel}
        countryLabel={readiness.countryLabel}
        ownerTitle={readiness.ownerTitle}
        importerTitle={readiness.importerTitle}
        documentsCompleteCount={readiness.documentsCompleteCount}
        documentsTotalCount={readiness.documentsTotalCount}
        checklist={readiness.checklist}
        isReady={readiness.isReady}
        onGoToStep={onGoToStep}
      />

      <BrandInformationReview form={form} onEdit={() => onGoToStep(1)} />

      <OwnershipReview form={form} onEdit={() => onGoToStep(2)} />

      <CompletionProgress rows={readiness.completionRows} percent={readiness.completionPercent} />

      <DuplicateCheckSummary
        duplicate={duplicate}
        isAcknowledged={isDuplicateAcknowledged}
        onAcknowledge={onAcknowledgeDuplicate}
        onGoToStep={onGoToStep}
      />

      <FinalDeclaration form={form} />
    </div>
  );
}
