"use client";

import { useQuery } from "@tanstack/react-query";

/** Active units from the Satuan master data (their symbol), sorted. */
export function useUnitOptions(): string[] {
  const { data } = useQuery({
    queryKey: ["master-data-uom", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/unit-of-measurement");
      if (!response.ok) throw new Error("Gagal memuat satuan");
      return ((await response.json()) as { data: { name: string; symbol: string; status?: string }[] }).data;
    },
  });
  return [...new Set((data ?? []).filter((u) => !u.status || u.status === "ACTIVE").map((u) => (u.symbol || u.name).trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "id"),
  );
}

/**
 * Satuan picker over the master data. `value` empty shows the placeholder; a saved value that is not
 * (or no longer) in the master data stays selectable so it is never silently dropped.
 */
export function UnitSelect({
  value,
  onChange,
  className = "h-9 w-24 rounded-md border border-input bg-transparent px-2 text-xs",
  placeholder = "satuan",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const options = useUnitOptions();
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">{placeholder}</option>
      {all.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}
