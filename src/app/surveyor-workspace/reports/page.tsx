import type { Metadata } from "next";

import { ReportsGrid } from "@/modules/surveyor-workspace/components/reports-grid";

export const metadata: Metadata = {
  title: "Reports — Surveyor Workspace",
};

export default function SurveyorReportsPage() {
  return <ReportsGrid />;
}
