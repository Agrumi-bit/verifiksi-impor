import { MerkDetail } from "@/modules/merk/components/merk-detail";

export default async function MerkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MerkDetail id={id} />;
}
