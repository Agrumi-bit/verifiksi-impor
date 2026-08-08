"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

export type SearchSelectOption = {
  value: string;
  label: string;
  hint?: string;
  unit?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  onSelectOption?: (option: SearchSelectOption) => void;
  /**
   * When false, `onChange` only fires when the user picks an option from the list — typed text
   * that never resolves to a real option is discarded instead of being saved as the value. Use
   * this for fields where `value` is an opaque reference (e.g. a foreign key id) that must always
   * point at a real row. Defaults to true, which keeps the original behavior for fields where the
   * searchable text *is* the value (e.g. typing an HS Code not yet in the master list).
   */
  allowFreeText?: boolean;
};

export function SearchSelectInput({
  value,
  onChange,
  options,
  placeholder,
  onSelectOption,
  allowFreeText = true,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // The input shows the matched option's label (e.g. "5205.11.00 — Benang katun") while `value`
  // itself can be a plain code or an opaque id — the two only coincide when label === value.
  const [query, setQuery] = useState(() => options.find((o) => o.value === value)?.label ?? value ?? "");
  const [syncedValue, setSyncedValue] = useState(value);

  // Resync the displayed text when `value` changes externally (e.g. form reset), adjusted during
  // render rather than an effect. Skipped while open so it doesn't fight the user's own typing.
  if (value !== syncedValue && !isOpen) {
    setSyncedValue(value);
    setQuery(options.find((o) => o.value === value)?.label ?? value ?? "");
  }

  const q = query.trim().toLowerCase();
  const filtered = (
    q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options
  ).slice(0, 20);

  return (
    <div className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setIsOpen(true);
          if (allowFreeText) onChange(next);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.value);
                setQuery(option.label);
                onSelectOption?.(option);
                setIsOpen(false);
              }}
            >
              <span className="font-medium">{option.label}</span>
              {option.hint && (
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
