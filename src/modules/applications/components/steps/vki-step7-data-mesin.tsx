"use client";

import { useRef, useState } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { createEmptyMachine, MACHINE_KONDISI_VALUES, MACHINE_KONDISI_LABELS, type ApplicationWizardValues } from "../../schema";
import { downloadMachineExcelTemplate, parseMachineExcelFile } from "../../machine-excel";

type Props = { form: UseFormReturn<ApplicationWizardValues> };

export function VkiStep7DataMesin({ form }: Props) {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "machines" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const { machines, skippedRows } = await parseMachineExcelFile(file);
      if (machines.length === 0) {
        toast.error("Tidak ada baris mesin yang valid ditemukan pada file. Pastikan kolom \"Nama Mesin\" terisi.");
        return;
      }
      append(machines);
      toast.success(
        `${machines.length} mesin berhasil diimpor.` + (skippedRows > 0 ? ` ${skippedRows} baris kosong dilewati.` : ""),
      );
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Data Mesin</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daftar mesin produksi yang digunakan dalam proses produksi.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadMachineExcelTemplate}>
            <Download className="size-3.5" />
            Unduh Template Excel
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-3.5" />
            {isImporting ? "Mengimpor..." : "Impor dari Excel"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-4 rounded-xl border border-border p-4.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6.5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <p className="text-sm font-bold">Mesin {index + 1}</p>
            </div>
            {fields.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="text-destructive hover:text-destructive">
                <Trash2 className="size-3.5" />
                Hapus
              </Button>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identitas Mesin</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nama Mesin">
                <Input placeholder="Contoh: Mesin Pemintal Benang" {...register(`machines.${index}.nama`)} />
              </FormField>
              <FormField label="Merk">
                <Input placeholder="Contoh: Toyota" {...register(`machines.${index}.merk`)} />
              </FormField>
              <FormField label="Model">
                <Input placeholder="Contoh: FA-506" {...register(`machines.${index}.model`)} />
              </FormField>
              <FormField label="Tahun Pembuatan">
                <Input placeholder="Contoh: 2019" {...register(`machines.${index}.tahun`)} />
              </FormField>
              <FormField label="Jumlah Unit">
                <Input placeholder="Contoh: 12" {...register(`machines.${index}.jumlah`)} />
              </FormField>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Spesifikasi Proses</h3>
            <div className="flex flex-col gap-4">
              <FormField label="Nama Proses">
                <Input placeholder="Contoh: Pemintalan Serat Kapas Menjadi Benang" {...register(`machines.${index}.proses`)} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Kapasitas Produksi">
                  <div className="flex gap-2">
                    <Input placeholder="Contoh: 500" {...register(`machines.${index}.kapasitas`)} />
                    <Input className="w-20 shrink-0" placeholder="Satuan" {...register(`machines.${index}.kapasitasSatuan`)} />
                  </div>
                </FormField>
                <FormField label="Kapasitas Produksi per Jam">
                  <div className="flex gap-2">
                    <Input placeholder="Contoh: 20" {...register(`machines.${index}.kapasitasJam`)} />
                    <Input className="w-20 shrink-0" placeholder="Satuan" {...register(`machines.${index}.kapasitasJamSatuan`)} />
                  </div>
                </FormField>
                <FormField label="Power Consumption (kWh/jam)">
                  <Input placeholder="Contoh: 15" {...register(`machines.${index}.power`)} />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Waktu Beroperasi (jam/hari)">
                  <Input placeholder="Contoh: 8" {...register(`machines.${index}.waktuBeroperasi`)} />
                </FormField>
                <FormField label="Kondisi">
                  <Controller
                    control={control}
                    name={`machines.${index}.kondisi`}
                    render={({ field: f }) => (
                      <div className="flex overflow-hidden rounded-lg border border-border">
                        {MACHINE_KONDISI_VALUES.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => f.onChange(value)}
                            className={
                              "flex-1 px-3 py-2 text-xs font-semibold " +
                              (f.value === value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")
                            }
                          >
                            {MACHINE_KONDISI_LABELS[value]}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Input / Raw Material">
                  <Input placeholder="Contoh: Serat Kapas" {...register(`machines.${index}.input`)} />
                </FormField>
                <FormField label="Output / Produk">
                  <Input placeholder="Contoh: Benang Katun" {...register(`machines.${index}.output`)} />
                </FormField>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dokumentasi Foto</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Controller
                control={control}
                name={`machines.${index}.photoMesinPath`}
                render={({ field: f }) => (
                  <FileUploadField value={f.value} onChange={f.onChange} label="Photo Mesin" hint="Format: JPG/PNG" namespace="temporary" accept=".jpg,.jpeg,.png" />
                )}
              />
              <Controller
                control={control}
                name={`machines.${index}.photoInputPath`}
                render={({ field: f }) => (
                  <FileUploadField value={f.value} onChange={f.onChange} label="Photo Input / Raw Material" hint="Format: JPG/PNG" namespace="temporary" accept=".jpg,.jpeg,.png" />
                )}
              />
              <Controller
                control={control}
                name={`machines.${index}.photoOutputPath`}
                render={({ field: f }) => (
                  <FileUploadField value={f.value} onChange={f.onChange} label="Photo Output / Produk" hint="Format: JPG/PNG" namespace="temporary" accept=".jpg,.jpeg,.png" />
                )}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        onClick={() => append(createEmptyMachine())}
      >
        + Tambah Mesin
      </Button>
    </div>
  );
}
