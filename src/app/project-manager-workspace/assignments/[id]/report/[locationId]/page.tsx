import { ReportRouter } from "@/modules/surveyor-workspace/components/report/report-router";

export default async function ProjectManagerReportPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id, locationId } = await params;
  return <ReportRouter assignmentId={id} locationId={locationId} basePath="/api/project-manager-workspace" />;
}
