import type { Metadata } from "next";

import { DashboardStatsGrid } from "@/modules/dashboard/components/dashboard-stats";

export const metadata: Metadata = {
  title: "Dashboard — VKI & VIU Platform",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan aktivitas platform verifikasi.
        </p>
      </div>
      <DashboardStatsGrid />
    </div>
  );
}
