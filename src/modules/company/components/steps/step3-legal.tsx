"use client";

import { useState } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { KBLI_VERSIONS } from "@/modules/master-data/schema";

import { Field, TextInput, CollapsibleCard, UploadBox } from "../wizard-ui";
import { useApiUKbliUtamaOptions } from "../../hooks/use-api-u-kbli-utama";
import {
  API_U_KBLI_UTAMA_ERROR,
  isAllowedApiUKbliUtama,
  type CompanyWizardValues,
  type CompanyKbliEntryValues,
  type KbliCategory,
} from "../../schema";

type KbliMasterDataRow = { id: string; code: string; description: string; version: string; status: "ACTIVE" | "INACTIVE" };

/** Newest KBLI version first (KBLI_VERSIONS order), then by code — so suggestions lead with current codes. */
function versionOrdered(rows: KbliMasterDataRow[]): KbliMasterDataRow[] {
  const rank = (version: string) => {
    const i = (KBLI_VERSIONS as readonly string[]).indexOf(version);
    return i === -1 ? KBLI_VERSIONS.length : i;
  };
  return [...rows].sort((a, b) => rank(a.version) - rank(b.version) || a.code.localeCompare(b.code));
}

function useKbliOptions() {
  const { data } = useQuery({
    queryKey: ["master-data-kbli", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/kbli");
      if (!response.ok) throw new Error("Gagal memuat data KBLI");
      const json = (await response.json()) as { data: KbliMasterDataRow[] };
      return versionOrdered(json.data.filter((row) => row.status === "ACTIVE"));
    },
  });
  return data ?? [];
}

