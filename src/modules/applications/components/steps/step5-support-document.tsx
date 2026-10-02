"use client";

import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { terbilangRupiah } from "@/lib/terbilang";
import {
  createEmptySupportDocument,
  MODAL_STATEMENT_LETTER_DOC_DEF,
  NON_INDUSTRI_SUPPORT_DOC_DEFS,
  type ApplicationWizardValues,
  type NonIndustriDocumentValues,
} from "../../schema";

type Step5Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

function DocumentListSection({
  form,
  fieldName,
  namespace,
  docCountHint,
}: {
  form: UseFormReturn<ApplicationWizardValues>;
  fieldName: "konsumsiDocuments";
  namespace: "documents";
  docCountHint: string;
}) {
  const { control, register, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });
  const arrayError = formState.errors[fieldName];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Tambahkan dokumen pendukung sesuai persyaratan ({docCountHint}). Daftar
        dokumen persis masih menunggu konfirmasi dari modul System
        Configuration — untuk sekarang, tambahkan dokumen secara manual.
      </p>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
        >
          <div className="flex flex-1 flex-col gap-2">
            <Input
              placeholder="Nama dokumen, mis. Surat Izin Edar"
              {...register(`${fieldName}.${index}.label` as const)}
            />
            <Controller
              control={control}
              name={`${fieldName}.${index}.documentPath` as const}
              render={({ field: docField }) => (
                <FileUploadField
                  namespace={namespace}
                  value={docField.value}
                  onChange={docField.onChange}
                  label="Upload dokumen"
                />
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            className="mt-2 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Hapus dokumen"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {arrayError?.message && typeof arrayError.message === "string" && (
        <p className="text-xs text-destructive">{arrayError.message}</p>
      )}
      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptySupportDocument() as any)}
      >
        + Add Document
      </Button>
    </div>
  );
}

/**
 * Bukti Kemampuan Finansial: Surat Pernyataan Kepemilikan Modal Kerja is unconditionally
 * required (no toggle — always shown, direct upload). Below it, the applicant picks exactly ONE
 * type of supporting evidence from `NON_INDUSTRI_SUPPORT_DOC_DEFS` via a dropdown, then uploads
 * that one document — not a multi-toggle checklist, since only one piece of evidence is needed.
 * `fieldName` picks which array this instance reads/writes — `nonIndustriDocuments` for Bahan Baku
 * Industri/Non Industri, `konsumsiFinancialDocuments` for Barang Konsumsi — two fully separate
 * arrays (same catalog, never shared storage) so a mixed Industri+Konsumsi application gets two
 * independent checklists, each with its own Jumlah Modal Kerja and evidence document. Entries are
 * bound by `key`, not array index, since resumed drafts may have a differently-ordered array.
 */
