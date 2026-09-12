import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";
import { countryCodeToFlag } from "@/modules/master-data/country-flag";

export const metadata: Metadata = {
  title: "Data Negara — Verifikasi Impor",
};

export default function CountryMasterDataPage() {
  return (
    <MasterDataPage
      title="Data Negara"
      description="Daftar negara yang dipakai untuk negara asal merek dan field asal lainnya."
      apiPath="/api/master-data/country"
      queryKey="master-data-country"
      columns={[
        {
          key: "name",
          label: "Nama Negara",
          render: (row) => {
            const flag = countryCodeToFlag(row.code as string | undefined);
            const name = typeof row.name === "string" ? row.name : "—";
            return flag ? `${flag} ${name}` : name;
          },
        },
        { key: "code", label: "Kode Negara" },
      ]}
      fields={[
        { key: "name", label: "Nama Negara", type: "text", required: true, placeholder: "e.g. Republik Rakyat Tiongkok" },
        { key: "code", label: "Kode Negara (ISO)", type: "text", required: true, placeholder: "e.g. CN" },
      ]}
      addButtonLabel="Tambah Negara"
    />
  );
}
