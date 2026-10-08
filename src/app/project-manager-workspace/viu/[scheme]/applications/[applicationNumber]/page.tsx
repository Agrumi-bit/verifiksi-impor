import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationDetail } from "@/modules/project-manager-workspace/components/application-detail";
import { viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";

export const metadata: Metadata = {
  title: "Application Detail — Project Manager Workspace",
};

export default async function ProjectManagerViuSchemeApplicationDetailPage({
  params,
}: {
  params: Promise<{ scheme: string; applicationNumber: string }>;
}) {
  const { scheme: slug, applicationNumber } = await params;
  const scheme = viuSchemeFromSlug(slug);
  if (!scheme) notFound();
  return <ApplicationDetail applicationNumber={applicationNumber} jenis="VIU" scheme={scheme} />;
}
