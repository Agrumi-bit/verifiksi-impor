import type { Metadata } from "next";

import { CommodityGroupPage } from "@/modules/master-data/components/commodity-group-page";

export const metadata: Metadata = {
  title: "Commodity Group — Verifikasi Impor",
};

export default function Page() {
  return <CommodityGroupPage />;
}
