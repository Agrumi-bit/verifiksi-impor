import { DocumentVerificationReport } from "@/modules/verifikator-workspace/components/report/document-verification-report";

export default async function VerifikatorDocumentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentVerificationReport assignmentId={id} backHref={`/verifikator-workspace/assignments/${id}`} />;
}
