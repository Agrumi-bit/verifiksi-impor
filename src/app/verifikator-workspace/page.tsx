import type { Metadata } from "next";

import { VerifikatorDashboard } from "@/modules/verifikator-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Verifikator Workspace",
};

export default function VerifikatorDashboardPage() {
  return <VerifikatorDashboard />;
}
