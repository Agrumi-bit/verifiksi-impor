import type { Metadata } from "next";

import { ScheduleView } from "@/modules/verifikator-workspace/components/schedule-view";

export const metadata: Metadata = {
  title: "My Schedule — Verifikator Workspace",
};

export default function VerifikatorSchedulePage() {
  return <ScheduleView />;
}