const MAX_KBLI_SUGGESTIONS = 50;

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
  note,
  isEntryAllowed,
}: {
  title: string;
  category: KbliCategory;
  items: KbliItem[];
  kbliOptions: KbliMasterDataRow[];
  onAdd: (category: KbliCategory, query: string, option?: KbliMasterDataRow) => void;
  onRemove: (index: number) => void;
  emptyHint: string;
  /** Shown under the title — e.g. that API-U limits which KBLI Utama can be picked. */
  note?: string;
  /** Entries failing this are flagged in red (e.g. picked before the API type changed). */
  isEntryAllowed?: (entry: CompanyKbliEntryValues) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Every version is listed side by side — a code present in both KBLI 2020 and 2025 shows up
  // once per version, so picking the suggestion is what picks the version.
  const needle = query.trim().toLowerCase();
  const suggestions = (
    needle
      ? kbliOptions.filter((k) => k.code.toLowerCase().includes(needle) || k.description.toLowerCase().includes(needle))
      : kbliOptions
  ).slice(0, MAX_KBLI_SUGGESTIONS);

  function pick(option: KbliMasterDataRow) {
    onAdd(category, option.code, option);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div className="rounded-lg border border-[#e8dccd] bg-[#fbf8f4] p-3.5">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">{title}</div>
      {note && <p className="-mt-1 mb-2 text-[11px] font-semibold text-[#c14a1f]">{note}</p>}
      <div className="mb-2.5 flex gap-2">
        <div className="relative flex-1">
          <TextInput
            variant="white"
            placeholder="e.g. 13121 or Pertenunan"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsOpen(false);
            }}
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
          />
          {isOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#e8dccd] bg-white py-1 shadow-lg"
            >
              {suggestions.map((k) => (
                <li
                  key={k.id}
                  role="option"
                  aria-selected={false}
                  // mousedown (not click) so the pick lands before the input's blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(k);
                  }}
                  className="cursor-pointer px-3 py-2 hover:bg-[#fdeadd]/60"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12.5px] font-bold text-[#c14a1f]">{k.code}</span>
                    <span className="rounded-full bg-[#fdeadd] px-1.5 py-px text-[10px] font-bold text-[#c14a1f]">{k.version}</span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[#6b5b4c]">{k.description}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
            <div
              key={id}
              className={`flex items-start justify-between gap-2 rounded-md border bg-white p-2.5 ${
                entry && isEntryAllowed && !isEntryAllowed(entry) ? "border-[#e5a5a5]" : "border-[#f0ded0]"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12.5px] font-bold text-[#c14a1f]">{entry?.code}</span>
                  {entry?.version && (
                    <span className="rounded-full bg-[#fdeadd] px-1.5 py-px text-[10px] font-bold text-[#c14a1f]">{entry.version}</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[#6b5b4c]">{entry?.description}</div>
                {entry && isEntryAllowed && !isEntryAllowed(entry) && (
                  <div className="mt-1 text-[11px] font-semibold text-[#ba1a1a]">Tidak diizinkan untuk API-U — hapus dan pilih dari daftar.</div>
                )}
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

  const isApiU = watch("apiType") === "API-U";
  const apiUAllowed = useApiUKbliUtamaOptions(isApiU);
  // An empty API-U list (every row deactivated in System Configuration) means no restriction.
  const isApiURestricted = isApiU && apiUAllowed.length > 0;
  const utamaOptions: KbliMasterDataRow[] = isApiURestricted
    ? apiUAllowed.map((option) => ({ ...option, id: `api-u-${option.code}-${option.version}`, status: "ACTIVE" }))
    : kbliOptions;

  function handleAddKbli(category: KbliCategory, query: string, option?: KbliMasterDataRow) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const options = category === "UTAMA" ? utamaOptions : kbliOptions;
    // Typed code + "Add KBLI" without picking a suggestion: take the newest version that has it.
    const match = option ?? versionOrdered(options).find((k) => k.code === trimmed);
    if (category === "UTAMA" && isApiURestricted && !match) {
      toast.error(API_U_KBLI_UTAMA_ERROR);
      return;
    }
    appendKbli(
      match
        ? { code: match.code, description: match.description, category, version: match.version }
        : { code: trimmed, description: trimmed, category },
    );
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
        <p className="mb-3 text-[11.5px] text-[#8a7565]">
          Ketik kode atau nama kegiatan, lalu pilih dari daftar — setiap kode ditampilkan beserta versi KBLI-nya (mis. KBLI 2025 / KBLI 2020).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <KbliCategoryCard
            title="KBLI Utama"
            category="UTAMA"
            items={kbliUtamaItems}
            kbliOptions={utamaOptions}
            note={isApiURestricted ? "API-U: KBLI Utama hanya dapat dipilih dari daftar yang diizinkan." : undefined}
            isEntryAllowed={isApiURestricted ? (entry) => isAllowedApiUKbliUtama(entry, apiUAllowed) : undefined}
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
        description="Opsional — dokumen akta pendirian perusahaan yang diterbitkan oleh notaris"
        saved={deedSaved}
        open={deedOpen}
        onToggle={() => setDeedOpen((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Notarial Deed Number" error={errors.notarialDeedNumber?.message} hint="Nomor akta notaris.">
            <TextInput variant="white" placeholder="e.g. No. 15" {...register("notarialDeedNumber")} />
          </Field>
          <Field label="Date of Issue" error={errors.notarialDeedIssueDate?.message}>
            <TextInput variant="white" type="date" {...register("notarialDeedIssueDate")} />
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Issuing Authority" error={errors.notarialIssuingAuthority?.message}>
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
                    <UploadBox label="Dokumen Akta Perubahan" hint="Format: PDF" value={field.value} onFile={field.onChange} onRemove={() => field.onChange("")} />
                  )}
                />
              </Field>
            </div>
          </div>
        )}
        <div className="mt-3.5">
          <Field label="Upload Document" error={errors.notarialDocumentPath?.message}>
            <Controller
              control={control}
              name="notarialDocumentPath"
              render={({ field }) => (
                <UploadBox
                  label="Akta Pendirian / Akta Perubahan Terakhir"
                  hint="Format: PDF"
                  value={field.value}
                  onFile={field.onChange}
                  onRemove={() => field.onChange("")}
                />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="SK Kemenkumham"
        description="Opsional — Surat Keputusan pengesahan badan hukum dari Kementerian Hukum dan HAM"
        saved={skSaved}
        open={skOpen}
        onToggle={() => setSkOpen((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="SK Number" error={errors.skNumber?.message} hint="Nomor SK pengesahan Kemenkumham.">
            <TextInput variant="white" placeholder="e.g. AHU-0012345.AH.01.01.Tahun 2018" {...register("skNumber")} />
          </Field>
          <Field label="Date of Issue" error={errors.skDate?.message}>
            <TextInput variant="white" type="date" {...register("skDate")} />
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Upload Document" error={errors.skDocumentPath?.message}>
            <Controller
              control={control}
              name="skDocumentPath"
              render={({ field }) => (
                <UploadBox label="Dokumen SK Kemenkumham" hint="Format: PDF" value={field.value} onFile={field.onChange} onRemove={() => field.onChange("")} />
              )}
            />
          </Field>
        </div>
      </CollapsibleCard>
    </div>
  );
}
