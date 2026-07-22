import type { Metadata } from "next";

import { MasterDataPage } from "@/modules/master-data/components/master-data-page";

export const metadata: Metadata = {
  title: "Commodity Group — Verifikasi Impor",
};

export default function CommodityGroupPage() {
  return (
    <MasterDataPage
      title="Commodity Group"
      description="Kelompok utama komoditas tekstil dan produk tekstil (TPT)."
      apiPath="/api/master-data/commodity-group"
      queryKey="master-data-commodity-group"
      columns={[
        { key: "name", label: "Commodity Group Name" },
        { key: "code", label: "Commodity Code" },
        { key: "description", label: "Description" },
      ]}
      fields={[
        { key: "name", label: "Commodity Group Name", type: "text", required: true, placeholder: "e.g. Serat Tekstil" },
        { key: "code", label: "Commodity Code", type: "text", required: true, placeholder: "e.g. 52" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      addButtonLabel="Add Commodity Group"
    />
  );
}
