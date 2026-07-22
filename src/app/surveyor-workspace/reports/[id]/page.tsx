import { ReportDetail } from "@/modules/surveyor-workspace/components/report-detail";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportDetail id={id} />;
}
