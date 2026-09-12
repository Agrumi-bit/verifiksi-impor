"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { qualityTestEntrySchema, type MerkWizardValues, type QualityTestEntryValues } from "../../../schema";

type CommodityOption = { id: string; name: string; commodityGroupId?: string };

function useCommodityOptions(path: string, key: string) {
  return useQuery({
    queryKey: [key, "options"],
    queryFn: async () => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: CommodityOption[] };
      return json.data;
    },
  });
}

type Props = {
  form: UseFormReturn<MerkWizardValues>;
};

export function QualityTestManager({ form }: Props) {
  const brandName = form.watch("brandName");
  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: "qualityTests",
  });
  const [dialogState, setDialogState] = useState<{ index: number | null } | null>(null);

  return (
    <details open className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold">Hasil Uji Mutu</summary>
      <p className="mt-1 text-xs text-muted-foreground">
        Sertifikat Hasil Uji Mutu bersifat opsional kecuali dipersyaratkan untuk komoditas/subkomoditas
        tertentu — aturan tersebut belum tersedia di sistem ini (lihat catatan TODO pada laporan).
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
          >
            <div className="flex items-start gap-2.5">
              <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="text-xs">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {field.commodityName}
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    Diunggah
                  </span>
                </p>
                {field.commoditySubGroupName && (
                  <p className="text-muted-foreground">Subkomoditas: {field.commoditySubGroupName}</p>
                )}
                <p className="text-muted-foreground">
                  {field.certificateNumber} · {field.laboratoryName}
                </p>
                <p className="text-muted-foreground">
                  Terbit {new Date(field.issueDate).toLocaleDateString("id-ID")}
                  {field.expiryDate &&
                    ` · Berlaku hingga ${new Date(field.expiryDate).toLocaleDateString("id-ID")}`}
                </p>
                <p className="text-muted-foreground">{field.fileName}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDialogState({ index })}
                className="text-xs font-semibold text-primary hover:underline"
              >
                <Pencil className="inline size-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                <Trash2 className="inline size-3.5" /> Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setDialogState({ index: null })}
      >
        + Tambah Hasil Uji Mutu
      </Button>

      {dialogState && (
        <QualityTestDialog
          brandName={brandName}
          initialValues={dialogState.index !== null ? fields[dialogState.index] : undefined}
          onClose={() => setDialogState(null)}
          onSave={(values) => {
            if (dialogState.index !== null) update(dialogState.index, values);
            else append(values);
            setDialogState(null);
          }}
        />
      )}
    </details>
  );
}

function QualityTestDialog({
  brandName,
  initialValues,
  onClose,
  onSave,
}: {
  brandName: string;
  initialValues?: QualityTestEntryValues;
  onClose: () => void;
  onSave: (values: QualityTestEntryValues) => void;
}) {
  const { data: commodityGroups, isLoading: isLoadingGroups } = useCommodityOptions(
    "/api/master-data/commodity-group",
    "master-data-commodity-group",
  );
  const { data: commoditySubGroups, isLoading: isLoadingSubGroups } = useCommodityOptions(
    "/api/master-data/commodity-sub-group",
    "master-data-commodity-sub-group",
  );

  const form = useForm<QualityTestEntryValues>({
    resolver: zodResolver(qualityTestEntrySchema),
    defaultValues: initialValues ?? {
      commodityGroupId: "",
      commodityName: "",
      commoditySubGroupId: "",
      commoditySubGroupName: "",
      certificateNumber: "",
      laboratoryName: "",
      issueDate: "",
      expiryDate: "",
      filePath: "",
      fileName: "",
    },
  });
  const { control, register, setValue, handleSubmit, formState } = form;
  const selectedGroupId = useWatch({ control, name: "commodityGroupId" });

  const groupOptions = (commodityGroups ?? []).map((g) => ({ value: g.id, label: g.name }));
  const subGroupOptions = (commoditySubGroups ?? [])
    .filter((sg) => sg.commodityGroupId === selectedGroupId)
    .map((sg) => ({ value: sg.id, label: sg.name }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Ubah Hasil Uji Mutu" : "Tambah Hasil Uji Mutu"}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => onSave(values))}
        >
          <Controller
            control={control}
            name="commodityGroupId"
            render={({ field }) => (
              <FormField label="Komoditas" required error={formState.errors.commodityGroupId?.message}>
                <SearchSelectInput
                  value={field.value}
                  onChange={field.onChange}
                  options={groupOptions}
                  allowFreeText={false}
                  placeholder={isLoadingGroups ? "Memuat..." : "Cari komoditas..."}
                  onSelectOption={(option) => setValue("commodityName", option.label)}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="commoditySubGroupId"
            render={({ field }) => (
              <FormField label="Subkomoditas">
                <SearchSelectInput
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={subGroupOptions}
                  allowFreeText={false}
                  placeholder={
                    !selectedGroupId
                      ? "Pilih komoditas terlebih dahulu"
                      : isLoadingSubGroups
                        ? "Memuat..."
                        : "Cari subkomoditas..."
                  }
                  onSelectOption={(option) => setValue("commoditySubGroupName", option.label)}
                />
              </FormField>
            )}
          />

          <FormField label="Merek">
            <Input value={brandName || "—"} disabled readOnly />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Nomor Sertifikat"
              required
              error={formState.errors.certificateNumber?.message}
            >
              <Input placeholder="e.g. LAB-2026-00125" {...register("certificateNumber")} />
            </FormField>
            <FormField
              label="Nama Laboratorium"
              required
              error={formState.errors.laboratoryName?.message}
            >
              <Input placeholder="e.g. Balai Besar Tekstil" {...register("laboratoryName")} />
            </FormField>
            <FormField label="Tanggal Terbit" required error={formState.errors.issueDate?.message}>
              <Input type="date" {...register("issueDate")} />
            </FormField>
            <FormField label="Tanggal Berlaku Hingga">
              <Input type="date" {...register("expiryDate")} />
            </FormField>
          </div>

          <Controller
            control={control}
            name="filePath"
            render={({ field }) => (
              <FormField
                label="Upload Sertifikat"
                required
                error={formState.errors.filePath?.message}
              >
                <FileUploadField
                  namespace="certificates"
                  value={field.value}
                  onChange={(path) => {
                    field.onChange(path ?? "");
                    if (path) setValue("fileName", path.split("/").pop() ?? path);
                  }}
                  label="Unggah Sertifikat"
                />
              </FormField>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
