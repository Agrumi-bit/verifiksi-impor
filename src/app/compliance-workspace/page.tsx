import type { Metadata } from "next";

import { ComplianceHome } from "@/modules/compliance-workspace/components/compliance-home";

export const metadata: Metadata = {
  title: "Dashboard — Compliance Workspace",
};

export default function ComplianceWorkspacePage() {
  return <ComplianceHome />;
}
