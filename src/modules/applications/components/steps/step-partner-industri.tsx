"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Building2, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { DocumentPreview } from "../document-preview";
import { usePartnerIndustriOptions } from "../../hooks/use-partner-industri-options";
import type { ApplicationWizardValues, PartnerIndustriEntryValues } from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

/**
 * Only relevant for "Impor Bahan Baku dan/atau Penolong — Perusahaan Industri" (importTypes
 * includes BAHAN_BAKU_INDUSTRI). One card per registered Partner Industri, each with its own
 * on/off toggle — an application can involve more than one partner industri at once, so this
 * is a multi-select via `partnerIndustriEntries`, not a single pick. Split out of
 * Step5SupportDocument into its own step, mirroring how VKI's Legal/Tax/Location each get a
 * dedicated step rather than one combined page.
 */
export function StepPartnerIndustri({ form }: Props) {
  const { control, formState } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];
  const {
    data: partnerOptions,
    isLoading: isPartnerLoading,
    isError: isPartnerError,
  } = usePartnerIndustriOptions();

  const hasIndustri = importTypes.includes("BAHAN_BAKU_INDUSTRI");

  if (!hasIndustri) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Step ini hanya berlaku untuk Jenis Impor &quot;Bahan Baku dan/atau Penolong — Perusahaan Industri&quot;.
        Tidak ada jenis impor tersebut yang dipilih di Step 2, sehingga tidak ada partner industri yang perlu
        ditambahkan di step ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        Impor Bahan Baku dan/atau Penolong — Perusahaan Industri (API-U) mensyaratkan partner industri tujuan yang
        terdaftar di modul Partner Management. Aplikasi ini bisa melibatkan lebih dari satu partner industri —
        aktifkan toggle pada setiap partner yang relevan.
      </p>

      <a
        href="/partners/new"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline" }), "self-start")}
      >
        <Plus className="size-4" />
        Tambah Partner
      </a>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        Form terbuka di tab baru, progress permohonan ini tetap tersimpan. Setelah partner tersimpan, kembali ke tab
        ini dan daftar akan otomatis diperbarui.
      </p>

      {isPartnerError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          Gagal memuat data Partner Industri. Pastikan database sudah terhubung.
        </p>
      )}
      {isPartnerLoading && <p className="text-xs text-muted-foreground">Memuat data partner...</p>}

      {!isPartnerLoading && !isPartnerError && partnerOptions?.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Belum ada Partner Industri terdaftar. Klik &quot;Tambah Partner&quot; di atas untuk mendaftarkan yang baru.
        </p>
      )}

      {formState.errors.partnerIndustriEntries?.message && (
        <p className="text-xs text-destructive">{formState.errors.partnerIndustriEntries.message as string}</p>
      )}

      {!isPartnerLoading && !isPartnerError && partnerOptions && partnerOptions.length > 0 && (
        <Controller
          control={control}
          name="partnerIndustriEntries"
          render={({ field }) => {
            const entries = (field.value as PartnerIndustriEntryValues[] | undefined) ?? [];

            function entryFor(partnerId: string) {
              return entries.find((entry) => entry.partnerId === partnerId);
            }

            function handleToggle(partnerId: string, checked: boolean) {
              const index = entries.findIndex((entry) => entry.partnerId === partnerId);
              if (index === -1) {
                field.onChange([...entries, { partnerId, enabled: checked, lhvki: "", lhvkiDocumentPath: "" }]);
                return;
              }
              field.onChange(entries.map((entry, i) => (i === index ? { ...entry, enabled: checked } : entry)));
            }

            function updateEntry(partnerId: string, patch: Partial<PartnerIndustriEntryValues>) {
              field.onChange(entries.map((entry) => (entry.partnerId === partnerId ? { ...entry, ...patch } : entry)));
            }

            return (
              <div className="flex flex-col gap-3">
                {partnerOptions.map((option) => {
                  const entry = entryFor(option.id);
                  const enabled = entry?.enabled ?? false;
                  return (
                    <div key={option.id} className="rounded-xl border border-border p-4.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Building2 className="size-4.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{option.name}</div>
                            <div className="text-xs text-muted-foreground">NIB: {option.nibNumber || "-"}</div>
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handleToggle(option.id, checked)}
                          aria-label={`Aktifkan ${option.name} sebagai partner industri`}
                        />
                      </div>

                      <div className="mt-4">
                        <div className="text-[11px] text-muted-foreground">Dokumen NIB</div>
                        <div className="mt-1 max-w-40">
                          <DocumentPreview path={option.nibDocumentPath} label={`NIB ${option.name}`} />
                        </div>
                      </div>

                      {enabled && (
                        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                          <FormField label="LHVKI" hint="Isi manual nomor LHVKI perusahaan industri terkait.">
                            <Input
                              value={entry?.lhvki ?? ""}
                              onChange={(event) => updateEntry(option.id, { lhvki: event.target.value })}
                            />
                          </FormField>
                          <FormField label="Upload Dokumen LHVKI" hint="Format: PDF, JPG, PNG · Klik untuk upload">
                            <FileUploadField
                              namespace="temporary"
                              value={entry?.lhvkiDocumentPath}
                              onChange={(path) => updateEntry(option.id, { lhvkiDocumentPath: path ?? "" })}
                              label="Dokumen LHVKI"
                            />
                          </FormField>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
