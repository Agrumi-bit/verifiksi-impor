import { MitraDetail } from "@/modules/mitra/components/mitra-detail";

export default async function MitraNonIndustriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MitraDetail id={id} type="NON_INDUSTRI" />;
}
