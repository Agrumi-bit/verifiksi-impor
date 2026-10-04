import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";
import { KBLI_VERSIONS } from "@/modules/master-data/schema";

export const metadata: Metadata = {
  title: "KBLI Utama API-U — Verifikasi Impor",
};

export default function ApiUKbliUtamaPage() {
  return (
    <MasterDataPage
      title="KBLI Utama API-U"
      description="Daftar KBLI Utama yang boleh dipilih perusahaan dengan Angka Pengenal Importir Umum (API-U) pada form Tambah Perusahaan dan profil perusahaan. Satu baris per kode dan versi KBLI — tambahkan kode yang sama dua kali bila berlaku di KBLI 2020 dan 2025. Hanya data berstatus aktif yang dipakai; bila semua dinonaktifkan, KBLI Utama API-U tidak dibatasi."
      apiPath="/api/master-data/api-u-kbli-utama"
      queryKey="master-data-api-u-kbli-utama"
      columns={[
        { key: "code", label: "KBLI" },
        { key: "description", label: "Judul KBLI" },
        { key: "version", label: "Versi" },
      ]}
      fields={[
        { key: "code", label: "Kode KBLI", type: "text", required: true, placeholder: "e.g. 46411" },
        {
          key: "description",
          label: "Judul KBLI",
          type: "text",
          required: true,
          placeholder: "e.g. Perdagangan Besar Tekstil",
        },
        {
          key: "version",
          label: "Versi",
          type: "select",
          required: true,
          options: KBLI_VERSIONS.map((v) => ({ value: v, label: v })),
        },
      ]}
      addButtonLabel="Tambah KBLI Utama API-U"
      requireReasonOnDeactivate
    />
  );
}
