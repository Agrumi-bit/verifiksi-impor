"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type CommodityGroupRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  name: string;
  code: string;
};

type CommoditySubGroupRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  name: string;
  code: string;
  commodityGroupId: string;
};

export type CommodityOption = {
  value: string;
  label: string;
  hint: string;
};

/**
 * Active Commodity Group / Sub Group master data — used by Step "Hasil Uji
 * Mutu" (VIU Barang Konsumsi) to classify which goods a quality test
 * certificate covers, same shape `qualityTestEntrySchema` already expects
 * for Brand Master's own quality tests. Sub-group has no server-side filter
 * by group, so `subGroupOptionsFor` filters the (small, master-data-sized)
 * full list client-side instead of a second request per group.
 */
export function useCommodityGroups() {
  const groupQuery = useQuery({
    queryKey: ["master-data-commodity-group", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/commodity-group");
      if (!response.ok) throw new Error("Gagal memuat data kelompok komoditas");
      const json = (await response.json()) as { data: CommodityGroupRow[] };
      return json.data;
    },
  });

  const subGroupQuery = useQuery({
    queryKey: ["master-data-commodity-sub-group", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/commodity-sub-group");
      if (!response.ok) throw new Error("Gagal memuat data sub-kelompok komoditas");
      const json = (await response.json()) as { data: CommoditySubGroupRow[] };
      return json.data;
    },
  });

  const groupOptions: CommodityOption[] = useMemo(() => {
    return (groupQuery.data ?? [])
      .filter((row) => row.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((row) => ({ value: row.id, label: row.name, hint: row.code }));
  }, [groupQuery.data]);

  const subGroups = useMemo(
    () => (subGroupQuery.data ?? []).filter((row) => row.status === "ACTIVE"),
    [subGroupQuery.data],
  );

  function subGroupOptionsFor(commodityGroupId: string | undefined): CommodityOption[] {
    if (!commodityGroupId) return [];
    return subGroups
      .filter((row) => row.commodityGroupId === commodityGroupId)
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map((row) => ({ value: row.id, label: row.name, hint: row.code }));
  }

  return {
    groupOptions,
    subGroupOptionsFor,
    isLoading: groupQuery.isLoading || subGroupQuery.isLoading,
  };
}
