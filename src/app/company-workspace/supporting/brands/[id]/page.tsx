import { MerkDetail } from "@/modules/merk/components/merk-detail";
import { COMPANY_BRAND_SURFACE } from "@/modules/merk/surface";

export default async function CompanyBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MerkDetail id={id} surface={COMPANY_BRAND_SURFACE} />;
}
