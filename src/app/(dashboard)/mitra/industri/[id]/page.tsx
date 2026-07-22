import { MitraDetail } from "@/modules/mitra/components/mitra-detail";

export default async function MitraIndustriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MitraDetail id={id} type="INDUSTRI" />;
}
