import type { Metadata } from "next";

import { ScheduleView } from "@/modules/surveyor-workspace/components/schedule-view";

export const metadata: Metadata = {
  title: "My Schedule — Surveyor Workspace",
};

export default function SchedulePage() {
  return <ScheduleView />;
}
