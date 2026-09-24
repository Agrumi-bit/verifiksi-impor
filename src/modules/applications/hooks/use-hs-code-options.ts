"use client";

import { useQuery } from "@tanstack/react-query";

type HsCodeMasterDataRow = {
  id: string;
  hsCode: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  unitOfMeasurement: { symbol: string; name: string } | null;
};

export function useHsCodeOptions() {
  const { data } = useQuery({
    queryKey: ["master-data-hs-code", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/hs-code");
      if (!response.ok) throw new Error("Gagal memuat data HS Code");
      const json = (await response.json()) as { data: HsCodeMasterDataRow[] };
      return json.data;
    },
  });

  return (data ?? [])
    .filter((row) => row.status === "ACTIVE")
    .map((row) => ({
      value: row.hsCode,
      label: row.hsCode,
      hint: row.description,
      unit: row.unitOfMeasurement?.symbol ?? row.unitOfMeasurement?.name ?? "",
    }));
}

/** Satuan resmi terdaftar untuk sebuah HS Code — "satuan mengikuti HS Code", bukan diketik bebas. */
export function useHsCodeUnit(hsCode: string | undefined): string {
  const options = useHsCodeOptions();
  if (!hsCode) return "";
  return options.find((option) => option.value === hsCode)?.unit ?? "";
}
