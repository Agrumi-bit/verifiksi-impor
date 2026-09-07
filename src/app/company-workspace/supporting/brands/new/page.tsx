import type { Metadata } from "next";

import { MerkWizard } from "@/modules/merk/components/merk-wizard";
import { COMPANY_BRAND_SURFACE } from "@/modules/merk/surface";

export const metadata: Metadata = {
  title: "Register New Brand — Company Workspace",
};

export default function NewBrandPage() {
  return <MerkWizard surface={COMPANY_BRAND_SURFACE} />;
}
