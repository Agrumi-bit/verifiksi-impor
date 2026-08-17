import type { Metadata } from "next";

import { ProjectManagerDashboard } from "@/modules/project-manager-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard VKI — Project Manager Workspace",
};

export default function ProjectManagerVkiDashboardPage() {
  return (
    <div className="p-8">
      <ProjectManagerDashboard jenis="VKI" />
    </div>
  );
}
