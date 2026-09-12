"use client";

import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useActiveCountries } from "@/modules/master-data/use-active-countries";
import { useActiveTrademarkClasses } from "@/modules/master-data/use-active-trademark-classes";
import type { MerkSurface } from "@/modules/merk/surface";
import { getRequiredBrandDocuments } from "../../document-requirements";
import {
  MERK_EVIDENCE_TYPES,
  MERK_EVIDENCE_TYPE_LABELS,
  MERK_EVIDENCE_TYPE_DESCRIPTIONS,
  MERK_EVIDENCE_TYPES_WITH_OPTIONAL_DATE,
  createEmptyTrademarkClassEntry,
  type BrandDocumentEntryValues,
  type MerkEvidenceType,
  type MerkWizardValues,
} from "../../schema";
import { BrandDocumentUploadCard } from "./step4/brand-document-upload-card";

type Props = {
  form: UseFormReturn<MerkWizardValues>;
  surface: MerkSurface;
  /** The brand row currently being resumed (Draft/edit) — excluded from its
   * own duplicate-name check below. */
  draftId?: string;
};

const STATUS_OPTIONS_BY_EVIDENCE: Record<MerkEvidenceType, string[]> = {
  SERTIFIKAT_MEREK_TERDAFTAR: ["Terdaftar", "Dalam Proses", "Ditolak"],
  TANDA_DAFTAR_MEREK: ["Dalam Proses", "Terdaftar", "Ditolak"],
  SERTIFIKAT_INTERNASIONAL: [],
};

const NUMBER_FIELD_LABEL: Record<MerkEvidenceType, string> = {
  SERTIFIKAT_MEREK_TERDAFTAR: "Nomor Sertifikat / Nomor Pendaftaran",
  TANDA_DAFTAR_MEREK: "Nomor Permohonan / Pendaftaran",
  SERTIFIKAT_INTERNASIONAL: "Nomor Pendaftaran Internasional",
};
const DATE_FIELD_LABEL: Record<MerkEvidenceType, string> = {
  SERTIFIKAT_MEREK_TERDAFTAR: "Tanggal Penerbitan",
  TANDA_DAFTAR_MEREK: "Tanggal Registrasi",
  SERTIFIKAT_INTERNASIONAL: "Tanggal Notifikasi / Pendaftaran",
};
const ISSUER_PLACEHOLDER_BY_EVIDENCE: Record<MerkEvidenceType, string> = {
  SERTIFIKAT_MEREK_TERDAFTAR: "e.g. DJKI Kementerian Hukum dan HAM",
  TANDA_DAFTAR_MEREK: "e.g. DJKI Kementerian Hukum dan HAM",
  SERTIFIKAT_INTERNASIONAL: "e.g. WIPO (Madrid System)",
};

type ExistingBrand = { id: string; brandName: string };

