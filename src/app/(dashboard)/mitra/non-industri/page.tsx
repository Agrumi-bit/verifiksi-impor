import type { Metadata } from "next";

import { MitraTable } from "@/modules/mitra/components/mitra-table";

export const metadata: Metadata = {
  title: "Mitra Non Industri — Verifikasi Impor",
};

export default function MitraNonIndustriPage() {
  return <MitraTable type="NON_INDUSTRI" />;
}
