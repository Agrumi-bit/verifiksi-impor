import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";
import { KBLI_VERSIONS } from "@/modules/master-data/schema";

export const metadata: Metadata = {
  title: "KBLI Master Data — Verifikasi Impor",
};

export default function KbliMasterDataPage() {
  return (
    <MasterDataPage
      title="KBLI Master Data"
      description="Kelola daftar Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) yang digunakan untuk mengkategorikan perusahaan."
      apiPath="/api/master-data/kbli"
      queryKey="master-data-kbli"
      columns={[
        { key: "code", label: "Kode KBLI" },
        { key: "description", label: "Uraian" },
        { key: "category", label: "Kategori" },
        { key: "version", label: "Versi" },
      ]}
      fields={[
        { key: "code", label: "Kode KBLI", type: "text", required: true, placeholder: "e.g. 13121" },
        {
          key: "description",
          label: "Uraian",
          type: "text",
          required: true,
          placeholder: "e.g. Industri Pertenunan",
        },
        {
          key: "category",
          label: "Kategori",
          type: "text",
          placeholder: "Tekstil, Garmen, ...",
        },
        {
          key: "version",
          label: "Versi",
          type: "select",
          required: true,
          options: KBLI_VERSIONS.map((v) => ({ value: v, label: v })),
        },
      ]}
      addButtonLabel="Tambah Kode KBLI"
      requireReasonOnDeactivate
    />
  );
}
