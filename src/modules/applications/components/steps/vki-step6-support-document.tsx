"use client";

import { useEffect, useState } from "react";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown, ChevronUp, CheckCircle2, History, Landmark, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploadField } from "@/components/form/file-upload-field";
import {
  VKI_SUPPORT_DOC_DEFS,
  createEmptyElectricityMonth,
  createEmptyLhvkiHistory,
  FASILITAS_LABELS,
  FASILITAS_VALUES,
  KITE_JENIS_LABELS,
  KITE_JENIS_VALUES,
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

/** Gambar alur proses — a plain upload (no nomor surat). */
function UploadOnlyBody({ form, index }: { form: UseFormReturn<ApplicationWizardValues>; index: number }) {
  return (
    <Controller
      control={form.control}
      name={`vkiSupportDocs.${index}.documentPath`}
      render={({ field }) => <FileUploadField namespace="documents" value={field.value} onChange={field.onChange} label="Upload Dokumen" hint="Format: PDF / JPG / PNG" />}
    />
  );
}

/** Memiliki/menguasai gudang — which warehouses are declared (Ada/Tidak ada per gudang), plus the surat itself. */
function GudangBody({ form, index }: { form: UseFormReturn<ApplicationWizardValues>; index: number }) {
  const doc = useWatch({ control: form.control, name: `vkiSupportDocs.${index}` });
  const rows = [
    { field: "gudangBahanBaku" as const, label: "Gudang bahan baku dan/atau bahan penolong" },
    { field: "gudangHasilProduksi" as const, label: "Gudang barang jadi / hasil produksi" },
  ];
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-muted-foreground">Gudang yang dimiliki/dikuasai</div>
        {rows.map((r) => {
          const value = doc?.[r.field];
          return (
            <div key={r.field} className="flex flex-wrap items-center gap-2">
              <span className="min-w-64 text-xs">{r.label}</span>
              {[
                { v: true, label: "Ada" },
                { v: false, label: "Tidak ada" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => form.setValue(`vkiSupportDocs.${index}.${r.field}`, o.v, { shouldDirty: true })}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${
                    value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <RegularDocBody form={form} index={index} />
    </div>
  );
}

/** Unit pengolahan limbah — milik sendiri or kerja sama (then also the cooperation contract). */
function LimbahBody({ form, index }: { form: UseFormReturn<ApplicationWizardValues>; index: number }) {
  const opsi = useWatch({ control: form.control, name: `vkiSupportDocs.${index}.opsi` });
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Status Unit Pengolahan Limbah</div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "MILIK_SENDIRI", label: "Memiliki unit pengolahan limbah sendiri" },
            { value: "KERJA_SAMA", label: "Bekerja sama dengan pihak lain" },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => form.setValue(`vkiSupportDocs.${index}.opsi`, o.value, { shouldDirty: true })}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${
                opsi === o.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <RegularDocBody form={form} index={index} />
      {opsi === "KERJA_SAMA" && (
        <Controller
          control={form.control}
          name={`vkiSupportDocs.${index}.kontrakDocumentPath`}
          render={({ field }) => (
            <FileUploadField namespace="documents" value={field.value} onChange={field.onChange} label="Upload Kontrak Kerja Sama Pengolahan Limbah" hint="Format: PDF" />
          )}
        />
      )}
    </div>
  );
}

function DocCard({ def, index, form }: { def: VkiSupportDocDef; index: number; form: UseFormReturn<ApplicationWizardValues> }) {
  const [open, setOpen] = useState(false);
  const doc = useWatch({ control: form.control, name: `vkiSupportDocs.${index}` });
  const electricityMonths = useWatch({ control: form.control, name: "electricityMonths" });
  const tenagaKerjaEntries = useWatch({ control: form.control, name: "tenagaKerjaEntries" });

  const isFilled =
    def.type === "regular" || def.type === "limbah"
      ? Boolean(doc?.nomorSurat && doc?.documentPath)
      : def.type === "upload"
        ? Boolean(doc?.documentPath)
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
          {def.type === "regular" && (def.key === "memiliki-menguasai" ? <GudangBody form={form} index={index} /> : <RegularDocBody form={form} index={index} />)}
          {def.type === "limbah" && <LimbahBody form={form} index={index} />}
          {def.type === "upload" && <UploadOnlyBody form={form} index={index} />}
          {def.type === "electricity" && <ElectricityBody form={form} />}
          {def.type === "tenagaKerja" && <TenagaKerjaBody form={form} />}
        </div>
      )}
    </div>
  );
}

export function VkiStep6SupportDocument({ form }: Props) {
  // Entries are matched by key, not by position — drafts saved before a document type was added
  // get the missing entries appended, so no card ever shows another document's data.
  const docs = useWatch({ control: form.control, name: "vkiSupportDocs" }) ?? [];
  useEffect(() => {
    const current = form.getValues("vkiSupportDocs") ?? [];
    const missing = VKI_SUPPORT_DOC_DEFS.filter((def) => !current.some((d) => d.key === def.key));
    if (missing.length) form.setValue("vkiSupportDocs", [...current, ...missing.map((def) => ({ key: def.key }))]);
  }, [form]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-bold">Support Document</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Dokumen pendukung wajib untuk pengajuan VKI (Verifikasi Kemampuan Industri).
        </p>
      </div>

      <FasilitasCard form={form} />

      {VKI_SUPPORT_DOC_DEFS.map((def) => {
        const index = docs.findIndex((d) => d.key === def.key);
        return index < 0 ? null : <DocCard key={def.key} def={def} index={index} form={form} />;
      })}

      <LhvkiHistoryCard form={form} />
    </div>
  );
}

/** Rekam Jejak LHVKI — LHVKI the company already holds, with its document (Formulir Permohonan A.14). */
function LhvkiHistoryCard({ form }: { form: UseFormReturn<ApplicationWizardValues> }) {
  const { control, register, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lhvkiHistory" });
  const hasPrevious = useWatch({ control, name: "hasPreviousLhvki" }) ?? false;

  function choose(value: boolean) {
    setValue("hasPreviousLhvki", value, { shouldDirty: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (value && fields.length === 0) append(createEmptyLhvkiHistory() as any);
  }

  return (
    <div className={`rounded-xl border p-4.5 ${hasPrevious && fields.length > 0 ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="flex items-start gap-2.5">
        <History className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
        <div>
          <div className="text-sm font-bold">Rekam Jejak LHVKI</div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Laporan Hasil VKI (LHVKI) yang sudah dimiliki perusahaan sebelumnya, dari lembaga verifikasi mana pun.
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {[
          { value: true, label: "Pernah memiliki LHVKI" },
          { value: false, label: "Belum pernah" },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => choose(opt.value)}
            className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${
              hasPrevious === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {hasPrevious && (
        <div className="mt-4 flex flex-col gap-3.5">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border bg-background p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="text-xs font-bold">LHVKI {index + 1}</div>
                <button type="button" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Nomor LHVKI</div>
                  <Input placeholder="Contoh: 595/LHVKI/SI/IV/2026" {...register(`lhvkiHistory.${index}.nomor`)} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Lembaga Penerbit</div>
                  <Input placeholder="Contoh: PT Surveyor Indonesia" {...register(`lhvkiHistory.${index}.lembagaPenerbit`)} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Tanggal Terbit</div>
                  <Input type="date" {...register(`lhvkiHistory.${index}.tanggalTerbit`)} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Masa Berlaku (sampai)</div>
                  <Input type="date" {...register(`lhvkiHistory.${index}.masaBerlaku`)} />
                </div>
              </div>
              <div className="mt-3">
                <Controller
                  control={control}
                  name={`lhvkiHistory.${index}.documentPath`}
                  render={({ field: f }) => (
                    <FileUploadField namespace="documents" value={f.value} onChange={f.onChange} label="Upload Dokumen LHVKI" hint="Format: PDF" />
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
            onClick={() => append(createEmptyLhvkiHistory() as any)}
          >
            + Tambah LHVKI
          </Button>
        </div>
      )}
    </div>
  );
}

/** Fasilitas kepabeanan — Kawasan Berikat / KITE (Pembebasan, Pengembalian, IKM) with its SKEP, or Non Fasilitas. */
function FasilitasCard({ form }: { form: UseFormReturn<ApplicationWizardValues> }) {
  const { control, register, setValue } = form;
  const fasilitas = useWatch({ control, name: "fasilitas" });
  const kiteJenis = useWatch({ control, name: "kiteJenis" });
  const withSkep = fasilitas === "KAWASAN_BERIKAT" || fasilitas === "KITE";
  const chip = (active: boolean) =>
    `rounded-lg border px-3.5 py-1.5 text-xs font-semibold ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`;

  return (
    <div className={`rounded-xl border p-4.5 ${fasilitas ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="flex items-start gap-2.5">
        <Landmark className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
        <div>
          <div className="text-sm font-bold">Fasilitas Kepabeanan</div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Fasilitas yang dimiliki perusahaan: Kawasan Berikat, KITE, atau tidak memiliki fasilitas.</div>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {FASILITAS_VALUES.map((v) => (
          <button key={v} type="button" onClick={() => setValue("fasilitas", v, { shouldDirty: true })} className={chip(fasilitas === v)}>
            {FASILITAS_LABELS[v]}
          </button>
        ))}
      </div>
      {fasilitas === "KITE" && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Jenis KITE</div>
          <div className="flex flex-wrap gap-2">
            {KITE_JENIS_VALUES.map((v) => (
              <button key={v} type="button" onClick={() => setValue("kiteJenis", v, { shouldDirty: true })} className={chip(kiteJenis === v)}>
                {KITE_JENIS_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      )}
      {withSkep && (
        <div className="mt-3.5 flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Nomor SKEP</div>
              <Input placeholder="Contoh: KEP-123/WBC.08/2024" {...register("fasilitasSkepNumber")} />
            </div>
            <div>
              <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Tanggal SKEP</div>
              <Input type="date" {...register("fasilitasSkepDate")} />
            </div>
          </div>
          <Controller
            control={control}
            name="fasilitasSkepDocumentPath"
            render={({ field }) => <FileUploadField namespace="documents" value={field.value} onChange={field.onChange} label="Upload Dokumen SKEP" hint="Format: PDF" />}
          />
        </div>
      )}
    </div>
  );
}
