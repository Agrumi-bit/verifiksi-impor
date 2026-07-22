import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";

export const metadata: Metadata = {
  title: "Unit of Measurement — Verifikasi Impor",
};

export default function UnitOfMeasurementPage() {
  return (
    <MasterDataPage
      title="Unit of Measurement"
      description="Satuan standar perdagangan yang digunakan pada HS Code Master Data."
      apiPath="/api/master-data/unit-of-measurement"
      queryKey="master-data-uom"
      columns={[
        { key: "name", label: "Nama Satuan" },
        { key: "symbol", label: "Simbol" },
        { key: "description", label: "Deskripsi" },
      ]}
      fields={[
        { key: "name", label: "Nama Satuan", type: "text", required: true, placeholder: "e.g. Kilogram" },
        { key: "symbol", label: "Simbol", type: "text", required: true, placeholder: "e.g. Kg" },
        { key: "description", label: "Deskripsi", type: "textarea" },
      ]}
      addButtonLabel="Tambah Satuan"
    />
  );
}
