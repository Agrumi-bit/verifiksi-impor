import type { Metadata } from "next";

import { ApplicationList } from "@/modules/project-manager-workspace/components/application-list";

export const metadata: Metadata = {
  title: "Application List — Project Manager Workspace",
};

export default async function ProjectManagerApplicationListPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const jenis = type.toUpperCase() === "VIU" ? "VIU" : "VKI";
  return (
    <div className="p-8">
      <ApplicationList jenis={jenis} />
    </div>
  );
}
