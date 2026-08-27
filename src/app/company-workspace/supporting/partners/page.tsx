import type { Metadata } from "next";

import { CompanyPartnerTable } from "@/modules/company-workspace/components/partners/partner-table";

export const metadata: Metadata = {
  title: "Partner Companies — Company Workspace",
};

export default function PartnerCompaniesPage() {
  return <CompanyPartnerTable />;
}
