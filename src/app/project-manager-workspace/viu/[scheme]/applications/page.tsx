import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationList } from "@/modules/project-manager-workspace/components/application-list";
import { viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";

type Params = { params: Promise<{ scheme: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const scheme = viuSchemeFromSlug((await params).scheme);
  return { title: `Application List ${scheme?.label ?? "VIU"} — Project Manager Workspace` };
}

export default async function ProjectManagerViuSchemeApplicationsPage({ params }: Params) {
  const scheme = viuSchemeFromSlug((await params).scheme);
  if (!scheme) notFound();
  return (
    <div className="p-8">
      <ApplicationList jenis="VIU" scheme={scheme} />
    </div>
  );
}
