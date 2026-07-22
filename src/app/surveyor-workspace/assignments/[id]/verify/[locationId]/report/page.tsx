import { ReportRouter } from "@/modules/surveyor-workspace/components/report/report-router";

export default async function LocationReportPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id, locationId } = await params;
  return <ReportRouter assignmentId={id} locationId={locationId} />;
}
