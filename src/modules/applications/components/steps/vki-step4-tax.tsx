"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { Banknote, CalendarClock, FileCheck2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/form/native-select";
import { FileUploadField } from "@/components/form/file-upload-field";
import { DocumentPreview } from "../document-preview";
import { COMPANY_AGES, TAX_PROOF_TYPES, TAX_PROOF_TYPE_LABELS, createEmptyTaxProofs, type TaxProofType } from "@/modules/company/schema";
import { COMPANY_AGE_LABELS, deriveCompanyAge } from "../../company-age";
import type { ApplicationWizardValues } from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] font-semibold text-muted-foreground">{children}</div>;
}

/**
 * VKI Step 4 — NPWP (read-only from the company) and Umur Perizinan Berusaha with its tax evidence
 * (Pasal 30 ayat (2) huruf b angka 7): bukti pembayaran pajak 3 tahun terakhir, or SKT when the
 * Perizinan Berusaha is younger than 3 years. Prefilled from the company profile; the applicant
 * chooses/completes it here when the profile doesn't have it (e.g. API-P companies are never asked
 * there). The age defaults to what the NIB's issue date implies.
 */
export function VkiStep4Tax({ form }: Props) {
  const { control, register, setValue, getValues } = form;
  const companyAge = useWatch({ control, name: "companyAge" });
  const nibIssueDate = useWatch({ control, name: "nibIssueDate" });
  const submissionDate = useWatch({ control, name: "submissionDate" });
  const { fields: taxFields, replace } = useFieldArray({ control, name: "taxProofs" });
  const taxProofs = useWatch({ control, name: "taxProofs" }) ?? [];
  const suggested = deriveCompanyAge(nibIssueDate, submissionDate || new Date());

  // Default the age from the NIB date when neither the company profile nor the applicant stated it.
  useEffect(() => {
    if (!getValues("companyAge") && suggested) setValue("companyAge", suggested, { shouldDirty: true });
  }, [suggested, getValues, setValue]);

  // Bukti pajak 3 tahun: one row per year, starting from the last three years.
  useEffect(() => {
    if (companyAge === "OVER_3" && (getValues("taxProofs") ?? []).length === 0) replace(createEmptyTaxProofs());
  }, [companyAge, getValues, replace]);

  const values = getValues();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Data pajak diambil dari data perusahaan terdaftar. Lengkapi Umur Perizinan Berusaha dan dokumen pajaknya bila belum tersedia.
      </p>
      <div className="rounded-xl border border-border p-4.5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Banknote className="size-4.5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold">NPWP</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Nomor Pokok Wajib Pajak perusahaan</div>
          </div>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_180px]">
          <div>
            <div className="text-[11px] text-muted-foreground">Nomor NPWP</div>
            <div className="mt-0.5 text-sm font-semibold">{values.npwpNumber || "-"}</div>
          </div>
          <DocumentPreview path={values.npwpDocumentPath} label="NPWP" />
        </div>
      </div>

      <div className="rounded-xl border border-border p-4.5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <CalendarClock className="size-4.5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold">
              Umur Perizinan Berusaha <span className="text-destructive">*</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Menentukan bukti perpajakan yang dilampirkan (Pasal 30 ayat (2) huruf b angka 7)
              {suggested && ` — berdasarkan tanggal terbit NIB: ${COMPANY_AGE_LABELS[suggested].label}`}
            </div>
          </div>
        </div>
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {COMPANY_AGES.map((age) => (
            <button
              key={age}
              type="button"
              onClick={() => setValue("companyAge", age, { shouldDirty: true, shouldValidate: true })}
              className={`rounded-lg border p-3 text-left ${companyAge === age ? "border-primary bg-primary/10" : "border-border bg-background"}`}
            >
              <div className={`text-sm font-bold ${companyAge === age ? "text-primary" : ""}`}>{COMPANY_AGE_LABELS[age].label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{COMPANY_AGE_LABELS[age].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {companyAge === "UNDER_3" && (
        <div className="rounded-xl border border-border p-4.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileCheck2 className="size-4.5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold">Surat Keterangan Terdaftar (SKT) Pajak</div>
              <div className="mt-0.5 text-xs text-muted-foreground">Pengganti bukti pembayaran pajak 3 tahun terakhir — Perizinan Berusaha kurang dari 3 tahun</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Nomor Surat</Label>
              <Input placeholder="Contoh: S-12345KT/WPJ.01/2024" {...register("sktNumber")} />
            </div>
            <div>
              <Label>Lembaga Penerbit</Label>
              <Input placeholder="Contoh: KPP Pratama Jakarta Setiabudi Tiga" {...register("sktIssuer")} />
            </div>
            <div>
              <Label>Tanggal Diterbitkan</Label>
              <Input type="date" {...register("sktDate")} />
            </div>
          </div>
          <div className="mt-3">
            <Controller
              control={control}
              name="sktDocumentPath"
              render={({ field }) => <FileUploadField namespace="documents" value={field.value} onChange={field.onChange} label="Upload SKT" hint="Format: PDF" />}
            />
          </div>
        </div>
      )}

      {companyAge === "OVER_3" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir</p>
          {taxFields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-border p-4.5">
              <div className="mb-3 text-sm font-bold">Tahun Pajak {taxProofs[index]?.year}</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Jenis Bukti</Label>
                  <NativeSelect
                    value={taxProofs[index]?.type ?? ""}
                    onChange={(e) => setValue(`taxProofs.${index}.type`, (e.target.value || null) as TaxProofType | null, { shouldDirty: true })}
                  >
                    <option value="">— Pilih —</option>
                    {TAX_PROOF_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TAX_PROOF_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label>Nomor</Label>
                  <Input placeholder="Nomor dokumen" {...register(`taxProofs.${index}.nomor`)} />
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" {...register(`taxProofs.${index}.tanggal`)} />
                </div>
              </div>
              <div className="mt-3">
                <Controller
                  control={control}
                  name={`taxProofs.${index}.docPath`}
                  render={({ field: f }) => <FileUploadField namespace="documents" value={f.value} onChange={f.onChange} label="Upload Bukti Pajak" hint="Format: PDF" />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
