"use client";

import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createEmptyApplicationBrand, type ApplicationWizardValues } from "../../../schema";
import { useApplicationBrandOptions, type ApplicationBrandOption } from "../../../hooks/use-application-brand-options";
import { useBrandApplicationDetail } from "../../../hooks/use-brand-application-detail";
import type { BrandApplicationReadiness } from "../../../viu-brand-relationship-rules";
import { BrandStepSummary } from "./brand-step-summary";
import { SelectBrandDialog } from "./select-brand-dialog";
import { AddBrandLauncher } from "./add-brand-launcher";
import { ApplicationBrandRow } from "./application-brand-row";

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  /** Company Workspace vs generic/admin wizard entry point — same split as
   * MerkSurface, decides which Brand detail endpoint this step reads from. */
  apiBase: "/api/company-workspace/brands" | "/api/merk";
  brandDetailHrefBase: string;
  applicationNumber?: string;
};

type BrandEntry = ApplicationWizardValues["applicationBrands"][number];

const TABLE_COLUMNS = [
  "Merek",
  "Pemilik Merek",
  "Bukti Merek",
  "Peran Pemohon",
  "Perwakilan Resmi",
  "Dokumen Hubungan",
  "Status Kesiapan",
  "Aksi",
];

/** One row's readiness, computed the exact same way `ApplicationBrandRow`
 * computes its own (same hook, same cached brand-detail query) — reported up
 * to the parent's readinessMap via `onChange` so the 4 summary metrics and
 * the Continue-rule warning below never disagree with what each row
 * actually shows.
 *
 * Rendered once per entry as its own component instance (not called as a
 * hook inside a `.map()` in the parent) — `entries.length` changes on every
 * add/remove, and calling a variable number of hooks in one component
 * violates the Rules of Hooks. Mounting/unmounting a component per array
 * item is what React actually supports for a per-item hook. */
function RowReadinessTracker({
  apiBase,
  entry,
  onChange,
}: {
  apiBase: string;
  entry: BrandEntry;
  onChange: (brandId: string, readiness: BrandApplicationReadiness) => void;
}) {
  const { requirements } = useBrandApplicationDetail(apiBase, entry.brandId, {
    applicantRole: entry.applicantRole ?? null,
    appointmentSource: entry.appointmentSource ?? null,
    officialRepresentativeCompanyId: entry.officialRepresentativeCompanyId ?? null,
  });
  const readiness = requirements?.readiness ?? "NOT_ELIGIBLE";

  useEffect(() => {
    onChange(entry.brandId, readiness);
  }, [entry.brandId, readiness, onChange]);

  return null;
}

/**
 * Step "Merek yang Digunakan" — only relevant when Jenis Impor (Step 2)
 * includes BARANG_KONSUMSI, mirroring how StepPartnerIndustri gates itself
 * on BAHAN_BAKU_INDUSTRI. Orchestrates brand selection/creation and hands
 * each selected Brand's relationship configuration to its own row — all
 * regulatory logic lives in viu-brand-relationship-rules.ts, never here.
 */
