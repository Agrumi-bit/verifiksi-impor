import type { Metadata } from "next";

import { MitraIndustriWizard } from "@/modules/mitra/components/mitra-industri-wizard";

export const metadata: Metadata = {
  title: "Tambah Mitra Industri — Verifikasi Impor",
};

export default function NewMitraIndustriPage() {
  return <MitraIndustriWizard />;
}
