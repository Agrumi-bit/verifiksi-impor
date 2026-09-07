import { MerkDetail } from "@/modules/merk/components/merk-detail";
import { INTERNAL_MERK_SURFACE } from "@/modules/merk/surface";

export default async function MerkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MerkDetail id={id} surface={INTERNAL_MERK_SURFACE} />;
}
