import type { Metadata } from "next";

import { ApplicationWizard } from "@/modules/applications/components/application-wizard";

export const metadata: Metadata = {
  title: "New Application — Company Workspace",
};

export default async function NewCompanyApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ draftId?: string }>;
}) {
  const { draftId } = await searchParams;

  return (
    <div className="min-h-full bg-muted/30 px-4">
      <ApplicationWizard hideCompanyPicker backHref="/company-workspace/applications" resumeDraftId={draftId} />
    </div>
  );
}
