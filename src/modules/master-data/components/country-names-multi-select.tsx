"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { useActiveCountries } from "../use-active-countries";

/** Country names stored in one text field, e.g. "Tiongkok, Vietnam". */
export const COUNTRY_NAMES_SEPARATOR = ", ";

export function splitCountryNames(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\s*[,;]\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function joinCountryNames(names: readonly string[]): string {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))].join(COUNTRY_NAMES_SEPARATOR);
}

/**
 * Multi-select "Negara Asal" picker over the Country master data (active countries), for fields
 * that store country NAMES as one text value (joined with ", ") — same name-keyed convention as
 * `useActiveCountries`. A name already saved that is not in the master data (older free text) is
 * kept as a chip until removed. The option list is positioned `fixed`, so it is not clipped inside
 * scrollable tables.
 */
export function CountryNamesMultiSelect({
  value,
  onChange,
  disabled,
  placeholder = "Pilih negara…",
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { options, isLoading } = useActiveCountries();
  // Local copy so several quick picks build on each other before the parent's saved value comes back.
  const [current, setCurrent] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setCurrent(value);
  }
  const selected = splitCountryNames(current);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!box) return;
    const close = () => setBox(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [box]);

  function open() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setBox({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) });
  }

  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !selected.includes(o.value));
  const filtered = (q ? available.filter((o) => o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q)) : available).slice(0, 30);

  function commit(next: string) {
    setCurrent(next);
    onChange(next);
  }

  function add(name: string) {
    commit(joinCountryNames([...selected, name]));
    setQuery("");
    setBox(null);
  }

  function remove(name: string) {
    commit(joinCountryNames(selected.filter((n) => n !== name)));
  }

  return (
    <div className="flex min-w-[180px] flex-col gap-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-[#f2ece5] px-2 py-0.5 text-[11px] font-semibold text-[#4a4038]">
              {name}
              {!disabled && (
                <button type="button" onClick={() => remove(name)} aria-label={`Hapus ${name}`} className="text-[#a68f80] hover:text-[#c1361f]">
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={isLoading ? "Memuat negara…" : placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            open();
          }}
          onFocus={open}
          onBlur={() => setTimeout(() => setBox(null), 150)}
          className="w-full rounded-md border border-[#e8dccd] bg-white px-2 py-1 text-[11.5px] text-[#20180f] outline-none focus:border-[#e0662e]"
        />
      )}
      {box && filtered.length > 0 && (
        <div
          className="fixed z-[70] max-h-56 overflow-y-auto rounded-lg border border-[#e8dccd] bg-white shadow-md"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] hover:bg-[#faf1e8]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(option.value)}
            >
              <span className="font-medium text-[#20180f]">{option.label}</span>
              <span className="text-[10.5px] text-[#a68f80]">{option.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
