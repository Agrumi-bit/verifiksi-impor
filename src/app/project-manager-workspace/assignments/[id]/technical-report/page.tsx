import { TechnicalAnalysisReport } from "@/modules/technical-analyst-workspace/components/report/technical-analysis-report";

export default async function ProjectManagerTechnicalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TechnicalAnalysisReport assignmentId={id} basePath="/api/project-manager-workspace" backHref="/project-manager-workspace" />;
}
