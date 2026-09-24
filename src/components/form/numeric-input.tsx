"use client";

import { Input } from "@/components/ui/input";

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

type Props = {
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Digit-only input displayed with Indonesian thousand separators (1.000.000)
 * while the underlying form value stays a plain digit string ("1000000") —
 * so downstream validation/export never has to parse separators back out.
 */
export function NumericInput({ value, onChange, onBlur, name, placeholder, disabled }: Props) {
  return (
    <Input
      name={name}
      inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      value={formatThousands(stripNonDigits(value ?? ""))}
      onChange={(event) => onChange(stripNonDigits(event.target.value))}
      onBlur={onBlur}
    />
  );
}
