"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SearchSelectOption } from "@/components/form/search-select-input";

type CountryRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  name: string;
  code: string;
};

/**
 * Active countries from the CountryMasterData admin table, shaped as
 * SearchSelectInput options (value + label are the country name, `hint` is the
 * ISO code). Used for "negara asal" style fields that store the country name.
 */
export function useActiveCountries() {
  const query = useQuery({
    queryKey: ["master-data-country", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/country");
      if (!response.ok) throw new Error("Gagal memuat data negara");
      const json = (await response.json()) as { data: CountryRow[] };
      return json.data;
    },
  });

  const options: SearchSelectOption[] = useMemo(() => {
    return (query.data ?? [])
      .filter((country) => country.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((country) => ({ value: country.name, label: country.name, hint: country.code }));
  }, [query.data]);

  return { options, isLoading: query.isLoading };
}
