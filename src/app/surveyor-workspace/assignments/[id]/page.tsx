import { AssignmentDetail } from "@/modules/surveyor-workspace/components/assignment-detail";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentDetail id={id} />;
}
