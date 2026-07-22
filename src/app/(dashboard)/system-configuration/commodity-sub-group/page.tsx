import type { Metadata } from "next";

import { CommoditySubGroupPage } from "@/modules/master-data/components/commodity-sub-group-page";

export const metadata: Metadata = {
  title: "Commodity Sub Group — Verifikasi Impor",
};

export default function Page() {
  return <CommoditySubGroupPage />;
}
