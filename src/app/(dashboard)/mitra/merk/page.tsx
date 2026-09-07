import type { Metadata } from "next";

import { MerkTable } from "@/modules/merk/components/merk-table";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";

export const metadata: Metadata = {
  title: "Merk — Verifikasi Impor",
};

export default function MerkPage() {
  return <MerkTable surface={INTERNAL_MERK_SURFACE} />;
}
