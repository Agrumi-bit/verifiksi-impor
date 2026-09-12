"use client";

import { isRequirementComplete } from "../../../document-requirements";
import type { BrandDocumentRequirement } from "../../../document-requirements";
import type { BrandDocumentEntryValues } from "../../../schema";

// Re-exported for existing callers (merk-wizard.tsx) — the function itself
// now lives in document-requirements.ts so server-side (non-"use client")
// code can share it too. See BR-related Merk Management nav/monitoring work.
export { isRequirementComplete };

type Props = {
  requirements: BrandDocumentRequirement[];
  documents: Record<string, BrandDocumentEntryValues>;
  productLabelDocumentation: BrandDocumentEntryValues[];
};

export function DocumentCompletenessSummary({ requirements, documents, productLabelDocumentation }: Props) {
  const required = requirements.filter((r) => r.required);
  const missing = required.filter((r) => !isRequirementComplete(r, documents, productLabelDocumentation));
  const uploadedCount = required.length - missing.length;
  const percent = required.length === 0 ? 100 : Math.round((uploadedCount / required.length) * 100);

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Kelengkapan Dokumen</p>
        <span className="text-sm font-bold text-primary">{percent}%</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {uploadedCount} dari {required.length} dokumen wajib telah diunggah. Dokumen belum wajib
        untuk menambahkan merek — kelengkapan ini baru diwajibkan saat pengajuan Aplikasi VIU.
      </p>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {missing.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground">Belum Lengkap</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
            {missing.map((r) => (
              <li key={r.code}>{r.label}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
