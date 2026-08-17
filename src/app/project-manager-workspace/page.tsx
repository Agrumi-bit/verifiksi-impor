import type { Metadata } from "next";

import { ProjectManagerDashboard } from "@/modules/project-manager-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Project Manager Workspace",
};

export default function ProjectManagerDashboardPage() {
  return (
    <div className="p-8">
      <ProjectManagerDashboard />
    </div>
  );
}
