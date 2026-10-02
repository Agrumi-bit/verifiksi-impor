import type { Metadata } from "next";

import { CommodityGroupPage } from "@/modules/master-data/components/commodity-group-page";

export const metadata: Metadata = {
  title: "Sub Kelompok Komoditas — Verifikasi Impor",
};

export default function Page() {
  return <CommodityGroupPage />;
}
