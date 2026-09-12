"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type TrademarkClassRow = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  classNumber: string;
  title: string;
  category: string;
  description: string;
};

export type TrademarkClassOption = {
  value: string;
  label: string;
  hint: string;
  category: string;
};

/**
 * Active Nice Classification classes from the TrademarkClassMasterData admin
 * table (DJKI's Sistem Klasifikasi Merek — skm.dgip.go.id). `value` is the
 * zero-padded class number ("01".."45"), matching `Merk.trademarkClass`'s
 * stored values; `hint` is the short class title shown next to the number.
 */
export function useActiveTrademarkClasses() {
  const query = useQuery({
    queryKey: ["master-data-trademark-class", "active"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/trademark-class");
      if (!response.ok) throw new Error("Gagal memuat data klasifikasi merek");
      const json = (await response.json()) as { data: TrademarkClassRow[] };
      return json.data;
    },
  });

  const options: TrademarkClassOption[] = useMemo(() => {
    return (query.data ?? [])
      .filter((row) => row.status === "ACTIVE")
      .sort((a, b) => a.classNumber.localeCompare(b.classNumber, "id", { numeric: true }))
      .map((row) => ({
        value: row.classNumber,
        label: `Kelas ${row.classNumber} — ${row.title}`,
        hint: row.title,
        category: row.category,
      }));
  }, [query.data]);

  return { options, isLoading: query.isLoading };
}
