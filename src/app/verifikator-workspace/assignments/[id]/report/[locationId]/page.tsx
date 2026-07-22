import { ReportRouter } from "@/modules/surveyor-workspace/components/report/report-router";

export default async function VerifikatorReportPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id, locationId } = await params;
  return (
    <ReportRouter
      assignmentId={id}
      locationId={locationId}
      basePath="/api/verifikator-workspace"
      backHref={`/verifikator-workspace/assignments/${id}`}
    />
  );
}
