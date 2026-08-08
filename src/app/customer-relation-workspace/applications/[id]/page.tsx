import { ApplicationReview } from "@/modules/customer-relation-workspace/components/application-review";

export default async function CustomerRelationApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationReview id={id} />;
}
