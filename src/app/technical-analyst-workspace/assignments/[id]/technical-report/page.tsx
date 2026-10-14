import { TechnicalAnalysisReport } from "@/modules/technical-analyst-workspace/components/report/technical-analysis-report";

export default async function TechnicalAnalystTechnicalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <TechnicalAnalysisReport
      assignmentId={id}
      basePath="/api/technical-analyst-workspace"
      backHref={`/technical-analyst-workspace/assignments/${id}`}
    />
  );
}
