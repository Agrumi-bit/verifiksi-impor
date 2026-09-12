import type { Metadata } from "next";

import { AdminMerkDashboard } from "@/modules/merk/components/management/admin-dashboard";

export const metadata: Metadata = {
  title: "Merek Management — Verifikasi Impor",
};

export default function MerkDashboardPage() {
  return <AdminMerkDashboard />;
}
