"use client";

import { useRef, useState } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Trash2, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form/form-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { FileUploadField } from "@/components/form/file-upload-field";
import { useHsCodeOptions } from "../../hooks/use-hs-code-options";
import {
  createEmptyProduct,
  createEmptyRawMaterial,
  createEmptyRawMaterialConversion,
  RAW_MATERIAL_CONVERSION_KATEGORI,
  type ApplicationWizardValues,
  type RawMaterialConversionKategori,
} from "../../schema";
import { downloadProductExcelTemplate, parseProductExcelFile } from "../../product-excel";
import { downloadRawMaterialExcelTemplate, parseRawMaterialExcelFile } from "../../raw-material-excel";
import { downloadRawMaterialConversionExcelTemplate, parseRawMaterialConversionExcelFile } from "../../raw-material-conversion-excel";

const KATEGORI_LABELS: Record<RawMaterialConversionKategori, string> = {
  BAHAN_BAKU: "Bahan Baku",
  BAHAN_PENOLONG: "Bahan Penolong",
};

type Props = { form: UseFormReturn<ApplicationWizardValues> };

export function VkiStep8Product({ form }: Props) {
  const { control, register, watch } = form;
  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control,
    name: "products",
  });
  const { fields: rawMaterialFields, append: appendRawMaterial, remove: removeRawMaterial } = useFieldArray({
    control,
    name: "rawMaterials",
  });
  const { fields: conversionFields, append: appendConversion, remove: removeConversion } = useFieldArray({
    control,
    name: "rawMaterialConversions",
  });
  const hsCodeOptions = useHsCodeOptions();
  const products = watch("products") ?? [];
  const rawMaterials = watch("rawMaterials") ?? [];
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingProducts, setIsImportingProducts] = useState(false);
  const rawMaterialFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingRawMaterials, setIsImportingRawMaterials] = useState(false);
  const conversionFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingConversions, setIsImportingConversions] = useState(false);

  async function handleImportProductFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImportingProducts(true);
    try {
      const { products: imported, skippedRows } = await parseProductExcelFile(file, hsCodeOptions);
      if (imported.length === 0) {
        toast.error("Tidak ada baris produk yang valid ditemukan pada file. Pastikan kolom \"Jenis Produk\" terisi.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appendProduct(imported as any);
      toast.success(
        `${imported.length} produk berhasil diimpor.` + (skippedRows > 0 ? ` ${skippedRows} baris kosong dilewati.` : ""),
      );
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImportingProducts(false);
    }
  }

  async function handleImportRawMaterialFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImportingRawMaterials(true);
    try {
      const { rawMaterials: imported, skippedRows } = await parseRawMaterialExcelFile(file, hsCodeOptions);
      if (imported.length === 0) {
        toast.error("Tidak ada baris bahan baku yang valid ditemukan pada file. Pastikan kolom \"Jenis Bahan Baku\" terisi.");
        return;
      }
      appendRawMaterial(imported);
      toast.success(
        `${imported.length} bahan baku berhasil diimpor.` + (skippedRows > 0 ? ` ${skippedRows} baris kosong dilewati.` : ""),
      );
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImportingRawMaterials(false);
    }
  }

  async function handleImportConversionFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImportingConversions(true);
    try {
      const productOptions = products.map((p, i) => ({ id: p.id ?? "", materialType: p.materialType || `Produk ${i + 1}` }));
      const rawMaterialOptions = rawMaterials.map((r, i) => ({ id: r.id ?? "", jenis: r.jenis || `Bahan Baku ${i + 1}` }));
      const { entries: imported, skippedRows } = await parseRawMaterialConversionExcelFile(file, productOptions, rawMaterialOptions);
      if (imported.length === 0) {
        toast.error("Tidak ada baris rasio konversi yang valid ditemukan pada file. Pastikan kolom \"Nama Item/Produk\" terisi.");
        return;
      }
      appendConversion(imported);
      toast.success(
        `${imported.length} rasio konversi berhasil diimpor.` + (skippedRows > 0 ? ` ${skippedRows} baris kosong dilewati.` : ""),
      );
    } catch {
      toast.error("Gagal membaca file Excel. Pastikan format file sesuai template.");
    } finally {
      setIsImportingConversions(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm font-bold">Product Information</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Daftar produk yang diproduksi dan bahan baku yang diperlukan, beserta klasifikasi HS Code.
        </p>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Produk yang Dihasilkan
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadProductExcelTemplate}>
              <Download className="size-3.5" />
              Unduh Template Excel
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isImportingProducts} onClick={() => productFileInputRef.current?.click()}>
              <Upload className="size-3.5" />
              {isImportingProducts ? "Mengimpor..." : "Impor dari Excel"}
            </Button>
            <input ref={productFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportProductFile} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {productFields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-4 rounded-xl border border-border p-4.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6.5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold">Produk {index + 1}</p>
                </div>
                {productFields.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeProduct(index)} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-3.5" />
                    Hapus
                  </Button>
                )}
              </div>

              <FormField label="Kategori Produk">
                <Input placeholder="Contoh: Sepatu" {...register(`products.${index}.kategori`)} />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Jenis Produk" required>
                  <Input placeholder="Contoh: Benang Katun" {...register(`products.${index}.materialType`)} />
                </FormField>
                <Controller
                  control={control}
                  name={`products.${index}.hsCode`}
                  render={({ field: hsField }) => (
                    <FormField label="HS Code" required>
                      <SearchSelectInput
                        value={hsField.value}
                        onChange={hsField.onChange}
                        options={hsCodeOptions}
                        placeholder="Cari kode atau uraian HS Code..."
                        onSelectOption={(opt) => form.setValue(`products.${index}.hsDesc`, opt.hint ?? "")}
                      />
                    </FormField>
                  )}
                />
              </div>

              <FormField label="Deskripsi Produk">
                <Textarea placeholder="Deskripsi produk yang dihasilkan..." {...register(`products.${index}.deskripsi`)} />
              </FormField>

              <FormField label="Uraian HS Code">
                <div className="min-h-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {watch(`products.${index}.hsDesc`) || "-"}
                </div>
              </FormField>

              <Controller
                control={control}
                name={`products.${index}.photoPath`}
                render={({ field: f }) => (
                  <FileUploadField value={f.value} onChange={f.onChange} label="Photo Produk" hint="Format: JPG/PNG" namespace="temporary" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                )}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-dashed"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={() => appendProduct(createEmptyProduct() as any)}
        >
          + Tambah Produk
        </Button>
      </div>

      <div className="border-t border-border pt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bahan Baku yang Diperlukan
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadRawMaterialExcelTemplate}>
              <Download className="size-3.5" />
              Unduh Template Excel
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isImportingRawMaterials} onClick={() => rawMaterialFileInputRef.current?.click()}>
              <Upload className="size-3.5" />
              {isImportingRawMaterials ? "Mengimpor..." : "Impor dari Excel"}
            </Button>
            <input ref={rawMaterialFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportRawMaterialFile} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {rawMaterialFields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-4 rounded-xl border border-border p-4.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6.5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold">Bahan Baku {index + 1}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeRawMaterial(index)} className="text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Jenis Bahan Baku">
                  <Input placeholder="Contoh: Serat Kapas" {...register(`rawMaterials.${index}.jenis`)} />
                </FormField>
                <Controller
                  control={control}
                  name={`rawMaterials.${index}.hsCode`}
                  render={({ field: hsField }) => (
                    <FormField label="HS Code">
                      <SearchSelectInput
                        value={hsField.value ?? ""}
                        onChange={hsField.onChange}
                        options={hsCodeOptions}
                        placeholder="Cari kode atau uraian HS Code..."
                        onSelectOption={(opt) => form.setValue(`rawMaterials.${index}.hsDesc`, opt.hint ?? "")}
                      />
                    </FormField>
                  )}
                />
              </div>

              <FormField label="Deskripsi Bahan Baku">
                <Textarea placeholder="Deskripsi bahan baku yang digunakan..." {...register(`rawMaterials.${index}.deskripsi`)} />
              </FormField>

              <FormField label="Uraian HS Code">
                <div className="min-h-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {watch(`rawMaterials.${index}.hsDesc`) || "-"}
                </div>
              </FormField>

              <Controller
                control={control}
                name={`rawMaterials.${index}.photoPath`}
                render={({ field: f }) => (
                  <FileUploadField value={f.value} onChange={f.onChange} label="Photo Bahan Baku" hint="Format: JPG/PNG" namespace="temporary" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                )}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-dashed"
          onClick={() => appendRawMaterial(createEmptyRawMaterial())}
        >
          + Tambah Bahan Baku
        </Button>
      </div>

      <div className="border-t border-border pt-6">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rasio Konversi Bahan Baku ke Produk
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadRawMaterialConversionExcelTemplate}>
              <Download className="size-3.5" />
              Unduh Template Excel
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isImportingConversions} onClick={() => conversionFileInputRef.current?.click()}>
              <Upload className="size-3.5" />
              {isImportingConversions ? "Mengimpor..." : "Impor dari Excel"}
            </Button>
            <input ref={conversionFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportConversionFile} />
          </div>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Pilih produk, lalu bahan baku dan/atau bahan penolong yang digunakan untuk produk tersebut, beserta rasio
          konversinya. Contoh: 1 kg serat kapas menghasilkan 4 meter kain jadi (rasio 1:4).
        </p>

        {conversionFields.length === 0 && (
          <p className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
            Belum ada rasio konversi. Tambahkan produk dan bahan baku terlebih dahulu.
          </p>
        )}

        {conversionFields.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-295 border-collapse text-xs">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="border border-primary/70 p-2.5 font-bold" rowSpan={2}>No</th>
                  <th className="border border-primary/70 p-2.5 font-bold" colSpan={3}>Produk Jadi</th>
                  <th className="border border-primary/70 p-2.5 font-bold" colSpan={5}>Bahan Baku dan/atau Bahan Penolong</th>
                  <th className="border border-primary/70 p-2.5 font-bold" rowSpan={2}>Rasio Konversi</th>
                  <th className="border border-primary/70 p-2.5 font-bold" rowSpan={2}>Keterangan</th>
                  <th className="border border-primary/70 p-2.5 font-bold" rowSpan={2}></th>
                </tr>
                <tr className="bg-primary text-primary-foreground">
                  <th className="border border-primary/70 p-2 font-semibold">Jenis Produk</th>
                  <th className="border border-primary/70 p-2 font-semibold">Volume Produksi</th>
                  <th className="border border-primary/70 p-2 font-semibold">Satuan</th>
                  <th className="border border-primary/70 p-2 font-semibold">Nama Item/Produk</th>
                  <th className="border border-primary/70 p-2 font-semibold">HS Code</th>
                  <th className="border border-primary/70 p-2 font-semibold">Kategori</th>
                  <th className="border border-primary/70 p-2 font-semibold">Volume Kebutuhan</th>
                  <th className="border border-primary/70 p-2 font-semibold">Satuan</th>
                </tr>
              </thead>
              <tbody>
                {conversionFields.map((field, index) => {
                  const selectedRawMaterialId = watch(`rawMaterialConversions.${index}.rawMaterialId`);
                  const selectedRawMaterial = rawMaterials.find((r) => r.id === selectedRawMaterialId);
                  return (
                    <tr key={field.id}>
                      <td className="border border-border p-2 text-center text-muted-foreground">{index + 1}</td>
                      <td className="border border-border p-1.5">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                          {...register(`rawMaterialConversions.${index}.productId`)}
                        >
                          <option value="">Pilih produk...</option>
                          {products.map((p, i) => (
                            <option key={p.id ?? i} value={p.id}>
                              {p.materialType || `Produk ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-border p-1.5">
                        <Input placeholder="Contoh: 4" {...register(`rawMaterialConversions.${index}.volumeProduksiJumlah`)} />
                      </td>
                      <td className="border border-border p-1.5">
                        <Input className="w-20" placeholder="meter" {...register(`rawMaterialConversions.${index}.volumeProduksiSatuan`)} />
                      </td>
                      <td className="border border-border p-1.5">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                          {...register(`rawMaterialConversions.${index}.rawMaterialId`)}
                        >
                          <option value="">Pilih bahan baku...</option>
                          {rawMaterials.map((r, i) => (
                            <option key={r.id ?? i} value={r.id}>
                              {r.jenis || `Bahan Baku ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-border p-2 text-muted-foreground">{selectedRawMaterial?.hsCode || "—"}</td>
                      <td className="border border-border p-1.5">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                          {...register(`rawMaterialConversions.${index}.kategori`)}
                        >
                          <option value="">Pilih...</option>
                          {RAW_MATERIAL_CONVERSION_KATEGORI.map((k) => (
                            <option key={k} value={k}>
                              {KATEGORI_LABELS[k]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-border p-1.5">
                        <Input placeholder="Contoh: 1" {...register(`rawMaterialConversions.${index}.volumeKebutuhanJumlah`)} />
                      </td>
                      <td className="border border-border p-1.5">
                        <Input className="w-20" placeholder="kg" {...register(`rawMaterialConversions.${index}.volumeKebutuhanSatuan`)} />
                      </td>
                      <td className="border border-border p-1.5">
                        <Input placeholder="Contoh: 1 kg/4 meter" {...register(`rawMaterialConversions.${index}.rasioKonversi`)} />
                      </td>
                      <td className="border border-border p-1.5">
                        <Input placeholder="Opsional" {...register(`rawMaterialConversions.${index}.keterangan`)} />
                      </td>
                      <td className="border border-border p-1.5 text-center">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeConversion(index)} className="text-destructive hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="mt-4 border-dashed"
          onClick={() => appendConversion(createEmptyRawMaterialConversion())}
        >
          + Tambah Rasio Konversi
        </Button>
      </div>
    </div>
  );
}
