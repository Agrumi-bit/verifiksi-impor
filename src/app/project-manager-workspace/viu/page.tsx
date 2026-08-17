import type { Metadata } from "next";

import { ProjectManagerDashboard } from "@/modules/project-manager-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard VIU — Project Manager Workspace",
};

export default function ProjectManagerViuDashboardPage() {
  return (
    <div className="p-8">
      <ProjectManagerDashboard jenis="VIU" />
    </div>
  );
}
