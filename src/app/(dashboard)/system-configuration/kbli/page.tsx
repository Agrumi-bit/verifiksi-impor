import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";

export const metadata: Metadata = {
  title: "KBLI Master Data — Verifikasi Impor",
};

export default function KbliMasterDataPage() {
  return (
    <MasterDataPage
      title="KBLI Master Data"
      description="Klasifikasi Baku Lapangan Usaha Indonesia — dipilih otomatis di Legal Information wizard."
      apiPath="/api/master-data/kbli"
      queryKey="master-data-kbli"
      columns={[
        { key: "code", label: "Kode KBLI" },
        { key: "description", label: "Deskripsi Kegiatan" },
      ]}
      fields={[
        { key: "code", label: "Kode KBLI", type: "text", required: true, placeholder: "e.g. 13121" },
        {
          key: "description",
          label: "Deskripsi Kegiatan",
          type: "text",
          required: true,
          placeholder: "e.g. Industri Pertenunan",
        },
      ]}
      addButtonLabel="Tambah KBLI"
    />
  );
}
