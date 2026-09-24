import { PartnerDetail } from "@/modules/partner/components/partner-detail";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PartnerDetail id={id} />;
}
