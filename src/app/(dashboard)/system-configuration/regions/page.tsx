import type { Metadata } from "next";

import { RegionDataPage } from "@/modules/system-configuration/components/region-data-page";

export const metadata: Metadata = {
  title: "Data Wilayah — Verifikasi Impor",
};

export default function Page() {
  return <RegionDataPage />;
}
