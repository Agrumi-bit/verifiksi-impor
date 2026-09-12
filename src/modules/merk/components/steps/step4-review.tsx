"use client";

import type { UseFormReturn } from "react-hook-form";

import type { MerkWizardValues } from "../../schema";
import type { ReadinessChecklistItem } from "./step4/brand-readiness-summary";
import type { CompletionRow } from "./step4/completion-progress";
import type { ExistingBrandMatch } from "./step4/duplicate-check-summary";
import { BrandReadinessSummary } from "./step4/brand-readiness-summary";
import { CompletionProgress } from "./step4/completion-progress";
import { BrandInformationReview } from "./step4/brand-information-review";
import { OwnershipRepresentationReview } from "./step4/ownership-representation-review";
import { BrandRelationshipSummary } from "./step2/brand-relationship-summary";
import { SupportingDocumentsReview } from "./step4/supporting-documents-review";
import { QualityTestReview } from "./step4/quality-test-review";
import { DuplicateCheckSummary } from "./step4/duplicate-check-summary";
import { FinalDeclaration } from "./step4/final-declaration";

export type ReviewReadiness = {
  isReady: boolean;
  checklist: ReadinessChecklistItem[];
  completionRows: CompletionRow[];
  completionPercent: number;
  brandTitle: string;
  classLabel?: string;
  countryLabel?: string;
  ownerTitle?: string;
  representativeTitle?: string;
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
 * Step 4 — read-only review of everything Steps 1-3 collected, plus the
 * final declaration. No new data-entry fields: every value here already
 * lives in the shared wizard form state (see MerkWizard) and every "Edit"
 * button just calls onGoToStep to jump back without losing anything.
 */
export function Step4BrandReview({
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
        representativeTitle={readiness.representativeTitle}
        importerTitle={readiness.importerTitle}
        documentsCompleteCount={readiness.documentsCompleteCount}
        documentsTotalCount={readiness.documentsTotalCount}
        checklist={readiness.checklist}
        isReady={readiness.isReady}
        onGoToStep={onGoToStep}
      />

      <BrandInformationReview form={form} onEdit={() => onGoToStep(1)} />

      <OwnershipRepresentationReview form={form} onEdit={() => onGoToStep(2)} />
      <BrandRelationshipSummary form={form} />

      <SupportingDocumentsReview form={form} onEdit={() => onGoToStep(3)} />
      <QualityTestReview form={form} />

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
