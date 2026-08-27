"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { FileUploadField } from "@/components/form/file-upload-field";
import { SearchSelectInput, type SearchSelectOption } from "@/components/form/search-select-input";
import {
  adminPartnerFormSchema,
  PARTNER_TYPES,
  PARTNER_TYPE_LABELS,
  type AdminPartnerFormValues,
} from "../schema";

type CompanyOption = { id: string; companyName: string; apiType: string | null };

function useCompanyOptions() {
  return useQuery({
    queryKey: ["companies", "all"],
    queryFn: async () => {
      const response = await fetch("/api/companies");
      if (!response.ok) throw new Error("Gagal memuat data perusahaan");
      const json = (await response.json()) as { data: CompanyOption[] };
      return json.data;
    },
  });
}

type PartnerDetailData = {
  id: string;
  companyId: string;
  type: (typeof PARTNER_TYPES)[number];
  contractNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  contractDocumentPath: string | null;
  company: { companyName: string };
  relatedCompanies: { id: string; companyName: string }[];
};

function usePartner(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partners", "detail", partnerId],
    queryFn: async () => {
      const response = await fetch(`/api/partners/${partnerId}`);
      if (!response.ok) throw new Error("Partner tidak ditemukan");
      const json = (await response.json()) as { data: PartnerDetailData };
      return json.data;
    },
    enabled: Boolean(partnerId),
  });
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-[13px] font-bold text-[#20180f]">
      {children} {required && <span className="text-[#e0662e]">*</span>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border-none bg-[#f7f2ec] px-3.5 py-2.75 text-[13px] text-[#20180f] outline-none placeholder:text-[#a68f80]";

type Props = {
  /** When set, the form edits that existing Partner instead of creating a new one. The mitra's
   * own identity (companyId) is shown read-only and never changes on edit. */
  partnerId?: string;
};

/**
 * Admin's simplified "Tambah/Edit Partner" — one page, no wizard, no NIB/NPWP/SK sync. Replaced
 * the old 3-step PartnerWizard (which mirrored Company Workspace's identity-verification flow,
 * not needed here since admin already has the full Company directory to search directly).
 */
export function PartnerForm({ partnerId }: Props) {
  const router = useRouter();
  const isEditing = Boolean(partnerId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: companies, isLoading: isLoadingCompanies } = useCompanyOptions();
  const { data: existingPartner, isLoading: isLoadingPartner } = usePartner(partnerId);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdminPartnerFormValues>({
    resolver: zodResolver(adminPartnerFormSchema),
    mode: "onBlur",
    defaultValues: { companyId: "", relatedCompanyIds: [] },
  });

  useEffect(() => {
    if (!existingPartner) return;
    reset({
      companyId: existingPartner.companyId,
      companyName: existingPartner.company.companyName,
      type: existingPartner.type,
      contractNumber: existingPartner.contractNumber,
      contractStartDate: existingPartner.contractStartDate.slice(0, 10),
      contractEndDate: existingPartner.contractEndDate.slice(0, 10),
      contractDocumentPath: existingPartner.contractDocumentPath ?? "",
      relatedCompanyIds: existingPartner.relatedCompanies.map((c) => c.id),
    });
  }, [existingPartner, reset]);

  const type = useWatch({ control, name: "type" });
  const companyName = useWatch({ control, name: "companyName" });
  const companyOptions: SearchSelectOption[] = (companies ?? []).map((c) => ({ value: c.id, label: c.companyName }));
  const apiUCompanies = (companies ?? []).filter((c) => c.apiType === "API-U");

  async function onSubmit(values: AdminPartnerFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch(isEditing ? `/api/partners/${partnerId}` : "/api/partners", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal menyimpan partner");
      }
      const { data } = await response.json();
      toast.success(isEditing ? "Partner berhasil diperbarui." : `Partner "${values.companyName}" berhasil ditambahkan.`);
      router.push(`/partners/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan partner");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isEditing && isLoadingPartner) {
    return (
      <div className="min-h-full bg-[#fbeee5] p-7">
        <p className="text-[13px] text-[#8a7565]">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mx-auto max-w-190">
        <div className="mb-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push(isEditing ? `/partners/${partnerId}` : "/partners")}
            className="text-[20px] text-[#a68f80]"
          >
            ←
          </button>
          <div className="text-[20px] font-extrabold text-[#2b2420]">
            {isEditing ? "Edit Partner" : "Tambah Partner"}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 rounded-[14px] border border-[#f0ded0] bg-white p-6.5"
        >
          <div>
            <FieldLabel required>Perusahaan Partner</FieldLabel>
            {isEditing ? (
              <div className="rounded-lg border border-[#efe2d4] bg-[#f7f2ec] px-3.5 py-2.75 text-[13px] font-semibold text-[#20180f]">
                {companyName}
              </div>
            ) : (
              <>
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <SearchSelectInput
                      value={field.value}
                      onChange={field.onChange}
                      options={companyOptions}
                      allowFreeText={false}
                      placeholder={isLoadingCompanies ? "Memuat perusahaan..." : "Cari nama perusahaan..."}
                      onSelectOption={(option) => setValue("companyName", option.label)}
                    />
                  )}
                />
                {errors.companyId && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.companyId.message}</p>}
                <a
                  href="/company/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[12.5px] font-semibold text-[#c14a1f]"
                >
                  + Tambah Perusahaan
                </a>
                <p className="mt-0.5 text-[11px] text-[#a68f80]">
                  Belum ada di daftar? Buat perusahaan baru — form terbuka di tab baru, isian di sini tetap
                  tersimpan. Setelah tersimpan, cari lagi namanya di sini.
                </p>
              </>
            )}
          </div>

          <div>
            <FieldLabel required>Jenis Partner</FieldLabel>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2.5">
                  {PARTNER_TYPES.map((option) => {
                    const selected = type === option;
                    return (
                      <div
                        key={option}
                        onClick={() => field.onChange(option)}
                        className="flex cursor-pointer items-center justify-between rounded-[9px] border-[1.5px] p-3"
                        style={{
                          borderColor: selected ? "#e0662e" : "#e1d8cc",
                          background: selected ? "#fdeadd" : "#fff",
                        }}
                      >
                        <span className="text-[12.5px] font-bold" style={{ color: selected ? "#c14a1f" : "#20180f" }}>
                          {PARTNER_TYPE_LABELS[option]}
                        </span>
                        {selected && <span className="text-[16px] text-[#e0662e]">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.type && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.type.message}</p>}
          </div>

          <div>
            <FieldLabel required>Nomor Kontrak</FieldLabel>
            <input className={inputClass} placeholder="Contoh: 012/MoU/2026" {...register("contractNumber")} />
            {errors.contractNumber && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.contractNumber.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel required>Tanggal Mulai</FieldLabel>
              <input type="date" className={inputClass} {...register("contractStartDate")} />
              {errors.contractStartDate && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors.contractStartDate.message}</p>
              )}
            </div>
            <div>
              <FieldLabel required>Tanggal Berakhir</FieldLabel>
              <input type="date" className={inputClass} {...register("contractEndDate")} />
              {errors.contractEndDate && (
                <p className="mt-1 text-xs text-[#ba1a1a]">{errors.contractEndDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <FieldLabel>Bukti Kontrak</FieldLabel>
            <Controller
              control={control}
              name="contractDocumentPath"
              render={({ field }) => (
                <FileUploadField
                  namespace="documents"
                  value={field.value}
                  onChange={field.onChange}
                  label="Upload Bukti Kontrak"
                  accept=".pdf,application/pdf"
                />
              )}
            />
          </div>

          <div>
            <FieldLabel>Perusahaan API-U Terkait</FieldLabel>
            <p className="mb-2.5 text-[11.5px] text-[#8a7565]">
              Aktifkan perusahaan API-U yang menjadi mitra kontrak partner ini. Opsional — bisa ditambahkan atau
              diubah lagi nanti.
            </p>
            <Controller
              control={control}
              name="relatedCompanyIds"
              render={({ field }) => {
                const selected = field.value ?? [];
                function toggle(id: string, checked: boolean) {
                  field.onChange(checked ? [...selected, id] : selected.filter((v) => v !== id));
                }
                return (
                  <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-[#e8dccd] p-3">
                    {isLoadingCompanies && <p className="text-[12.5px] text-[#8a7565]">Memuat perusahaan API-U...</p>}
                    {!isLoadingCompanies && apiUCompanies.length === 0 && (
                      <p className="text-[12.5px] text-[#8a7565]">Belum ada perusahaan dengan Jenis API API-U.</p>
                    )}
                    {apiUCompanies.map((company) => (
                      <label
                        key={company.id}
                        className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold text-[#20180f]"
                      >
                        <Checkbox
                          checked={selected.includes(company.id)}
                          onCheckedChange={(checked) => toggle(company.id, checked === true)}
                        />
                        {company.companyName}
                      </label>
                    ))}
                  </div>
                );
              }}
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-[#f0ded0] pt-4">
            <button
              type="button"
              onClick={() => router.push(isEditing ? `/partners/${partnerId}` : "/partners")}
              disabled={isSubmitting}
              className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-40"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
