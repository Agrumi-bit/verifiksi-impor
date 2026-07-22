"use client";

import { useQuery } from "@tanstack/react-query";

import { OfficeVerificationWizard } from "./office-verification/office-verification-wizard";
import { FieldVerificationWizard } from "./field-verification/field-verification-wizard";
import { LocationVerificationWorkspace } from "./location-verification-workspace";

type Props = { assignmentId: string; locationId: string };

export function VerifyLocationRouter({ assignmentId, locationId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveyor-workspace", "assignments", assignmentId, "locations", locationId],
    queryFn: async () => {
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentId}/locations/${locationId}`);
      if (!response.ok) throw new Error("Lokasi tidak ditemukan");
      const json = (await response.json()) as { data: { locationType: string } };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-4xl py-10 text-sm text-destructive">
        Lokasi tidak ditemukan, atau bukan milik Anda.
      </p>
    );
  }

  if (data.locationType === "KANTOR") {
    return <OfficeVerificationWizard assignmentId={assignmentId} locationId={locationId} />;
  }
  if (data.locationType === "GUDANG") {
    return <FieldVerificationWizard kind="GUDANG" assignmentId={assignmentId} locationId={locationId} />;
  }
  if (data.locationType === "PABRIK") {
    return <FieldVerificationWizard kind="PABRIK" assignmentId={assignmentId} locationId={locationId} />;
  }
  return <LocationVerificationWorkspace assignmentId={assignmentId} locationId={locationId} />;
}
