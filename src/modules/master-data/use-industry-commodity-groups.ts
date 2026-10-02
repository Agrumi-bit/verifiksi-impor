"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { CommodityOption } from "./use-commodity-groups";

export type { CommodityOption };

type IndustryGroupRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  name: string;
  code: string;
};

type CommodityGroupRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  name: string;
  code: string;
  industryGroupId: string | null;
};

/**
 * Active "Kelompok Komoditas" (IndustryGroup) / "Sub Kelompok Komoditas"
 * (CommodityGroup) master data — used by Step "Hasil Uji Mutu" (VIU Barang
 * Konsumsi) to classify which goods a quality test certificate covers, one
 * level higher than `useCommodityGroups` (which pairs CommodityGroup with its
 * own child CommoditySubGroup instead). CommodityGroup has no server-side
 * filter by its parent, so `commodityGroupOptionsFor` filters the (small,
 * master-data-sized) full list client-side instead of a second request per
 * industry group.
 */
export function useIndustryCommodityGroups() {
  const industryGroupQuery = useQuery({
    queryKey: ["master-data-industry-group", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/industry-group");
      if (!response.ok) throw new Error("Gagal memuat data kelompok komoditas");
      const json = (await response.json()) as { data: IndustryGroupRow[] };
      return json.data;
    },
  });

  const commodityGroupQuery = useQuery({
    queryKey: ["master-data-commodity-group", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/commodity-group");
      if (!response.ok) throw new Error("Gagal memuat data sub kelompok komoditas");
      const json = (await response.json()) as { data: CommodityGroupRow[] };
      return json.data;
    },
  });

  const industryGroupOptions: CommodityOption[] = useMemo(() => {
    return (industryGroupQuery.data ?? [])
      .filter((row) => row.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((row) => ({ value: row.id, label: row.name, hint: row.code }));
  }, [industryGroupQuery.data]);

  const commodityGroups = useMemo(
    () => (commodityGroupQuery.data ?? []).filter((row) => row.status === "ACTIVE"),
    [commodityGroupQuery.data],
  );

  function commodityGroupOptionsFor(industryGroupId: string | undefined): CommodityOption[] {
    if (!industryGroupId) return [];
    return commodityGroups
      .filter((row) => row.industryGroupId === industryGroupId)
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((row) => ({ value: row.id, label: row.name, hint: row.code }));
  }

  return {
    industryGroupOptions,
    commodityGroupOptionsFor,
    isLoading: industryGroupQuery.isLoading || commodityGroupQuery.isLoading,
  };
}
