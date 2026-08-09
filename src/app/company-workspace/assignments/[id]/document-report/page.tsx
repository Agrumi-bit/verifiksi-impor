import { DocumentVerificationReport } from "@/modules/verifikator-workspace/components/report/document-verification-report";

export default async function CompanyDocumentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentVerificationReport assignmentId={id} backHref="/company-workspace/reports" basePath="/api/company-workspace" />;
}
