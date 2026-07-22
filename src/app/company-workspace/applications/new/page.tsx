import type { Metadata } from "next";

import { ApplicationWizard } from "@/modules/applications/components/application-wizard";

export const metadata: Metadata = {
  title: "New Application — Company Workspace",
};

export default function NewCompanyApplicationPage() {
  return (
    <div className="min-h-full bg-muted/30 px-4">
      <ApplicationWizard />
    </div>
  );
}
