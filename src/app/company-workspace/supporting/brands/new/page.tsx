import type { Metadata } from "next";

import { CompanyBrandWizard } from "@/modules/company-workspace/components/brand-wizard";

export const metadata: Metadata = {
  title: "Register New Brand — Company Workspace",
};

export default function NewBrandPage() {
  return <CompanyBrandWizard />;
}
