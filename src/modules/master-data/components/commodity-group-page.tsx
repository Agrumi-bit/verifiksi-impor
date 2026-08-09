"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataPage } from "./master-data-page";

type NamedOption = { id: string; name: string };

export function CommodityGroupPage() {
  const { data: industryGroups } = useQuery({
    queryKey: ["master-data-industry-group", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/industry-group");
      if (!response.ok) throw new Error("Gagal memuat kelompok industri");
      const json = (await response.json()) as { data: NamedOption[] };
      return json.data;
    },
  });

  return (
    <MasterDataPage
      title="Commodity Group"
      description="Kelompok utama komoditas tekstil dan produk tekstil (TPT)."
      apiPath="/api/master-data/commodity-group"
      queryKey="master-data-commodity-group"
      columns={[
        { key: "name", label: "Commodity Group Name" },
        { key: "code", label: "Commodity Code" },
        {
          key: "industryGroup",
          label: "Kelompok Industri",
          render: (row) => (row.industryGroup as NamedOption | undefined)?.name ?? "—",
        },
        { key: "description", label: "Description" },
      ]}
      fields={[
        { key: "name", label: "Commodity Group Name", type: "text", required: true, placeholder: "e.g. Serat Tekstil" },
        { key: "code", label: "Commodity Code", type: "text", required: true, placeholder: "e.g. 52" },
        {
          key: "industryGroupId",
          label: "Kelompok Industri",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok industri...",
          options: industryGroups?.map((group) => ({ value: group.id, label: group.name })) ?? [],
        },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      addButtonLabel="Add Commodity Group"
    />
  );
}
