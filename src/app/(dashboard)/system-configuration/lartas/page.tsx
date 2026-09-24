import type { Metadata } from "next";

import { LartasMasterDataPage } from "@/modules/master-data/components/lartas-master-data-page";

export const metadata: Metadata = {
  title: "Lartas Impor — Verifikasi Impor",
};

export default function LartasPage() {
  return <LartasMasterDataPage />;
}
