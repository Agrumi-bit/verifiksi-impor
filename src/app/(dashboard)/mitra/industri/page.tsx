import type { Metadata } from "next";

import { MitraTable } from "@/modules/mitra/components/mitra-table";

export const metadata: Metadata = {
  title: "Mitra Industri — Verifikasi Impor",
};

export default function MitraIndustriPage() {
  return <MitraTable type="INDUSTRI" />;
}
