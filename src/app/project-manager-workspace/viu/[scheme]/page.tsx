import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectManagerDashboard } from "@/modules/project-manager-workspace/components/dashboard";
import { viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";

type Params = { params: Promise<{ scheme: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const scheme = viuSchemeFromSlug((await params).scheme);
  return { title: `Dashboard ${scheme?.label ?? "VIU"} — Project Manager Workspace` };
}

export default async function ProjectManagerViuSchemeDashboardPage({ params }: Params) {
  const scheme = viuSchemeFromSlug((await params).scheme);
  if (!scheme) notFound();
  return (
    <div className="p-8">
      <ProjectManagerDashboard jenis="VIU" scheme={scheme} />
    </div>
  );
}
