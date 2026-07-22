import type { Metadata } from "next";

import { SurveyorDashboard } from "@/modules/surveyor-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Surveyor Workspace",
};

export default function SurveyorDashboardPage() {
  return <SurveyorDashboard />;
}
