"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { SelectableCard } from "@/components/form/selectable-card";
import {
  IMPORT_TYPES,
  type ApplicationWizardValues,
  type ImportType,
} from "../../schema";

const VERIFICATION_TYPE_OPTIONS = [
  {
    value: "VKI",
    title: "VKI — Verifikasi Kemampuan Industri",
    subtitle: "Industrial Capacity Verification",
    badge: "MANUFACTURER",
    description:
      "Untuk produsen tekstil yang perlu memverifikasi mesin terpasang dan kapasitas produksi. Diperlukan untuk memperoleh izin impor dan izin regulasi dari Kementerian Perindustrian.",
    bullet: "Factory & Machinery Physical Inspection",
  },
  {
    value: "VIU",
    title: "VIU — Verifikasi Importir Umum",
    subtitle: "General Importer Verification",
    badge: "IMPORTER",
    description:
      "Untuk importir yang harus memverifikasi pemanfaatan aktual bahan tekstil impor sesuai kondisi izin impor atau alokasi kuota.",
    bullet: "Bill of Entry Document Verification",
  },
] as const;

const VIKM_PLACEHOLDER = {
  title: "VIKM — Verifikasi Kemampuan Industri Kecil dan Menengah",
  subtitle: "Small & Medium Industry Capacity Verification",
  description:
    "Proses pemeriksaan resmi oleh Kemenperin untuk menilai kesesuaian data, dokumen, kapasitas produksi, serta kebutuhan riil IKM. Alur sama dengan VKI/VIU.",
};

const APPLICATION_CATEGORY_OPTIONS = [
  {
    value: "NEW",
    title: "New Application",
    subtitle: "First-time application for verification",
  },
  {
    value: "RENEWAL",
    title: "Renewal",
    subtitle: "Renew an existing expiring certificate",
  },
  {
    value: "AMENDMENT",
    title: "Amendment",
    subtitle: "Modify data in an existing certificate",
  },
] as const;

const IMPORT_TYPE_OPTIONS: Record<
  ImportType,
  { title: string; tags: string[]; docCount: string; description: string }
> = {
  BAHAN_BAKU_INDUSTRI: {
    title:
      "Impor Bahan Baku dan/atau Bahan Penolong – Perusahaan Industri (API-U)",
    tags: ["API-U", "INDUSTRI"],
    docCount: "7 dok",
    description:
      "Digunakan untuk impor bahan baku yang akan diproses dalam kegiatan produksi industri.",
  },
  BAHAN_BAKU_NON_INDUSTRI: {
    title:
      "Impor Bahan Baku dan/atau Bahan Penolong – Perusahaan Non Industri (API-U)",
    tags: ["API-U", "NON INDUSTRI"],
    docCount: "4 dok",
    description:
      "Digunakan untuk perusahaan non industri yang mengimpor bahan baku untuk disalurkan kepada perusahaan non industri.",
  },
  BARANG_KONSUMSI: {
    title: "Impor Barang Konsumsi",
    tags: ["KONSUMSI", "RITEL"],
    docCount: "7 dok",
    description: "Digunakan untuk impor produk tekstil jadi untuk dijual di pasar.",
  },
};

type Step1Props = {
  form: UseFormReturn<ApplicationWizardValues>;
};

export function Step1ApplicationInformation({ form }: Step1Props) {
  const { control, watch } = form;
  const verificationType = watch("verificationType");

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Verification Type
        </h2>
        <Controller
          control={control}
          name="verificationType"
          render={({ field, fieldState }) => (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {VERIFICATION_TYPE_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option.value}
                    selected={field.value === option.value}
                    onSelect={() => field.onChange(option.value)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                        {option.value}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {option.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{option.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.subtitle}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                    <p className="mt-2 text-xs">• {option.bullet}</p>
                  </SelectableCard>
                ))}
                <SelectableCard selected={false} onSelect={() => {}} disabled>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                      VIKM
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      Segera Hadir
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {VIKM_PLACEHOLDER.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {VIKM_PLACEHOLDER.subtitle}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {VIKM_PLACEHOLDER.description}
                  </p>
                </SelectableCard>
              </div>
              {fieldState.error && (
                <p className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Application Category
        </h2>
        <Controller
          control={control}
          name="applicationCategory"
          render={({ field, fieldState }) => (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {APPLICATION_CATEGORY_OPTIONS.map((option) => (
                  <SelectableCard
                    key={option.value}
                    selected={field.value === option.value}
                    onSelect={() => field.onChange(option.value)}
                  >
                    <p className="text-sm font-semibold">{option.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.subtitle}
                    </p>
                  </SelectableCard>
                ))}
              </div>
              {fieldState.error && (
                <p className="text-xs text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </section>

      {verificationType === "VIU" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jenis Impor (Multi-select)
          </h2>
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
            Field ini hanya berlaku untuk Application Type = VIU. Pilih satu
            atau lebih jenis impor sesuai dengan kegiatan impor yang diajukan.
            Dokumen pendukung di Step 6 akan disesuaikan otomatis berdasarkan
            pilihan ini. Multi-pilih diperbolehkan.
          </p>
          <Controller
            control={control}
            name="importTypes"
            render={({ field, fieldState }) => (
              <>
                <div className="flex flex-col gap-3">
                  {IMPORT_TYPES.map((type, index) => {
                    const option = IMPORT_TYPE_OPTIONS[type];
                    const isSelected = field.value?.includes(type) ?? false;
                    return (
                      <SelectableCard
                        key={type}
                        selected={isSelected}
                        onSelect={() => {
                          const current = field.value ?? [];
                          const next = isSelected
                            ? current.filter((value) => value !== type)
                            : [...current, type];
                          field.onChange(next);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                            {index + 1}
                          </span>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold">
                              {option.title}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {option.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                                {option.docCount}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </SelectableCard>
                    );
                  })}
                </div>
                {fieldState.error && (
                  <p className="text-xs text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </section>
      )}
    </div>
  );
}
