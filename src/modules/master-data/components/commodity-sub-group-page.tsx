"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataPage } from "./master-data-page";

type CommodityGroupOption = { id: string; name: string };

export function CommoditySubGroupPage() {
  const { data: groups } = useQuery({
    queryKey: ["master-data-commodity-group", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/commodity-group");
      if (!response.ok) throw new Error("Gagal memuat sub kelompok komoditas");
      const json = (await response.json()) as { data: CommodityGroupOption[] };
      return json.data;
    },
  });

  return (
    <MasterDataPage
      title="Komoditas"
      description="Sub kategori dari Sub Kelompok Komoditas."
      apiPath="/api/master-data/commodity-sub-group"
      queryKey="master-data-commodity-sub-group"
      columns={[
        { key: "name", label: "Nama Komoditas" },
        { key: "code", label: "Kode Komoditas" },
        {
          key: "commodityGroup",
          label: "Sub Kelompok Komoditas",
          render: (row) =>
            (row.commodityGroup as CommodityGroupOption | undefined)?.name ?? "—",
        },
      ]}
      fields={[
        {
          key: "name",
          label: "Nama Komoditas",
          type: "text",
          required: true,
          placeholder: "e.g. Katun",
        },
        {
          key: "code",
          label: "Kode Komoditas",
          type: "text",
          required: true,
          placeholder: "e.g. 52.01",
        },
        {
          key: "commodityGroupId",
          label: "Sub Kelompok Komoditas",
          type: "select",
          required: true,
          placeholder: "Pilih sub kelompok komoditas...",
          options: groups?.map((group) => ({ value: group.id, label: group.name })) ?? [],
        },
        { key: "description", label: "Deskripsi", type: "textarea" },
      ]}
      addButtonLabel="Tambah Komoditas"
    />
  );
}
