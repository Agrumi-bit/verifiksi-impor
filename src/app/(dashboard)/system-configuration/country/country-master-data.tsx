"use client";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";
import { countryCodeToFlag } from "@/modules/master-data/country-flag";

// Column `render` is a function — it can only be defined inside a Client
// Component, since a Server Component can't pass functions as props across
// the server/client boundary (see the country page.tsx split: that file
// keeps `metadata`, which requires staying a Server Component).
export function CountryMasterData() {
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
