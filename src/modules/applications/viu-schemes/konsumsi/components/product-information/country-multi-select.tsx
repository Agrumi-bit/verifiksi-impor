"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";

type CountryRow = { id: string; status: "ACTIVE" | "INACTIVE"; name: string; code: string };

/** Code-keyed country options — deliberately separate from `useActiveCountries` (name-keyed, used
 * by every other "negara asal" field in this app). Konsumsi's `originCountries` stores ISO codes,
 * so this fetches the same master data but maps `value` to `code` instead of `name`. */
export function useActiveCountriesByCode() {
  const { data } = useQuery({
    queryKey: ["master-data-country", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/country");
      if (!response.ok) throw new Error("Gagal memuat data negara");
      const json = (await response.json()) as { data: CountryRow[] };
      return json.data;
    },
  });
  return (data ?? [])
    .filter((country) => country.status === "ACTIVE")
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

/** Multi-select searchable country picker with removable chips — "Asal Negara" for one Konsumsi
 * Product can be more than one country (see konsumsiProductSchema's own `originCountries`
 * comment). Each chip shows "Name (CODE)"; the search box only ever adds a country, it never
 * holds a "current value" of its own the way a single-select would. */
export function CountryMultiSelect({ value, onChange, disabled }: Props) {
  const countries = useActiveCountriesByCode();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selected = value
    .map((code) => countries.find((c) => c.code === code) ?? { id: code, code, name: code, status: "ACTIVE" as const })
    .filter(Boolean);

  const q = query.trim().toLowerCase();
  const available = countries.filter((c) => !value.includes(c.code));
  const filtered = (q ? available.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : available).slice(0, 20);

  function addCountry(code: string) {
    if (value.includes(code)) return;
    onChange([...value, code]);
    setQuery("");
    setIsOpen(false);
  }

  function removeCountry(code: string) {
    onChange(value.filter((c) => c !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((country) => (
            <span
              key={country.code}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              {country.name} ({country.code})
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCountry(country.code)}
                  aria-label={`Hapus ${country.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <Input
            value={query}
            placeholder="Cari & pilih satu atau lebih negara…"
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          />
          {isOpen && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
              {filtered.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addCountry(country.code)}
                >
                  <span className="font-medium">{country.name}</span>
                  <span className="text-xs text-muted-foreground">{country.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
