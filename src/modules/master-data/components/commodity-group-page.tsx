"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataPage } from "./master-data-page";

type NamedOption = { id: string; name: string };

export function CommodityGroupPage() {
  const { data: industryGroups } = useQuery({
    queryKey: ["master-data-industry-group", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/industry-group");
      if (!response.ok) throw new Error("Gagal memuat kelompok komoditas");
      const json = (await response.json()) as { data: NamedOption[] };
      return json.data;
    },
  });

  return (
    <MasterDataPage
      title="Sub Kelompok Komoditas"
      description="Sub kelompok komoditas tekstil dan produk tekstil (TPT), di bawah Kelompok Komoditas."
      apiPath="/api/master-data/commodity-group"
      queryKey="master-data-commodity-group"
      columns={[
        { key: "name", label: "Nama Sub Kelompok Komoditas" },
        { key: "code", label: "Kode" },
        {
          key: "industryGroup",
          label: "Kelompok Komoditas",
          render: (row) => (row.industryGroup as NamedOption | undefined)?.name ?? "—",
        },
        { key: "description", label: "Deskripsi" },
      ]}
      fields={[
        { key: "name", label: "Nama Sub Kelompok Komoditas", type: "text", required: true, placeholder: "e.g. Serat Tekstil" },
        { key: "code", label: "Kode", type: "text", required: true, placeholder: "e.g. 52" },
        {
          key: "industryGroupId",
          label: "Kelompok Komoditas",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok komoditas...",
          options: industryGroups?.map((group) => ({ value: group.id, label: group.name })) ?? [],
        },
        { key: "description", label: "Deskripsi", type: "textarea" },
      ]}
      addButtonLabel="Tambah Sub Kelompok Komoditas"
    />
  );
}
