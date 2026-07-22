import { CompanyDetail } from "@/modules/company/components/company-detail";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyDetail id={id} />;
}
