import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";
import { TRADEMARK_CLASS_CATEGORIES } from "@/modules/master-data/schema";

export const metadata: Metadata = {
  title: "Klasifikasi Merek — Verifikasi Impor",
};

export default function TrademarkClassMasterDataPage() {
  return (
    <MasterDataPage
      title="Klasifikasi Merek"
      description="Kelas Nice (Klasifikasi Internasional Merek) sesuai Sistem Klasifikasi Merek DJKI (skm.dgip.go.id) — dipakai pada field Kelas Merek Step 1 pendaftaran merek."
      apiPath="/api/master-data/trademark-class"
      queryKey="master-data-trademark-class"
      columns={[
        { key: "classNumber", label: "Kelas" },
        { key: "title", label: "Nama Kelas" },
        { key: "category", label: "Kategori" },
      ]}
      fields={[
        { key: "classNumber", label: "Nomor Kelas", type: "text", required: true, placeholder: "e.g. 09" },
        { key: "title", label: "Nama Kelas", type: "text", required: true, placeholder: "e.g. Perangkat Elektronik dan Ilmiah" },
        {
          key: "category",
          label: "Kategori",
          type: "select",
          required: true,
          options: TRADEMARK_CLASS_CATEGORIES.map((value) => ({ value, label: value })),
        },
        { key: "description", label: "Uraian Kelas", type: "textarea", required: true, placeholder: "Uraian lengkap cakupan kelas sesuai Klasifikasi Nice" },
      ]}
      addButtonLabel="Tambah Kelas"
    />
  );
}
