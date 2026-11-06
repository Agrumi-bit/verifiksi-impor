import { DocumentCompletenessReport } from "@/modules/customer-relation-workspace/components/report/document-completeness-report";

export default async function CustomerRelationCompletenessReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentCompletenessReport id={id} />;
}
