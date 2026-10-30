import type { Metadata } from "next";

import { CaseListPage } from "@/modules/compliance-workspace/components/case-list/case-list-page";

export const metadata: Metadata = {
  title: "Daftar Permohonan — Compliance Workspace",
};

export default function CompliancePermohonanPage() {
  return <CaseListPage />;
}
