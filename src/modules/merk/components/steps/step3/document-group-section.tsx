"use client";

import { Trash2 } from "lucide-react";

import type { BrandDocumentRequirement } from "../../../document-requirements";
import type { BrandDocumentEntryValues } from "../../../schema";
import { BrandDocumentUploadCard } from "./brand-document-upload-card";

type Props = {
  title: string;
  requirements: BrandDocumentRequirement[];
  documents: Record<string, BrandDocumentEntryValues>;
  onChangeDocument: (code: string, value: BrandDocumentEntryValues | undefined) => void;
  errors?: Record<string, string | undefined>;
  contextNotes?: Record<string, React.ReactNode>;
  // Only relevant for a "multiple: true" requirement (product label docs).
  multiFileValues?: BrandDocumentEntryValues[];
  onChangeMultiFile?: (next: BrandDocumentEntryValues[]) => void;
  multiFileError?: string;
};

/**
 * One collapsible document group — a thin, data-driven wrapper around
 * BrandDocumentUploadCard. Reused for every category the requirement engine
 * can produce (representation, import_authorization,
 * official_representative_legal, product_compliance) instead of one
 * near-identical component per category.
 */
export function DocumentGroupSection({
  title,
  requirements,
  documents,
  onChangeDocument,
  errors,
  contextNotes,
  multiFileValues,
  onChangeMultiFile,
  multiFileError,
}: Props) {
  if (requirements.length === 0) return null;

  return (
    <details open className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      <div className="mt-3 flex flex-col gap-3">
        {requirements.map((requirement) =>
          requirement.multiple ? (
            <MultiFileRequirement
              key={requirement.code}
              requirement={requirement}
              values={multiFileValues ?? []}
              onChange={onChangeMultiFile ?? (() => {})}
              error={multiFileError}
            />
          ) : (
            <BrandDocumentUploadCard
              key={requirement.code}
              label={requirement.label}
              description={requirement.description}
              required={requirement.required}
              value={documents[requirement.code]}
              onChange={(value) => onChangeDocument(requirement.code, value)}
              namespace="documents"
              error={errors?.[requirement.code]}
              contextNote={contextNotes?.[requirement.code]}
            />
          ),
        )}
      </div>
    </details>
  );
}

function MultiFileRequirement({
  requirement,
  values,
  onChange,
  error,
}: {
  requirement: BrandDocumentRequirement;
  values: BrandDocumentEntryValues[];
  onChange: (next: BrandDocumentEntryValues[]) => void;
  error?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {requirement.label}
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
          {requirement.required ? "Wajib" : "Opsional"}
        </span>
      </p>
      {requirement.description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{requirement.description}</p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {values.map((file, index) => (
          <div
            key={`${file.filePath}-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
          >
            <span className="min-w-0 truncate text-sm">{file.fileName}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Hapus ${file.fileName}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        <BrandDocumentUploadCard
          label="Tambah File"
          required={values.length === 0 && requirement.required}
          value={undefined}
          onChange={(value) => {
            if (value) onChange([...values, value]);
          }}
          namespace="documents"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
