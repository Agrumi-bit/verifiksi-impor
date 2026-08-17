import type { Metadata } from "next";

import { ApplicationDetail } from "@/modules/project-manager-workspace/components/application-detail";

export const metadata: Metadata = {
  title: "Application Detail — Project Manager Workspace",
};

export default async function ProjectManagerApplicationDetailPage({
  params,
}: {
  params: Promise<{ type: string; applicationNumber: string }>;
}) {
  const { type, applicationNumber } = await params;
  const jenis = type.toUpperCase() === "VIU" ? "VIU" : "VKI";
  return <ApplicationDetail applicationNumber={applicationNumber} jenis={jenis} />;
}