export function Step1BrandInfo({ form, surface, draftId }: Props) {
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  const { options: countryOptions, isLoading: isLoadingCountries } = useActiveCountries();
  const { options: trademarkClassOptions } = useActiveTrademarkClasses();

  const brandName = useWatch({ control, name: "brandName" });
  const countryValue = useWatch({ control, name: "countryOfOrigin" });
  const evidenceType = useWatch({ control, name: "evidenceType" }) as MerkEvidenceType | undefined;
  const trademarkClasses = useWatch({ control, name: "trademarkClasses" }) ?? [];
  const registrationNumber = useWatch({ control, name: "registrationNumber" });
  const logoPath = useWatch({ control, name: "logoPath" });
  const documents = useWatch({ control, name: "documents" }) ?? {};
  const { fields: trademarkClassFields, append: appendTrademarkClass, remove: removeTrademarkClass } =
    useFieldArray({ control, name: "trademarkClasses" });

  // Same requirement code regardless of which card is picked — only the
  // label/description change per evidence type (see trademarkRequirement in
  // document-requirements.ts). This is the one document upload this wizard
  // still collects, now that the standalone Dokumen Pendukung step is gone.
  const trademarkRequirement = getRequiredBrandDocuments({ evidenceType })[0];

  function updateTrademarkEvidence(value: BrandDocumentEntryValues | undefined) {
    const next = { ...getValues("documents") };
    if (value) next.trademark_evidence = value;
    else delete next.trademark_evidence;
    setValue("documents", next, { shouldValidate: true });
  }

  // Duplicate-brand check — shares the list query MerkTable already caches
  // for this surface, so entering a name doesn't cost an extra request.
  const { data: existingBrands } = useQuery({
    queryKey: ["merk-surface", surface.apiBase],
    queryFn: async () => {
      const response = await fetch(surface.apiBase);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: ExistingBrand[] };
      return json.data;
    },
  });
  // Excludes the row currently being resumed — see merk-wizard.tsx's own
  // duplicate check for why (a resumed Draft/edit always "matches itself"
  // otherwise).
  const duplicate = (existingBrands ?? []).find(
    (b) => b.id !== draftId && b.brandName.trim().toLowerCase() === brandName?.trim().toLowerCase(),
  );

  const countryLabel = countryOptions.find((o) => o.value === countryValue)?.label;
  // "Kelas 09, 25" — every selected class's number, comma-joined; empty
  // entries (still being filled in) are skipped rather than showing "Kelas ".
  const classesSummary = trademarkClasses
    .map((entry) => entry.trademarkClass)
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const statusOptions = evidenceType ? STATUS_OPTIONS_BY_EVIDENCE[evidenceType] : [];
  const isDateOptional = evidenceType
    ? MERK_EVIDENCE_TYPES_WITH_OPTIONAL_DATE.includes(evidenceType)
    : false;

  return (
    <div className="flex flex-col gap-6">
      {/* Informasi Merek */}
      <section className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">Informasi Merek</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Masukkan identitas merek sebagaimana tercantum pada dokumen merek.
        </p>

        <FormField label="Nama Merek" required error={errors.brandName?.message}>
          <Input
            className="h-11 text-base font-semibold"
            placeholder="Contoh: NIKE"
            {...register("brandName")}
          />
        </FormField>
        <p className="-mt-2 mb-3 text-xs text-muted-foreground">
          Masukkan nama merek sesuai dengan sertifikat atau dokumen pendaftaran merek.
        </p>

        {brandName?.trim() && duplicate && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <div>
              <p>
                Merek <b>{duplicate.brandName}</b> sudah terdaftar pada perusahaan ini.
              </p>
              <button type="button" className="mt-1 font-semibold underline underline-offset-2">
                Gunakan Merek yang Ada
              </button>
            </div>
          </div>
        )}

        <Controller
          control={control}
          name="countryOfOrigin"
          render={({ field }) => (
            <FormField
              label="Negara Merek / Pemilik Merek"
              required
              error={errors.countryOfOrigin?.message}
            >
              <SearchSelectInput
                value={field.value ?? ""}
                onChange={field.onChange}
                options={countryOptions}
                allowFreeText={false}
                placeholder={isLoadingCountries ? "Memuat negara..." : "Pilih negara"}
              />
            </FormField>
          )}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Pilih negara tempat pemilik merek berkedudukan. Detail pemilik merek dilengkapi pada
          Step 2 — Kepemilikan.
        </p>
      </section>

      {/* Informasi Pendaftaran Merek */}
      <section className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">Informasi Pendaftaran Merek</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Masukkan informasi dokumen yang menjadi dasar penggunaan merek.
        </p>

        <FormField label="Jenis Bukti Merek" required error={errors.evidenceType?.message}>
          <Controller
            control={control}
            name="evidenceType"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {MERK_EVIDENCE_TYPES.map((value) => {
                  const selected = field.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={
                        selected
                          ? "flex items-start gap-3 rounded-lg border-2 border-primary bg-primary/5 px-3.5 py-3 text-left"
                          : "flex items-start gap-3 rounded-lg border border-border px-3.5 py-3 text-left hover:bg-muted/50"
                      }
                    >
                      <span
                        className={
                          selected
                            ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-primary"
                            : "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border"
                        }
                      >
                        {selected && <span className="size-1.5 rounded-full bg-primary" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">
                          {MERK_EVIDENCE_TYPE_LABELS[value]}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {MERK_EVIDENCE_TYPE_DESCRIPTIONS[value]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
        </FormField>

        {evidenceType && (
          <div className="mt-4 flex flex-col gap-4 border-t border-dashed border-border pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={NUMBER_FIELD_LABEL[evidenceType]}
                required
                error={errors.registrationNumber?.message}
              >
                <Input
                  className="font-mono"
                  placeholder="e.g. IDM000123456"
                  {...register("registrationNumber")}
                />
              </FormField>
              <FormField
                label="Lembaga Penerbit"
                required
                error={errors.registrationIssuer?.message}
              >
                <Input
                  placeholder={ISSUER_PLACEHOLDER_BY_EVIDENCE[evidenceType]}
                  {...register("registrationIssuer")}
                />
              </FormField>
              <FormField
                label={DATE_FIELD_LABEL[evidenceType]}
                required={!isDateOptional}
                error={errors.registrationDate?.message}
              >
                <Input type="date" className="font-mono" {...register("registrationDate")} />
              </FormField>
            </div>

            {statusOptions.length > 0 ? (
              <FormField label="Status Merek" error={errors.merekStatusLabel?.message}>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  {...register("merekStatusLabel")}
                  defaultValue={statusOptions[0]}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Status" error={errors.merekStatusLabel?.message}>
                <Input
                  placeholder="Contoh: Sedang diperiksa WIPO"
                  {...register("merekStatusLabel")}
                />
              </FormField>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Kelas Merek <span className="text-destructive">*</span>
                </p>
              </div>
              <p className="-mt-1 mb-3 text-xs text-muted-foreground">
                Merek bisa didaftarkan pada lebih dari satu kelas — tambahkan satu blok per kelas,
                masing-masing dengan uraian barang/jasanya sendiri.
              </p>

              <div className="flex flex-col gap-3">
                {trademarkClassFields.map((field, index) => {
                  const entryErrors = errors.trademarkClasses?.[index];
                  return (
                    <div key={field.id} className="rounded-lg border border-border p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <Controller
                            control={control}
                            name={`trademarkClasses.${index}.trademarkClass`}
                            render={({ field: classField }) => (
                              <FormField
                                label="Kelas"
                                required
                                error={entryErrors?.trademarkClass?.message}
                                hint="Penomoran Klasifikasi Nice yang dipakai DJKI untuk mengelompokkan jenis barang/jasa merek."
                              >
                                <SearchSelectInput
                                  value={classField.value ?? ""}
                                  onChange={classField.onChange}
                                  options={trademarkClassOptions}
                                  allowFreeText={false}
                                  placeholder="Pilih kelas"
                                />
                              </FormField>
                            )}
                          />
                        </div>
                        {trademarkClassFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTrademarkClass(index)}
                            aria-label={`Hapus kelas ${index + 1}`}
                            className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-3">
                        <FormField
                          label="Uraian Kelas Merek"
                          required
                          error={entryErrors?.trademarkClassDescription?.message}
                          hint="Uraian barang/jasa spesifik merek ini pada kelas terpilih, sesuai yang akan didaftarkan ke DJKI — bukan judul kelas Nice secara umum."
                        >
                          <Textarea
                            placeholder="Contoh: Kemeja pria, celana panjang, dan jaket dari bahan katun"
                            rows={3}
                            {...register(`trademarkClasses.${index}.trademarkClassDescription`)}
                          />
                        </FormField>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errors.trademarkClasses?.message && (
                <p className="mt-1.5 text-xs text-destructive">{errors.trademarkClasses.message}</p>
              )}

              <Button
                type="button"
                variant="outline"
                className="mt-3 border-dashed"
                onClick={() => appendTrademarkClass(createEmptyTrademarkClassEntry())}
              >
                <Plus className="size-4" />
                Tambah Kelas Merek
              </Button>
            </div>

            <BrandDocumentUploadCard
              label={trademarkRequirement.label}
              description={trademarkRequirement.description}
              required={trademarkRequirement.required}
              value={documents.trademark_evidence}
              onChange={updateTrademarkEvidence}
              namespace="documents"
              error={
                (errors.documents as Record<string, { message?: string }> | undefined)
                  ?.trademark_evidence?.message
              }
            />
          </div>
        )}
      </section>

      {/* Logo Merek */}
      <section className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-semibold">Logo Merek</p>
        <Controller
          control={control}
          name="logoPath"
          render={({ field }) => (
            <FileUploadField
              namespace="photos"
              value={field.value}
              onChange={field.onChange}
              label="Unggah Logo Merek"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            />
          )}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Logo digunakan untuk memudahkan identifikasi merek pada platform, bukan sebagai bukti
          hukum merek.
        </p>
      </section>

      {/* Pratinjau Merek */}
      {(brandName || evidenceType) && (
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Pratinjau Merek
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
              {logoPath ? "IMG" : (brandName || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{brandName || "Nama merek belum diisi"}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {countryLabel && <span>{countryLabel}</span>}
                {classesSummary && <span>Kelas {classesSummary}</span>}
                {registrationNumber && <span className="font-mono">{registrationNumber}</span>}
              </div>
            </div>
            {evidenceType && <Badge variant="secondary">{MERK_EVIDENCE_TYPE_LABELS[evidenceType]}</Badge>}
          </div>
        </section>
      )}
    </div>
  );
}
