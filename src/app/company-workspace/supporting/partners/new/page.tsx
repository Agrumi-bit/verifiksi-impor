import type { Metadata } from "next";

import { CompanyPartnerWizard } from "@/modules/company-workspace/components/partners/partner-wizard";

export const metadata: Metadata = {
  title: "Tambah Partner — Company Workspace",
};

export default function NewPartnerPage() {
  return <CompanyPartnerWizard />;
}
