"use client";

import { useState } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

import { Field, TextInput, CollapsibleCard, UploadBox } from "../wizard-ui";
import type { CompanyWizardValues, CompanyKbliEntryValues, KbliCategory } from "../../schema";

type KbliMasterDataRow = { id: string; code: string; description: string; status: "ACTIVE" | "INACTIVE" };

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
  return (data ?? []).filter((row) => row.status === "ACTIVE");
}

type KbliItem = { id: string; entry: CompanyKbliEntryValues; index: number };

/** One category's search+add+list — KBLI Utama and KBLI Pendukung each get their own independent card since either can hold more than one entry. */
function KbliCategoryCard({
  title,
  category,
  items,
  kbliOptions,
  onAdd,
  onRemove,
  emptyHint,
}: {
  title: string;
  category: KbliCategory;
  items: KbliItem[];
  kbliOptions: KbliMasterDataRow[];
  onAdd: (category: KbliCategory, query: string) => void;
  onRemove: (index: number) => void;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const datalistId = `kbli-options-${category}`;

  return (
    <div className="rounded-lg border border-[#e8dccd] bg-[#fbf8f4] p-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">{title}</div>
      <div className="mb-2.5 flex gap-2">
        <TextInput
          variant="white"
          placeholder="e.g. 13121 or Pertenunan"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          list={datalistId}
        />
        <datalist id={datalistId}>
          {kbliOptions.map((k) => (
            <option key={k.id} value={k.code}>
              {k.description}
            </option>
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => {
            onAdd(category, query);
            setQuery("");
          }}
          className="whitespace-nowrap rounded-lg border border-[#e1bfb3] bg-white px-3.5 text-[12.5px] font-bold text-[#261813]"
        >
          + Add KBLI
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {items.map(({ id, entry, index }) => (
            <div key={id} className="flex items-start justify-between gap-2 rounded-md border border-[#f0ded0] bg-white p-2.5">
              <div>
                <div className="text-[12.5px] font-bold text-[#c14a1f]">{entry?.code}</div>
                <div className="mt-0.5 text-[11.5px] text-[#6b5b4c]">{entry?.description}</div>
              </div>
              <button type="button" onClick={() => onRemove(index)} aria-label={`Hapus KBLI ${entry?.code}`} className="shrink-0 text-[#a68f80]">
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11.5px] text-[#8a7565]">{emptyHint}</p>
      )}
    </div>
  );
}

export function Step3Legal({ form }: { form: UseFormReturn<CompanyWizardValues> }) {
  const { control, register, watch, setValue, formState } = form;
  const errors = formState.errors;

  const [nibOpen, setNibOpen] = useState(true);
  const [kbliOpen, setKbliOpen] = useState(true);
  const [deedOpen, setDeedOpen] = useState(true);
  const [skOpen, setSkOpen] = useState(true);

  const nibNumber = watch("nibNumber");
  const nibIssueDate = watch("nibIssueDate");
  const nibDocumentPath = watch("nibDocumentPath");
  const nibSaved = Boolean(nibNumber && nibIssueDate && nibDocumentPath);

  const kbliDocumentPath = watch("kbliDocumentPath");
  const kbliEntries = watch("kbliEntries") ?? [];
  const kbliSaved = kbliEntries.length > 0 && Boolean(kbliDocumentPath);
  const { fields: kbliFields, append: appendKbli, remove: removeKbli } = useFieldArray({
    control,
    name: "kbliEntries",
  });
  const kbliOptions = useKbliOptions();
  const kbliItems: KbliItem[] = kbliFields.map((field, index) => ({ id: field.id, entry: kbliEntries[index], index }));
  const kbliUtamaItems = kbliItems.filter((item) => item.entry?.category === "UTAMA");
  const kbliPendukungItems = kbliItems.filter((item) => item.entry?.category !== "UTAMA");

  function handleAddKbli(category: KbliCategory, query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const match = kbliOptions.find((k) => k.code === trimmed);
    appendKbli(match ? { code: match.code, description: match.description, category } : { code: trimmed, description: trimmed, category });
  }

  const deedNumber = watch("notarialDeedNumber");
  const deedDate = watch("notarialDeedIssueDate");
  const deedAuthority = watch("notarialIssuingAuthority");
  const deedDocumentPath = watch("notarialDocumentPath");
  const deedSaved = Boolean(deedNumber && deedDate && deedAuthority && deedDocumentPath);
  const hasAmendment = watch("hasAmendment");

  const skNumber = watch("skNumber");
  const skDate = watch("skDate");
  const skDocumentPath = watch("skDocumentPath");
  const skSaved = Boolean(skNumber && skDate && skDocumentPath);

  return (
    <div className="flex flex-col gap-5.5">
      <CollapsibleCard
        title="NIB (Nomor Induk Berusaha)"
        description="Nomor identitas usaha yang diterbitkan melalui sistem OSS"
        saved={nibSaved}
        open={nibOpen}
        onToggle={() => setNibOpen((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="NIB Number" required error={errors.nibNumber?.message} hint="13 digit nomor identitas usaha dari sistem OSS.">
            <TextInput variant="white" placeholder="e.g. 1234567890123" {...register("nibNumber")} />
          </Field>
          <Field label="Date of Issue" required error={errors.nibIssueDate?.message}>
            <TextInput variant="white" type="date" {...register("nibIssueDate")} />
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Upload Document" required error={errors.nibDocumentPath?.message}>
            <Controller
              control={control}
              name="nibDocumentPath"
              render={({ field }) => (
                <UploadBox label="Dokumen NIB (OSS)" hint="Format: PDF, JPG, PNG" value={field.value} onFile={field.onChange} />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="KBLI (Klasifikasi Baku Lapangan Usaha Indonesia)"
        description="Kode jenis kegiatan usaha — dapat lebih dari satu"
        saved={kbliSaved}
        open={kbliOpen}
        onToggle={() => setKbliOpen((v) => !v)}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <KbliCategoryCard
            title="KBLI Utama"
            category="UTAMA"
            items={kbliUtamaItems}
            kbliOptions={kbliOptions}
            onAdd={handleAddKbli}
            onRemove={removeKbli}
            emptyHint="Belum ada KBLI Utama — cari dan tambahkan kode di atas."
          />
          <KbliCategoryCard
            title="KBLI Pendukung"
            category="PENDUKUNG"
            items={kbliPendukungItems}
            kbliOptions={kbliOptions}
            onAdd={handleAddKbli}
            onRemove={removeKbli}
            emptyHint="Belum ada KBLI Pendukung."
          />
        </div>
        {errors.kbliEntries?.message && (
          <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors.kbliEntries.message}</p>
        )}
        <div className="mt-3.5">
          <Field label="Upload Document" required error={errors.kbliDocumentPath?.message}>
            <Controller
              control={control}
              name="kbliDocumentPath"
              render={({ field }) => (
                <UploadBox label="Dokumen Daftar KBLI (OSS)" hint="Format: PDF" value={field.value} onFile={field.onChange} />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Notarial Deed (Akta Notaris)"
        description="Dokumen akta pendirian perusahaan yang diterbitkan oleh notaris"
        saved={deedSaved}
        open={deedOpen}
        onToggle={() => setDeedOpen((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Notarial Deed Number" required error={errors.notarialDeedNumber?.message} hint="Nomor akta notaris.">
            <TextInput variant="white" placeholder="e.g. No. 15" {...register("notarialDeedNumber")} />
          </Field>
          <Field label="Date of Issue" required error={errors.notarialDeedIssueDate?.message}>
            <TextInput variant="white" type="date" {...register("notarialDeedIssueDate")} />
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Issuing Authority" required error={errors.notarialIssuingAuthority?.message}>
            <TextInput variant="white" placeholder="e.g. Notaris Budi Santoso, SH., M.Kn" {...register("notarialIssuingAuthority")} />
          </Field>
        </div>
        <div className="mt-3.5">
          <button
            type="button"
            onClick={() => setValue("hasAmendment", !hasAmendment)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e1bfb3] px-3.5 py-2"
            style={{ background: hasAmendment ? "#fdeadd" : "transparent" }}
          >
            <span className="text-[13px] font-bold text-[#c14a1f]">Ada Perubahan Akta?</span>
          </button>
        </div>
        {hasAmendment && (
          <div className="mt-4 border-t border-dashed border-[#e8dccd] pt-4">
            <div className="mb-1 text-[13px] font-extrabold text-[#20180f]">Akta Perubahan</div>
            <p className="mb-3 text-[12px] text-[#8a7565]">
              Lengkapi data akta perubahan terakhir, sama seperti Akta Pendirian.
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Amendment Deed Number" hint="Nomor akta perubahan.">
                <TextInput variant="white" placeholder="e.g. No. 3" {...register("notarialAmendmentNumber")} />
              </Field>
              <Field label="Date of Issue">
                <TextInput variant="white" type="date" {...register("notarialAmendmentDate")} />
              </Field>
            </div>
            <div className="mt-3.5">
              <Field label="Issuing Authority">
                <TextInput variant="white" placeholder="e.g. Notaris Budi Santoso, SH., M.Kn" {...register("notarialAmendmentAuthority")} />
              </Field>
            </div>
            <div className="mt-3.5">
              <Field label="Upload Document">
                <Controller
                  control={control}
                  name="notarialAmendmentDocPath"
                  render={({ field }) => (
                    <UploadBox label="Dokumen Akta Perubahan" hint="Format: PDF" value={field.value} onFile={field.onChange} />
                  )}
                />
              </Field>
            </div>
          </div>
        )}
        <div className="mt-3.5">
          <Field label="Upload Document" required error={errors.notarialDocumentPath?.message}>
            <Controller
              control={control}
              name="notarialDocumentPath"
              render={({ field }) => (
                <UploadBox
                  label="Akta Pendirian / Akta Perubahan Terakhir"
                  hint="Format: PDF"
                  value={field.value}
                  onFile={field.onChange}
                />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="SK Kemenkumham"
        description="Surat Keputusan pengesahan badan hukum dari Kementerian Hukum dan HAM"
        saved={skSaved}
        open={skOpen}
        onToggle={() => setSkOpen((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="SK Number" required error={errors.skNumber?.message} hint="Nomor SK pengesahan Kemenkumham.">
            <TextInput variant="white" placeholder="e.g. AHU-0012345.AH.01.01.Tahun 2018" {...register("skNumber")} />
          </Field>
          <Field label="Date of Issue" required error={errors.skDate?.message}>
            <TextInput variant="white" type="date" {...register("skDate")} />
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Upload Document" required error={errors.skDocumentPath?.message}>
            <Controller
              control={control}
              name="skDocumentPath"
              render={({ field }) => (
                <UploadBox label="Dokumen SK Kemenkumham" hint="Format: PDF" value={field.value} onFile={field.onChange} />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>
    </div>
  );
}
