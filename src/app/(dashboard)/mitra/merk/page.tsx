import type { Metadata } from "next";

import { AdminBrandList } from "@/modules/merk/components/management/admin-brand-list";

export const metadata: Metadata = {
  title: "Semua Merek — Verifikasi Impor",
};

export default function MerkPage() {
  return <AdminBrandList />;
}
