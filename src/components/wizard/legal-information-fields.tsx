"use client";

import { useState } from "react";
import {
  Controller,
  useFieldArray,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { FileUploadField } from "@/components/form/file-upload-field";
import {
  SearchSelectInput,
  type SearchSelectOption,
} from "@/components/form/search-select-input";
import type { LegalInformationValues } from "@/modules/shared/schema";

type KbliMasterDataRow = {
  id: string;
  code: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
};

function useKbliOptions() {
  const { data } = useQuery({
    queryKey: ["master-data-kbli", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/kbli");
      if (!response.ok) throw new Error("Gagal memuat data KBLI");
      const json = (await response.json()) as { data: KbliMasterDataRow[] };
      return json.data;
    },
  });

  return (data ?? [])
    .filter((row) => row.status === "ACTIVE")
    .map(
      (row): SearchSelectOption => ({
        value: row.code,
        label: row.code,
        hint: row.description,
      }),
    );
}

type Props<T extends FieldValues & LegalInformationValues> = {
  form: UseFormReturn<T>;
};

export function LegalInformationFields<T extends FieldValues & LegalInformationValues>({
  form,
}: Props<T>) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: "kbliEntries" as any,
  });

  const kbliOptions = useKbliOptions();
  const [kbliQuery, setKbliQuery] = useState("");

  function handleAddKbli() {
    const query = kbliQuery.trim();
    if (!query) return;
    const [maybeCode, ...rest] = query.split(" ");
    const looksLikeCode = /^\d{4,5}$/.test(maybeCode);
    append(
      {
        code: looksLikeCode ? maybeCode : "",
        description: looksLikeCode ? rest.join(" ") || query : query,
      } as never,
    );
    setKbliQuery("");
  }

  function handleSelectKbli(option: SearchSelectOption) {
    append({ code: option.value, description: option.hint ?? "" } as never);
    setKbliQuery("");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">NIB (Nomor Induk Berusaha)</h2>
          <p className="text-xs text-muted-foreground">
            Nomor identitas usaha yang diterbitkan melalui sistem OSS
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="NIB Number"
            htmlFor="nibNumber"
            required
            error={errors.nibNumber?.message as string | undefined}
            hint="13 digit nomor identitas usaha dari sistem OSS."
          >
            <Input
              id="nibNumber"
              placeholder="e.g. 1234567890123"
              {...register("nibNumber" as Path<T>)}
            />
          </FormField>
          <FormField
            label="Date of Issue"
            htmlFor="nibIssueDate"
            required
            error={errors.nibIssueDate?.message as string | undefined}
            hint="Contoh: 12 March 2022"
          >
            <Input id="nibIssueDate" type="date" {...register("nibIssueDate" as Path<T>)} />
          </FormField>
        </div>

        <Controller
          control={control}
          name={"nibDocumentPath" as Path<T>}
          render={({ field }) => (
            <FormField
              label="Upload Document"
              required
              error={errors.nibDocumentPath?.message as string | undefined}
            >
              <FileUploadField
                namespace="temporary"
                value={field.value as string | undefined}
                onChange={field.onChange}
                label="Dokumen NIB (OSS)"
                hint="Format: PDF, JPG, PNG · Klik untuk upload"
              />
            </FormField>
          )}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">
            KBLI (Klasifikasi Baku Lapangan Usaha Indonesia)
          </h2>
          <p className="text-xs text-muted-foreground">
            Kode jenis kegiatan usaha — dapat lebih dari satu
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <FormField
            label="Search KBLI Code or Activity Name"
            hint="Pilih dari master data untuk deskripsi otomatis, atau ketik manual lalu klik + Add KBLI kalau belum terdaftar."
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchSelectInput
                  value={kbliQuery}
                  onChange={setKbliQuery}
                  options={kbliOptions}
                  placeholder="e.g. 13121 or Pertenunan"
                  onSelectOption={handleSelectKbli}
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddKbli}>
                + Add KBLI
              </Button>
            </div>
          </FormField>

          {fields.length > 0 && (
            <ul className="flex flex-col gap-2">
              {fields.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <Input
                      className="w-24"
                      placeholder="Kode"
                      {...register(`kbliEntries.${index}.code` as Path<T>)}
                    />
                    <Input
                      placeholder="Deskripsi"
                      {...register(`kbliEntries.${index}.description` as Path<T>)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Hapus KBLI"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.kbliEntries?.message && (
            <p className="text-xs text-destructive">
              {errors.kbliEntries.message as string}
            </p>
          )}
        </div>

        <Controller
          control={control}
          name={"kbliDocumentPath" as Path<T>}
          render={({ field }) => (
            <FormField
              label="Upload Document"
              required
              error={errors.kbliDocumentPath?.message as string | undefined}
            >
              <FileUploadField
                namespace="temporary"
                value={field.value as string | undefined}
                onChange={field.onChange}
                label="Dokumen Daftar KBLI (OSS)"
                hint="Format: PDF · Klik untuk upload"
              />
            </FormField>
          )}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Notarial Deed (Akta Notaris)</h2>
          <p className="text-xs text-muted-foreground">
            Dokumen akta pendirian perusahaan yang diterbitkan oleh notaris
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Notarial Deed Number"
            htmlFor="notarialDeedNumber"
            required
            error={errors.notarialDeedNumber?.message as string | undefined}
            hint="Nomor akta notaris."
          >
            <Input
              id="notarialDeedNumber"
              placeholder="e.g. No. 15"
              {...register("notarialDeedNumber" as Path<T>)}
            />
          </FormField>
          <FormField
            label="Date of Issue"
            htmlFor="notarialDeedIssueDate"
            required
            error={errors.notarialDeedIssueDate?.message as string | undefined}
            hint="Contoh: 15 January 2018"
          >
            <Input
              id="notarialDeedIssueDate"
              type="date"
              {...register("notarialDeedIssueDate" as Path<T>)}
            />
          </FormField>
        </div>

        <FormField
          label="Issuing Authority"
          htmlFor="notarialIssuingAuthority"
          required
          error={errors.notarialIssuingAuthority?.message as string | undefined}
        >
          <Input
            id="notarialIssuingAuthority"
            placeholder="e.g. Notaris Budi Santoso, SH., M.Kn"
            {...register("notarialIssuingAuthority" as Path<T>)}
          />
        </FormField>

        <FormField
          label="Validity / Amendment Information"
          hint="Informasi perubahan akta (jika ada). Opsional."
        >
          <Input
            placeholder="e.g. Amendment No. 3 – 2023"
            {...register("notarialAmendmentInfo" as Path<T>)}
          />
        </FormField>

        <Controller
          control={control}
          name={"notarialDocumentPath" as Path<T>}
          render={({ field }) => (
            <FormField
              label="Upload Document"
              required
              error={errors.notarialDocumentPath?.message as string | undefined}
            >
              <FileUploadField
                namespace="temporary"
                value={field.value as string | undefined}
                onChange={field.onChange}
                label="Akta Pendirian / Akta Perubahan Terakhir"
                hint="Format: PDF · Klik untuk upload"
              />
            </FormField>
          )}
        />
      </section>
    </div>
  );
}
