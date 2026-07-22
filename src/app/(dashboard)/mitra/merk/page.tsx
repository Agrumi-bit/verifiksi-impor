import type { Metadata } from "next";

import { MerkTable } from "@/modules/merk/components/merk-table";

export const metadata: Metadata = {
  title: "Merk — Verifikasi Impor",
};

export default function MerkPage() {
  return <MerkTable />;
}
