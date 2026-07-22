import { VerifyLocationRouter } from "@/modules/surveyor-workspace/components/verify-location-router";

export default async function LocationVerifyPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id, locationId } = await params;
  return <VerifyLocationRouter assignmentId={id} locationId={locationId} />;
}