export function StepBrandsUsed({ form, apiBase, brandDetailHrefBase, applicationNumber }: Props) {
  const { control } = form;
  const importTypes = useWatch({ control, name: "importTypes" }) ?? [];
  const { fields, append, remove } = useFieldArray({ control, name: "applicationBrands" });
  const entries = useWatch({ control, name: "applicationBrands" }) ?? [];
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  // Admin (generic wizard entry point) sees every registered Brand, not just
  // the applying company's own — see useApplicationBrandOptions.
  const isAdminSurface = apiBase === "/api/merk";

  const { data: brandOptions } = useApplicationBrandOptions();
  // Plain (not memoized): `entries` is already a fresh array from useWatch
  // every render, so memoizing on it buys nothing and only trips
  // exhaustive-deps — building this Set is cheap for a per-application
  // brand list.
  const selectedBrandIds = new Set(entries.map((e) => e.brandId));

  // Keyed by brandId, filled in by each entry's own <RowReadinessTracker>
  // instance (see its own comment on why this isn't a hook called in a
  // `.map()` here instead).
  const [readinessMap, setReadinessMap] = useState<Record<string, BrandApplicationReadiness>>({});
  const handleReadinessChange = useCallback((brandId: string, readiness: BrandApplicationReadiness) => {
    setReadinessMap((prev) => (prev[brandId] === readiness ? prev : { ...prev, [brandId]: readiness }));
  }, []);
  const readinessList = entries.map((entry) => readinessMap[entry.brandId] ?? "NOT_ELIGIBLE");

  if (!importTypes.includes("BARANG_KONSUMSI")) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Step ini hanya berlaku untuk Jenis Impor &quot;Barang Konsumsi&quot;. Tidak ada jenis impor
        tersebut yang dipilih di Step 2, sehingga tidak ada merek yang perlu ditentukan di step ini.
      </p>
    );
  }

  function handleSelectBrand(brand: ApplicationBrandOption) {
    append(createEmptyApplicationBrand(brand.id));
    setIsSelectOpen(false);
    toast.success(`${brand.brandName} ditambahkan ke permohonan.`);
  }

  function handleBrandCreated(brandId: string) {
    append(createEmptyApplicationBrand(brandId));
    toast.success("Merek baru berhasil ditambahkan ke permohonan.");
  }

  function handleBrandSavedAsDraft() {
    toast.info(
      "Merek disimpan sebagai draft di Brand Management. Lanjutkan pengisian merek dari sana sebelum dapat digunakan di permohonan ini.",
    );
  }

  const readyCount = readinessList.filter((r) => r === "READY").length;
  const incompleteCount = readinessList.filter((r) => r === "INCOMPLETE").length;
  const notEligibleCount = readinessList.filter((r) => r === "NOT_ELIGIBLE").length;

  return (
    <div className="flex flex-col gap-5">
      {entries.map((entry) => (
        <RowReadinessTracker key={entry.brandId} apiBase={apiBase} entry={entry} onChange={handleReadinessChange} />
      ))}

      <div>
        <h2 className="text-lg font-bold">Merek yang Digunakan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih atau tambahkan merek yang akan digunakan dalam permohonan VIU Barang Konsumsi dan
          tentukan hubungan hukum antara merek dengan perusahaan pemohon.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button type="button" onClick={() => setIsSelectOpen(true)}>+ Pilih Merek</Button>
        <AddBrandLauncher
          applicationNumber={applicationNumber}
          onBrandCreated={handleBrandCreated}
          onBrandSavedAsDraft={handleBrandSavedAsDraft}
        />
      </div>

      <BrandStepSummary
        totalCount={entries.length}
        readyCount={readyCount}
        incompleteCount={incompleteCount}
        notEligibleCount={notEligibleCount}
      />

      {form.formState.errors.applicationBrands?.message && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {form.formState.errors.applicationBrands.message}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold">Belum ada merek yang dipilih</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Gunakan &quot;+ Pilih Merek&quot; untuk memilih dari Brand Management, atau &quot;+ Tambah
            Merek Baru&quot; apabila merek belum terdaftar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-240 text-left">
            <thead className="bg-muted/40">
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th key={col} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <ApplicationBrandRow
                  key={field.id}
                  form={form}
                  index={index}
                  apiBase={apiBase}
                  brandDetailHrefBase={brandDetailHrefBase}
                  onRemoved={() => remove(index)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(incompleteCount > 0 || notEligibleCount > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <div>
            {incompleteCount > 0 && (
              <p>
                {incompleteCount} merek masih perlu dilengkapi. Anda dapat melanjutkan pengisian
                permohonan, namun permohonan tidak dapat disubmit sebelum seluruh dokumen wajib
                lengkap.
              </p>
            )}
            {notEligibleCount > 0 && (
              <p className="mt-1 font-semibold text-destructive">
                {notEligibleCount} merek tidak dapat digunakan pada permohonan ini. Perbaiki
                hubungan merek tersebut atau hapus dari permohonan sebelum submit.
              </p>
            )}
          </div>
        </div>
      )}

      {brandOptions?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {isAdminSurface
            ? "Belum ada merek terdaftar di Brand Management."
            : "Belum ada merek terdaftar untuk perusahaan ini di Brand Management."}
        </p>
      )}

      {isSelectOpen && (
        <SelectBrandDialog
          isAdminSurface={isAdminSurface}
          selectedBrandIds={selectedBrandIds}
          onClose={() => setIsSelectOpen(false)}
          onSelect={handleSelectBrand}
        />
      )}
    </div>
  );
}
