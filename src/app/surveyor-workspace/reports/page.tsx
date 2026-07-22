import type { Metadata } from "next";

import { ReportTable } from "@/modules/surveyor-workspace/components/report-table";

export const metadata: Metadata = {
  title: "Reports — Surveyor Workspace",
};

export default function SurveyorReportsPage() {
  return <ReportTable />;
}
