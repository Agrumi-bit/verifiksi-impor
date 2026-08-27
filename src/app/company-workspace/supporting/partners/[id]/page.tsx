import type { Metadata } from "next";

import { CompanyPartnerDetail } from "@/modules/company-workspace/components/partners/partner-detail";

export const metadata: Metadata = {
  title: "Detail Partner — Company Workspace",
};

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyPartnerDetail id={id} />;
}
