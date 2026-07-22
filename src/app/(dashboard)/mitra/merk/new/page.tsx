import type { Metadata } from "next";

import { MerkWizard } from "@/modules/merk/components/merk-wizard";

export const metadata: Metadata = {
  title: "Tambah Merek — Verifikasi Impor",
};

export default function NewMerkPage() {
  return <MerkWizard />;
}
