import { DocumentVerificationDetail } from "@/modules/verifikator-workspace/components/document-verification-detail";

export default async function VerifikatorDocumentVerificationDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <DocumentVerificationDetail companyId={companyId} />;
}
