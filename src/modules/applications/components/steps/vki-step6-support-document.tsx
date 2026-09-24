"use client";

import { useState } from "react";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown, ChevronUp, CheckCircle2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploadField } from "@/components/form/file-upload-field";
import {
  VKI_SUPPORT_DOC_DEFS,
  createEmptyElectricityMonth,
  createEmptyTenagaKerja,
  type ApplicationWizardValues,
  type VkiSupportDocDef,
} from "../../schema";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

function RegularDocBody({ form, index }: { form: UseFormReturn<ApplicationWizardValues>; index: number }) {
  const { control, register } = form;
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Nomor Surat</div>
        <Input placeholder="Contoh: 001/SP/2026" {...register(`vkiSupportDocs.${index}.nomorSurat`)} />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Tanggal Dibuat</div>
          <Input type="date" {...register(`vkiSupportDocs.${index}.tanggal`)} />
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Nama yang Bertanda Tangan</div>
          <Input placeholder="Nama lengkap" {...register(`vkiSupportDocs.${index}.penandatangan`)} />
        </div>
      </div>
      <Controller
        control={control}
        name={`vkiSupportDocs.${index}.documentPath`}
        render={({ field }) => (
          <FileUploadField namespace="documents" value={field.value} onChange={field.onChange} label="Upload Dokumen" hint="Format: PDF" />
        )}
      />
    </div>
  );
}

function ElectricityBody({ form }: { form: UseFormReturn<ApplicationWizardValues> }) {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "electricityMonths" });

  return (
    <div className="flex flex-col gap-3.5">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-lg border border-border p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-xs font-bold">Bulan {index + 1}</div>
            <button type="button" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Bulan</div>
              <Input type="month" {...register(`electricityMonths.${index}.bulan`)} />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">KWh yang Dipakai</div>
              <Input placeholder="Contoh: 1250" {...register(`electricityMonths.${index}.kwh`)} />
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Nominal Pembayaran</div>
            <Input placeholder="Contoh: Rp 2.500.000" {...register(`electricityMonths.${index}.nominal`)} />
          </div>
          <div className="mt-3">
            <Controller
              control={control}
              name={`electricityMonths.${index}.documentPath`}
              render={({ field: f }) => (
                <FileUploadField namespace="documents" value={f.value} onChange={f.onChange} label="Upload Bukti Pembayaran" hint="Format: PDF" />
              )}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptyElectricityMonth() as any)}
      >
        + Tambah Bulan
      </Button>
    </div>
  );
}

function TenagaKerjaBody({ form }: { form: UseFormReturn<ApplicationWizardValues> }) {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "tenagaKerjaEntries" });

  return (
    <div className="flex flex-col gap-3.5">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-lg border border-border p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="text-xs font-bold">Kategori {index + 1}</div>
            <button type="button" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Kategori</div>
              <Input placeholder="Contoh: Produksi, Kantor" {...register(`tenagaKerjaEntries.${index}.kategori`)} />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Jumlah Tenaga Kerja</div>
              <Input placeholder="Contoh: 45" {...register(`tenagaKerjaEntries.${index}.jumlah`)} />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptyTenagaKerja() as any)}
      >
        + Tambah Kategori
      </Button>
      <Controller
        control={control}
        name="tenagaKerjaDocumentPath"
        render={({ field }) => (
          <FileUploadField namespace="documents" value={field.value} onChange={field.onChange} label="Upload Dokumen" hint="Format: PDF" />
        )}
      />
    </div>
  );
}

function DocCard({ def, index, form }: { def: VkiSupportDocDef; index: number; form: UseFormReturn<ApplicationWizardValues> }) {
  const [open, setOpen] = useState(false);
  const doc = useWatch({ control: form.control, name: `vkiSupportDocs.${index}` });
  const electricityMonths = useWatch({ control: form.control, name: "electricityMonths" });
  const tenagaKerjaEntries = useWatch({ control: form.control, name: "tenagaKerjaEntries" });

  const isFilled =
    def.type === "regular"
      ? Boolean(doc?.nomorSurat && doc?.documentPath)
      : def.type === "electricity"
        ? (electricityMonths ?? []).length > 0
        : (tenagaKerjaEntries ?? []).length > 0;

  return (
    <div className={`overflow-hidden rounded-xl border ${isFilled ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3.5 px-4.5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          {isFilled && <CheckCircle2 className="size-4.5 shrink-0 text-primary" />}
          <div>
            <div className="text-sm font-bold">{def.title}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{def.desc}</div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border bg-background p-4.5">
          {def.type === "regular" && <RegularDocBody form={form} index={index} />}
          {def.type === "electricity" && <ElectricityBody form={form} />}
          {def.type === "tenagaKerja" && <TenagaKerjaBody form={form} />}
        </div>
      )}
    </div>
  );
}

export function VkiStep6SupportDocument({ form }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-bold">Support Document</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Dokumen pendukung wajib untuk pengajuan VKI (Verifikasi Kemampuan Industri).
        </p>
      </div>

      {VKI_SUPPORT_DOC_DEFS.map((def, index) => (
        <DocCard key={def.key} def={def} index={index} form={form} />
      ))}
    </div>
  );
}
