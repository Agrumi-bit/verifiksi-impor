"use client";

import { useQuery } from "@tanstack/react-query";

type HsCodeMasterDataRow = {
  id: string;
  hsCode: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  commodityGroupId: string;
  commodityGroup: {
    name: string;
    // Nullable in master data — rows that predate the Kelompok Komoditas level (see
    // CommodityGroup's own schema comment). Render "—" when absent, never an error.
    industryGroupId: string | null;
    industryGroup: { name: string } | null;
  };
  commoditySubGroupId: string;
  commoditySubGroup: { name: string };
  unitOfMeasurementId: string;
  unitOfMeasurement: { symbol: string; name: string } | null;
};

export type HsCodeOption = {
  value: string;
  label: string;
  hint: string;
  unit: string;
  hsCodeId: string;
  commoditySubGroupId: string;
  commoditySubGroupName: string;
  commodityGroupId: string;
  commodityGroupName: string;
  industryGroupId: string | null;
  industryGroupName: string | null;
};

function useHsCodeMasterData() {
  return useQuery({
    queryKey: ["master-data-hs-code", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/hs-code");
      if (!response.ok) throw new Error("Gagal memuat data HS Code");
      const json = (await response.json()) as { data: HsCodeMasterDataRow[] };
      return json.data;
    },
  });
}

/** HS Code combobox options — ACTIVE only, searchable by code or description (SearchSelectInput's
 * own matching already checks both `label` and `hint`). Carries the full master-data commodity
 * chain (hsCodeId + commoditySubGroup/commodityGroup/industryGroup ids and names) so picking one
 * HS Code auto-fills every derived field in one step — see ProductFormSheet's `handleHsCodeChange`.
 * `value`/`label` stay keyed by the HS Code string itself (the existing convention), not the id,
 * so this option list is a drop-in replacement for every pre-existing `useHsCodeOptions` caller. */
export function useHsCodeOptions(): HsCodeOption[] {
  const { data } = useHsCodeMasterData();

  return (data ?? [])
    .filter((row) => row.status === "ACTIVE")
    .map((row) => ({
      value: row.hsCode,
      label: row.hsCode,
      hint: row.description,
      unit: row.unitOfMeasurement?.symbol ?? row.unitOfMeasurement?.name ?? "",
      hsCodeId: row.id,
      commoditySubGroupId: row.commoditySubGroupId,
      commoditySubGroupName: row.commoditySubGroup.name,
      commodityGroupId: row.commodityGroupId,
      commodityGroupName: row.commodityGroup.name,
      industryGroupId: row.commodityGroup.industryGroupId,
      industryGroupName: row.commodityGroup.industryGroup?.name ?? null,
    }));
}

/** Satuan resmi terdaftar untuk sebuah HS Code — "satuan mengikuti HS Code", bukan diketik bebas. */
export function useHsCodeUnit(hsCode: string | undefined): string {
  const options = useHsCodeOptions();
  if (!hsCode) return "";
  return options.find((option) => option.value === hsCode)?.unit ?? "";
}
