import { CompanyApplicationDetail } from "@/modules/company-workspace/components/application-detail";

export default async function CompanyApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CompanyApplicationDetail id={id} />;
}
