import type { Metadata } from "next";

import { CompanyBrandTable } from "@/modules/company-workspace/components/brand-table";

export const metadata: Metadata = {
  title: "Brand Management — Company Workspace",
};

export default function BrandsPage() {
  return <CompanyBrandTable />;
}
