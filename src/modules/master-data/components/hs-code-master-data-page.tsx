"use client";

import { useQuery } from "@tanstack/react-query";

import { MasterDataPage } from "./master-data-page";

type NamedOption = { id: string; name: string };

function useOptions(path: string, key: string) {
  return useQuery({
    queryKey: [key, "options"],
    queryFn: async () => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: NamedOption[] };
      return json.data;
    },
  });
}

export function HsCodeMasterDataPage() {
  const { data: groups } = useOptions(
    "/api/master-data/commodity-group",
    "master-data-commodity-group",
  );
  const { data: subGroups } = useOptions(
    "/api/master-data/commodity-sub-group",
    "master-data-commodity-sub-group",
  );
  const { data: units } = useQuery({
    queryKey: ["master-data-uom", "options"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/unit-of-measurement");
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as {
        data: { id: string; name: string; symbol: string }[];
      };
      return json.data;
    },
  });

  return (
    <MasterDataPage
      title="HS Code Master Data"
      description="Database referensi HS Code untuk sektor Tekstil dan Produk Tekstil (TPT) sesuai Lampiran I Permenperin No. 27 Tahun 2025."
      apiPath="/api/master-data/hs-code"
      queryKey="master-data-hs-code"
      columns={[
        { key: "hsCode", label: "Pos Tarif / HS Code" },
        { key: "description", label: "Uraian Barang" },
        {
          key: "commodityGroup",
          label: "Kelompok Komoditas",
          render: (row) =>
            (row.commodityGroup as NamedOption | undefined)?.name ?? "—",
        },
        {
          key: "unitOfMeasurement",
          label: "Satuan",
          render: (row) =>
            (row.unitOfMeasurement as NamedOption | undefined)?.name ?? "—",
        },
      ]}
      fields={[
        {
          key: "hsCode",
          label: "Pos Tarif / HS Code",
          type: "text",
          required: true,
          placeholder: "e.g. 5205.31.00",
        },
        {
          key: "description",
          label: "Uraian Barang",
          type: "text",
          required: true,
          placeholder: "e.g. Benang katun, tunggal, dari serat tidak disikat",
        },
        {
          key: "commodityGroupId",
          label: "Kelompok Komoditas",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok komoditas...",
          options: groups?.map((group) => ({ value: group.id, label: group.name })) ?? [],
        },
        {
          key: "commoditySubGroupId",
          label: "Sub Kelompok Komoditas",
          type: "select",
          required: true,
          placeholder: "Pilih sub kelompok komoditas...",
          options:
            subGroups?.map((subGroup) => ({
              value: subGroup.id,
              label: subGroup.name,
            })) ?? [],
        },
        {
          key: "unitOfMeasurementId",
          label: "Satuan",
          type: "select",
          required: true,
          placeholder: "Pilih satuan...",
          options: units?.map((unit) => ({ value: unit.id, label: unit.name })) ?? [],
        },
      ]}
      addButtonLabel="Tambah HS Code"
    />
  );
}
