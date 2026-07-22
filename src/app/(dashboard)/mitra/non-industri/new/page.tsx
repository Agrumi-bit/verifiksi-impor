import type { Metadata } from "next";

import { MitraNonIndustriWizard } from "@/modules/mitra/components/mitra-non-industri-wizard";

export const metadata: Metadata = {
  title: "Tambah Mitra Non Industri — Verifikasi Impor",
};

export default function NewMitraNonIndustriPage() {
  return <MitraNonIndustriWizard />;
}
