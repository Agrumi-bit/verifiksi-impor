"use client";

import { MasterDataPage } from "./master-data-page";

const KELOMPOK_OPTIONS = [
  "Sosial",
  "Rumah Tangga",
  "Bisnis",
  "Industri",
  "Pemerintah & Penerangan Jalan Umum",
  "Traksi",
  "Curah",
  "Layanan Khusus",
];

export function ElectricityTariffPage() {
  return (
    <MasterDataPage
      title="Golongan Tarif Listrik"
      description="Referensi golongan Tarif Tenaga Listrik PLN sesuai Permen ESDM Nomor 7 Tahun 2024 — dipakai Technical Analyst untuk estimasi pembayaran listrik pada Analisis Teknis VKI."
      apiPath="/api/master-data/electricity-tariff"
      queryKey="master-data-electricity-tariff"
      columns={[
        { key: "kelompok", label: "Kelompok" },
        { key: "golongan", label: "Golongan Tarif Listrik" },
        { key: "batasDaya", label: "Batas Daya" },
        { key: "tarifPerKwh", label: "Tarif per kWh (Rp)" },
        { key: "keterangan", label: "Keterangan" },
      ]}
      fields={[
        {
          key: "kelompok",
          label: "Kelompok",
          type: "select",
          required: true,
          placeholder: "Pilih kelompok...",
          options: KELOMPOK_OPTIONS.map((k) => ({ value: k, label: k })),
        },
        { key: "golongan", label: "Golongan Tarif Listrik", type: "text", required: true, placeholder: "e.g. I-3/TM" },
        { key: "batasDaya", label: "Batas Daya", type: "text", required: true, placeholder: "e.g. lebih dari 200 kVA s.d. kurang dari 30.000 kVA" },
        { key: "tarifPerKwh", label: "Tarif per kWh (Rp)", type: "text", required: true, placeholder: "e.g. 1.035,78" },
        { key: "keterangan", label: "Keterangan", type: "textarea", placeholder: "Rincian blok WBP/LWBP, faktor K, dsb." },
      ]}
      addButtonLabel="Tambah Golongan Tarif"
    />
  );
}
