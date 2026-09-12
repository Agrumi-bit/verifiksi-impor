"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  getRequiredBrandDocuments,
  BRAND_DOCUMENT_CATEGORY_LABELS,
  type BrandDocumentCategory,
} from "../../../document-requirements";
import type { MerkWizardValues } from "../../../schema";

type Props = {
  form: UseFormReturn<MerkWizardValues>;
  onEdit: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportingDocumentsReview({ form, onEdit }: Props) {
  const { control } = form;
  const evidenceType = useWatch({ control, name: "evidenceType" });
  const ownerLocation = useWatch({ control, name: "ownerLocation" });
  const relationshipWithApiu = useWatch({ control, name: "relationshipWithApiu" });
  const representationType = useWatch({ control, name: "representationType" });
  const appointmentSource = useWatch({ control, name: "appointmentSource" });
  const agreementType = useWatch({ control, name: "agreementType" });
  const documents = useWatch({ control, name: "documents" }) ?? {};
  const productLabelDocumentation = useWatch({ control, name: "productLabelDocumentation" }) ?? [];
  const qualityTests = useWatch({ control, name: "qualityTests" }) ?? [];

  const requirements = getRequiredBrandDocuments({
    evidenceType,
    ownerLocation,
    relationshipWithApiu,
    representationType,
    appointmentSource,
    agreementType,
  });

  const categories = Array.from(new Set(requirements.map((r) => r.category))) as BrandDocumentCategory[];

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Dokumen Pendukung</p>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit Dokumen Pendukung">
          Edit
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {categories.map((category) => (
          <div key={category}>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {BRAND_DOCUMENT_CATEGORY_LABELS[category]}
            </p>
            <ul className="flex flex-col gap-1.5">
              {requirements
                .filter((r) => r.category === category)
                .map((r) => {
                  if (r.multiple) {
                    const done = productLabelDocumentation.length > 0;
                    return (
                      <li key={r.code} className="flex items-center gap-2 text-sm">
                        {done ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span>{r.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {done ? `${productLabelDocumentation.length} files` : "Missing"}
                        </span>
                      </li>
                    );
                  }
                  const entry = documents[r.code];
                  return (
                    <li key={r.code} className="flex items-center gap-2 text-sm">
                      {entry ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>{r.label}</span>
                      {entry ? (
                        <span className="text-xs text-muted-foreground">
                          {entry.fileName} · {formatFileSize(entry.fileSize)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.required ? "Missing" : "Opsional — belum diunggah"}
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}

        {qualityTests.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Hasil Uji Mutu
            </p>
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              {qualityTests.length} Sertifikat Hasil Uji Mutu
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
