"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

export type SearchSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  onSelectOption?: (option: SearchSelectOption) => void;
};

export function SearchSelectInput({
  value,
  onChange,
  options,
  placeholder,
  onSelectOption,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const query = value.trim().toLowerCase();
  const filtered = (
    query
      ? options.filter((option) => option.label.toLowerCase().includes(query))
      : options
  ).slice(0, 20);

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
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
