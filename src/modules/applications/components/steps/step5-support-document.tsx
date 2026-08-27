"use client";

import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FileUploadField } from "@/components/form/file-upload-field";
import {
  createEmptySupportDocument,
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

const PRIORITY_LABEL = { UTAMA: "Utama", PENDUKUNG: "Pendukung" } as const;
const PRIORITY_BADGE = {
  UTAMA: "bg-primary/10 text-primary",
  PENDUKUNG: "bg-muted text-muted-foreground",
} as const;

/**
 * Fixed checklist proving financial capability ("modal") to fund the import. Not every
 * applicant has every document (e.g. a shareholder loan only "jika memang ada dan sah"), so
 * each one is toggled on/off — the upload field only appears once its switch is on. Bound to
 * `nonIndustriDocuments` by `key`, not array index, since resumed drafts may have a
 * differently-ordered array.
 */
function NonIndustriChecklist({ form }: { form: UseFormReturn<ApplicationWizardValues> }) {
  const { control, formState } = form;
  const arrayError = formState.errors.nonIndustriDocuments;

  return (
    <Controller
      control={control}
      name="nonIndustriDocuments"
      render={({ field }) => {
        const entries = (field.value as NonIndustriDocumentValues[] | undefined) ?? [];

        function entryFor(key: string) {
          return entries.find((entry) => entry.key === key);
        }

        function handleToggle(key: string, checked: boolean) {
          const index = entries.findIndex((entry) => entry.key === key);
          if (index === -1) {
            field.onChange([...entries, { key, enabled: checked, documentPath: "" }]);
            return;
          }
          field.onChange(entries.map((entry, i) => (i === index ? { ...entry, enabled: checked } : entry)));
        }

        function updateEntry(key: string, patch: Partial<NonIndustriDocumentValues>) {
          field.onChange(entries.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
        }

        return (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Dokumen bukti kemampuan modal untuk pembiayaan impor. Aktifkan toggle pada dokumen yang relevan, lalu
              unggah filenya.
            </p>
            {NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def) => {
              const entry = entryFor(def.key);
              const enabled = entry?.enabled ?? false;
              return (
                <div key={def.key} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{def.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_BADGE[def.priority]}`}>
                          {PRIORITY_LABEL[def.priority]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{def.desc}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggle(def.key, checked)}
                      aria-label={`Aktifkan dokumen ${def.title}`}
                    />
                  </div>
                  {enabled && (
                    <div className="mt-3 border-t border-border pt-3">
                      <FileUploadField
                        namespace="documents"
                        value={entry?.documentPath}
                        onChange={(path) => updateEntry(def.key, { documentPath: path ?? "" })}
                        label="Upload dokumen"
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
  // Bukti kemampuan finansial ("modal") applies to both Bahan Baku Industri and Non Industri —
  // both are importing goods on credit/trade financing and need to prove they can fund it, so
  // they share the same checklist instead of duplicating it under two headings.
  const needsModalDocs = hasIndustri || hasNonIndustri;

  if (!needsModalDocs && !hasKonsumsi) {
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

      {needsModalDocs && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dokumen Modal — Bukti Kemampuan Finansial
          </h2>
          <NonIndustriChecklist form={form} />
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
