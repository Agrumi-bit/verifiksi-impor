"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataPage } from "./master-data-page";

type CommodityGroupOption = { id: string; name: string; industryGroupId?: string | null };
type NamedOption = { id: string; name: string };

const NO_INDUSTRY_GROUP = "__none__";

function industryGroupKey(industryGroupId: string | null | undefined): string {
  return industryGroupId || NO_INDUSTRY_GROUP;
}

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

  const { data: industryGroups } = useQuery({
    queryKey: ["master-data-industry-group", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/industry-group");
      if (!response.ok) throw new Error("Gagal memuat kelompok komoditas");
      const json = (await response.json()) as { data: NamedOption[] };
      return json.data;
    },
  });

  const groupOptions = (list: CommodityGroupOption[]) => list.map((group) => ({ value: group.id, label: group.name }));

  return (
    <MasterDataPage
      title="Komoditas"
      description="Sub kategori dari Sub Kelompok Komoditas."
      apiPath="/api/master-data/commodity-sub-group"
      queryKey="master-data-commodity-sub-group"
      filters={[
        {
          key: "industryGroupId",
          label: "Kelompok Komoditas",
          options: [
            ...(industryGroups?.map((group) => ({ value: group.id, label: group.name })) ?? []),
            { value: NO_INDUSTRY_GROUP, label: "— Belum ada Kelompok —" },
          ],
          getValue: (row) => industryGroupKey((row.commodityGroup as CommodityGroupOption | undefined)?.industryGroupId),
        },
        {
          key: "commodityGroupId",
          label: "Sub Kelompok Komoditas",
          options: groupOptions(groups ?? []),
          dependsOn: "industryGroupId",
          optionsFor: (industryGroupId) =>
            groupOptions((groups ?? []).filter((group) => industryGroupKey(group.industryGroupId) === industryGroupId)),
          getValue: (row) => (typeof row.commodityGroupId === "string" ? row.commodityGroupId : ""),
        },
        {
          key: "status",
          label: "Status",
          options: [
            { value: "ACTIVE", label: "Aktif" },
            { value: "INACTIVE", label: "Nonaktif" },
          ],
          getValue: (row) => row.status,
        },
      ]}
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
          options: groupOptions(groups ?? []),
        },
        { key: "description", label: "Deskripsi", type: "textarea" },
      ]}
      addButtonLabel="Tambah Komoditas"
    />
  );
}
