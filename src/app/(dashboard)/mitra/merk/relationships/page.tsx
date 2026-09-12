import type { Metadata } from "next";

import { AdminRelationships } from "@/modules/merk/components/management/admin-relationships";

export const metadata: Metadata = {
  title: "Pemilik & Perwakilan — Verifikasi Impor",
};

export default function MerkRelationshipsPage() {
  return <AdminRelationships />;
}
