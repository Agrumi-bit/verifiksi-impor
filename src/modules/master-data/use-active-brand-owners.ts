"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SearchSelectOption } from "@/components/form/search-select-input";

type BrandOwnerRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  name: string;
  city: string | null;
};

/**
 * Active BrandOwner rows ("Mitra Pemilik Merek"), shaped as SearchSelectInput
 * options — unlike countries, the option value is the row `id` (a foreign
 * key), not the display name.
 */
export function useActiveBrandOwners() {
  const query = useQuery({
    queryKey: ["master-data-brand-owner", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/brand-owner");
      if (!response.ok) throw new Error("Gagal memuat data pemilik merek");
      const json = (await response.json()) as { data: BrandOwnerRow[] };
      return json.data;
    },
  });

  const options: SearchSelectOption[] = useMemo(() => {
    return (query.data ?? [])
      .filter((owner) => owner.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((owner) => ({ value: owner.id, label: owner.name, hint: owner.city ?? undefined }));
  }, [query.data]);

  return { options, isLoading: query.isLoading };
}
