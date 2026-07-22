import { AssignmentDetail } from "@/modules/verifikator-workspace/components/assignment-detail";

export default async function VerifikatorAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentDetail id={id} />;
}
