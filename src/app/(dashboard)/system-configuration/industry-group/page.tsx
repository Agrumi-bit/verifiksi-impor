import type { Metadata } from "next";

import { IndustryGroupPage } from "@/modules/master-data/components/industry-group-page";

export const metadata: Metadata = {
  title: "Kelompok Industri — Verifikasi Impor",
};

export default function Page() {
  return <IndustryGroupPage />;
}
