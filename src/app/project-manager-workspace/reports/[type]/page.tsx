import type { Metadata } from "next";

import { ReportsTable } from "@/modules/project-manager-workspace/components/reports-table";

export const metadata: Metadata = {
  title: "Report — Project Manager Workspace",
};

export default async function ProjectManagerReportsPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const jenis = type.toUpperCase() === "VIU" ? "VIU" : "VKI";
  return (
    <div className="p-8">
      <ReportsTable jenis={jenis} />
    </div>
  );
}
