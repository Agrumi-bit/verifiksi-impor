import type { Metadata } from "next";

import { ReportsTable } from "@/modules/verifikator-workspace/components/reports-table";

export const metadata: Metadata = {
  title: "Reports — Verifikator Workspace",
};

export default function VerifikatorReportsPage() {
  return <ReportsTable />;
}
