"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataPage } from "./master-data-page";

type CommodityGroupOption = { id: string; name: string };

export function CommoditySubGroupPage() {
  const { data: groups } = useQuery({
    queryKey: ["master-data-commodity-group", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/commodity-group");
      if (!response.ok) throw new Error("Gagal memuat kelompok komoditas");
      const json = (await response.json()) as { data: CommodityGroupOption[] };
      return json.data;
    },
  });

  return (
    <MasterDataPage
      title="Commodity Sub Group"
      description="Sub kategori dari kelompok komoditas."
      apiPath="/api/master-data/commodity-sub-group"
      queryKey="master-data-commodity-sub-group"
      columns={[
        { key: "name", label: "Commodity Sub Group Name" },
        { key: "code", label: "Sub Group Code" },
        {
          key: "commodityGroup",
          label: "Commodity Group",
          render: (row) =>
            (row.commodityGroup as CommodityGroupOption | undefined)?.name ?? "—",
        },
      ]}
      fields={[
        {
          key: "name",
          label: "Commodity Sub Group Name",
          type: "text",
          required: true,
          placeholder: "e.g. Katun",
        },
        {
          key: "code",
          label: "Sub Group Code",
          type: "text",
          required: true,
          placeholder: "e.g. 52.01",
        },
        {
          key: "commodityGroupId",
          label: "Commodity Group",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok komoditas...",
          options: groups?.map((group) => ({ value: group.id, label: group.name })) ?? [],
        },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      addButtonLabel="Add Commodity Sub Group"
    />
  );
}