function NonIndustriChecklist({
  form,
  fieldName,
}: {
  form: UseFormReturn<ApplicationWizardValues>;
  fieldName: "nonIndustriDocuments" | "konsumsiFinancialDocuments";
}) {
  const { control, formState } = form;
  const arrayError = formState.errors[fieldName];

  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field }) => {
        const entries = (field.value as NonIndustriDocumentValues[] | undefined) ?? [];

        function entryFor(key: string) {
          return entries.find((entry) => entry.key === key);
        }

        function updateEntry(key: string, patch: Partial<NonIndustriDocumentValues>) {
          const index = entries.findIndex((entry) => entry.key === key);
          if (index === -1) {
            field.onChange([...entries, { key, enabled: true, documentPath: "", ...patch }]);
            return;
          }
          field.onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
        }

        const statementEntry = entryFor(MODAL_STATEMENT_LETTER_DOC_DEF.key);
        const evidenceEntry = NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def) => entryFor(def.key)).find((entry) => entry?.enabled);
        const evidenceDef = evidenceEntry ? NON_INDUSTRI_SUPPORT_DOC_DEFS.find((def) => def.key === evidenceEntry.key) : undefined;

        function selectEvidenceType(key: string | null) {
          if (!key) return;
          // Only one evidence type at a time — clear any previously selected one so the array
          // never ends up with two "enabled" evidence entries.
          for (const def of NON_INDUSTRI_SUPPORT_DOC_DEFS) {
            if (def.key !== key && entryFor(def.key)?.enabled) {
              updateEntry(def.key, { enabled: false, documentPath: "" });
            }
          }
          updateEntry(key, { enabled: true });
        }

        return (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-border p-4">
              <span className="text-sm font-bold">{MODAL_STATEMENT_LETTER_DOC_DEF.title}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">{MODAL_STATEMENT_LETTER_DOC_DEF.desc}</p>
              <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                <FormField label="Jumlah Modal Kerja (Rp)" required>
                  <Input
                    inputMode="numeric"
                    placeholder="e.g. 500000000"
                    value={statementEntry?.amount ?? ""}
                    onChange={(event) =>
                      updateEntry(MODAL_STATEMENT_LETTER_DOC_DEF.key, {
                        amount: event.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                  />
                  {statementEntry?.amount && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      Terbilang: {terbilangRupiah(statementEntry.amount)}
                    </p>
                  )}
                </FormField>
                <FileUploadField
                  namespace="documents"
                  value={statementEntry?.documentPath}
                  onChange={(path) => updateEntry(MODAL_STATEMENT_LETTER_DOC_DEF.key, { documentPath: path ?? "" })}
                  label="Upload dokumen"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <span className="text-sm font-bold">Dokumen Bukti Pernyataan Modal</span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Opsional. Pilih salah satu jenis dokumen sebagai bukti pendukung, lalu unggah filenya.
              </p>
              <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                <FormField label="Jenis Dokumen">
                  <Select value={evidenceDef?.key ?? ""} onValueChange={selectEvidenceType}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) => NON_INDUSTRI_SUPPORT_DOC_DEFS.find((def) => def.key === value)?.title ?? "Pilih jenis dokumen..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def) => (
                        <SelectItem key={def.key} value={def.key}>
                          {def.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {evidenceDef && (
                  <>
                    <p className="text-xs text-muted-foreground">{evidenceDef.desc}</p>
                    <FileUploadField
                      namespace="documents"
                      value={evidenceEntry?.documentPath}
                      onChange={(path) => updateEntry(evidenceDef.key, { documentPath: path ?? "" })}
                      label="Upload dokumen"
                    />
                  </>
                )}
              </div>
            </div>

            {arrayError?.message && typeof arrayError.message === "string" && (
              <p className="text-xs text-destructive">{arrayError.message}</p>
            )}
          </div>
        );
      }}
    />
  );
}

export function Step5SupportDocument({ form }: Step5Props) {
  const { control } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];

  const hasIndustri = importTypes.includes("BAHAN_BAKU_INDUSTRI");
  const hasNonIndustri = importTypes.includes("BAHAN_BAKU_NON_INDUSTRI");
  const hasKonsumsi = importTypes.includes("BARANG_KONSUMSI");
  // Bukti kemampuan finansial ("modal") applies to Bahan Baku Industri, Non Industri, AND Barang
  // Konsumsi — same regulatory requirement for all three, so they share the same checklist
  // CONTENT (catalog), but each gets its own independent checklist INSTANCE/storage below —
  // `nonIndustriDocuments` for Industri/Non-Industri, `konsumsiFinancialDocuments` for Konsumsi —
  // so a mixed application never couples one scheme's Jumlah Modal Kerja/evidence doc with another's.
  const needsIndustriModalDocs = hasIndustri || hasNonIndustri;

  if (!needsIndustriModalDocs && !hasKonsumsi) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Tidak ada Jenis Impor yang dipilih di Step 2, sehingga tidak ada
        dokumen pendukung yang perlu ditambahkan di step ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Dokumen pendukung yang perlu diunggah disesuaikan dengan Jenis Impor
        yang Anda pilih di Step 2.
      </p>

      {needsIndustriModalDocs && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dokumen Modal — Bukti Kemampuan Finansial
          </h2>
          <NonIndustriChecklist form={form} fieldName="nonIndustriDocuments" />
        </section>
      )}

      {hasKonsumsi && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            VIU Konsumsi — Bukti Kemampuan Finansial
          </h2>
          <NonIndustriChecklist form={form} fieldName="konsumsiFinancialDocuments" />
        </section>
      )}

      {hasKonsumsi && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Impor Barang Konsumsi
          </h2>
          <DocumentListSection
            form={form}
            fieldName="konsumsiDocuments"
            namespace="documents"
            docCountHint="7 dokumen"
          />
        </section>
      )}
    </div>
  );
}
