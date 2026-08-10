import { AssignmentDetail } from "@/modules/technical-analyst-workspace/components/assignment-detail";

export default async function TechnicalAnalystAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentDetail id={id} />;
}
