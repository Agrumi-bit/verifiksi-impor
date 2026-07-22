"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form/form-field";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <MasterDataForm
            fields={fields}
            initialValues={initialValues}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
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
    const raw = initialValues?.[field.key];
    next[field.key] = typeof raw === "string" ? raw : "";
  }
  return next;
}

function MasterDataForm({
  fields,
  initialValues,
  onSubmit,
  onCancel,
  onDone,
}: FormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(fields, initialValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {fields.map((field) => (
        <FormField
          key={field.key}
          label={field.label}
          required={field.required}
          error={errors[field.key]}
        >
          {field.type === "textarea" ? (
            <Textarea
              value={values[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) => updateField(field.key, event.target.value)}
            />
          ) : field.type === "select" ? (
            <Select
              value={values[field.key] ?? ""}
              onValueChange={(value) => updateField(field.key, value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    field.options?.find((option) => option.value === value)
                      ?.label ?? field.placeholder ?? "Pilih..."
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={values[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(event) => updateField(field.key, event.target.value)}
            />
          )}
        </FormField>
      ))}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
