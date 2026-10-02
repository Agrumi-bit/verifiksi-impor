"use client";

import { useState } from "react";

import { SearchSelectInput } from "@/components/form/search-select-input";
import type { MasterDataField, MasterDataRow } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: MasterDataField[];
  initialValues?: MasterDataRow | null;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function MasterDataFormDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialValues,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{ background: "rgba(43,36,32,.45)" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-[460px] max-w-[92vw] rounded-2xl bg-white p-7"
      >
        <div className="mb-4.5 flex items-center justify-between">
          <div className="text-[16px] font-extrabold text-[#2b2420]">{title}</div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[20px] text-[#a68f80]"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <MasterDataForm
          fields={fields}
          initialValues={initialValues}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          onDone={() => onOpenChange(false)}
        />
      </div>
    </div>
  );
}

type FormProps = {
  fields: MasterDataField[];
  initialValues?: MasterDataRow | null;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  onDone: () => void;
};

function buildInitialValues(
  fields: MasterDataField[],
  initialValues?: MasterDataRow | null,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of fields) {
    if (initialValues && field.deriveInitialValue) {
      next[field.key] = field.deriveInitialValue(initialValues);
      continue;
    }
    const raw = initialValues?.[field.key];
    next[field.key] = typeof raw === "string" ? raw : "";
  }
  return next;
}

const inputClass =
  "w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none";
const labelClass = "mb-1.5 block text-[12px] font-semibold text-[#594138]";

function MasterDataForm({ fields, initialValues, onSubmit, onCancel, onDone }: FormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(fields, initialValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(key: string, value: string) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      // Any field cascading off this one may have a now-invalid selection (e.g. a Sub Kelompok
      // Komoditas that no longer belongs to the newly-picked Kelompok Komoditas) — clear it
      // rather than silently submitting a stale, mismatched pair.
      for (const field of fields) {
        if (field.dependsOn === key) next[field.key] = "";
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        nextErrors[field.key] = `${field.label} wajib diisi`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onDone();
    } catch {
      // onSubmit already surfaced a toast with the real reason — swallow here so the
      // dialog stays open for the user to fix instead of crashing to an error overlay.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {fields.map((field) => (
        <div key={field.key}>
          {field.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-[12.5px] text-[#4a4038]">
              <input
                type="checkbox"
                checked={values[field.key] === "true"}
                onChange={(event) => updateField(field.key, event.target.checked ? "true" : "false")}
              />
              {field.placeholder}
            </label>
          ) : (
            <>
              {field.label && (
                <label className={labelClass}>
                  {field.label}
                  {field.required && <span className="text-[#ba1a1a]"> *</span>}
                </label>
              )}
              {field.type === "textarea" ? (
                <textarea
                  value={values[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className={`${inputClass} min-h-20 resize-y`}
                />
              ) : field.type === "select" ? (
                (() => {
                  const parentValue = field.dependsOn ? values[field.dependsOn] : undefined;
                  const isLocked = Boolean(field.dependsOn) && !parentValue;
                  const options = field.optionsFor ? field.optionsFor(parentValue ?? "") : (field.options ?? []);
                  return (
                    <select
                      value={values[field.key] ?? ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      disabled={isLocked}
                      className={`${inputClass} disabled:opacity-60`}
                    >
                      <option value="" disabled>
                        {isLocked ? "Pilih field di atas dulu..." : (field.placeholder ?? "Pilih...")}
                      </option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  );
                })()
              ) : field.type === "searchselect" ? (
                (() => {
                  const parentValue = field.dependsOn ? values[field.dependsOn] : undefined;
                  const isLocked = Boolean(field.dependsOn) && !parentValue;
                  const options = field.optionsFor ? field.optionsFor(parentValue ?? "") : (field.options ?? []);
                  return (
                    <SearchSelectInput
                      value={values[field.key] ?? ""}
                      onChange={(next) => updateField(field.key, next)}
                      options={options}
                      placeholder={isLocked ? "Pilih field di atas dulu..." : (field.placeholder ?? "Cari...")}
                      allowFreeText={false}
                      disabled={isLocked}
                    />
                  );
                })()
              ) : (
                <input
                  type="text"
                  value={values[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className={inputClass}
                />
              )}
            </>
          )}
          {errors[field.key] && (
            <p className="mt-1 text-[11px] text-[#ba1a1a]">{errors[field.key]}</p>
          )}
        </div>
      ))}
      <div className="mt-2 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813] disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
