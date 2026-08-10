import type { Metadata } from "next";

import { ScheduleView } from "@/modules/technical-analyst-workspace/components/schedule-view";

export const metadata: Metadata = {
  title: "My Schedule — Technical Analyst Workspace",
};

export default function TechnicalAnalystSchedulePage() {
  return <ScheduleView />;
}
