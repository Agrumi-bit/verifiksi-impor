import type { Metadata } from "next";

import { MerkTable } from "@/modules/merk/components/merk-table";
import { COMPANY_BRAND_SURFACE } from "@/modules/merk/surface";

export const metadata: Metadata = {
  title: "Brand Management — Company Workspace",
};

export default function BrandsPage() {
  return <MerkTable surface={COMPANY_BRAND_SURFACE} />;
}
