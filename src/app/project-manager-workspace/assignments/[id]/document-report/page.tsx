import { DocumentVerificationReport } from "@/modules/verifikator-workspace/components/report/document-verification-report";

export default async function ProjectManagerDocumentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DocumentVerificationReport
      assignmentId={id}
      backHref={`/project-manager-workspace`}
      basePath="/api/project-manager-workspace"
    />
  );
}
