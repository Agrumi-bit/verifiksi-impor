import { DocumentVerificationReport } from "@/modules/verifikator-workspace/components/report/document-verification-report";

export default async function TechnicalAnalystDocumentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DocumentVerificationReport
      assignmentId={id}
      backHref={`/technical-analyst-workspace/assignments/${id}`}
      basePath="/api/technical-analyst-workspace"
    />
  );
}
