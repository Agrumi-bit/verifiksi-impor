import type { Metadata } from "next";

import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";

export const metadata: Metadata = {
  title: "Tambah Merek — Verifikasi Impor",
};

export default function NewMerkPage() {
  return <MerkWizard surface={INTERNAL_MERK_SURFACE} />;
}
