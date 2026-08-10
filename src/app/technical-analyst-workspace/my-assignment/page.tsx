import type { Metadata } from "next";

import { AssignmentList } from "@/modules/technical-analyst-workspace/components/assignment-list";

export const metadata: Metadata = {
  title: "My Assignment — Technical Analyst Workspace",
};

export default function TechnicalAnalystMyAssignmentPage() {
  return <AssignmentList />;
}
