import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";

export const metadata: Metadata = {
  title: "Pemilik Merek — Verifikasi Impor",
};

export default function BrandOwnerMasterDataPage() {
  return (
    <MasterDataPage
      title="Pemilik Merek"
      description="Daftar perusahaan pemilik merek (“Mitra Pemilik Merek”) yang dapat dipilih pada Step 3 pendaftaran merek."
      apiPath="/api/master-data/brand-owner"
      queryKey="master-data-brand-owner"
      columns={[
        { key: "name", label: "Nama Perusahaan" },
        { key: "city", label: "Kota" },
        { key: "contactPerson", label: "Contact Person" },
      ]}
      fields={[
        { key: "name", label: "Nama Perusahaan", type: "text", required: true, placeholder: "e.g. Global Textile Co., Ltd." },
        { key: "city", label: "Kota", type: "text", placeholder: "e.g. Guangzhou" },
        { key: "contactPerson", label: "Contact Person", type: "text" },
        { key: "contactEmail", label: "Email Kontak", type: "text" },
        { key: "contactPhone", label: "Telepon Kontak", type: "text" },
      ]}
      addButtonLabel="Tambah Pemilik Merek"
    />
  );
}
