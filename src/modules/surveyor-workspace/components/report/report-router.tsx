"use client";

import { useQuery } from "@tanstack/react-query";

import { OfficeReportPreview } from "./office-report-preview";
import { FieldReportPreview } from "../field-verification/field-report-preview";

type Props = {
  assignmentId: string;
  locationId: string;
  basePath?: "/api/surveyor-workspace" | "/api/verifikator-workspace" | "/api/company-workspace" | "/api/technical-analyst-workspace";
  backHref?: string;
};

export function ReportRouter({ assignmentId, locationId, basePath = "/api/surveyor-workspace", backHref }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [basePath, "assignments", assignmentId, "locations", locationId],
    queryFn: async () => {
      const response = await fetch(`${basePath}/assignments/${assignmentId}/locations/${locationId}`);
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
        Laporan tidak ditemukan, atau bukan milik Anda.
      </p>
    );
  }

  if (data.locationType === "GUDANG") {
    return <FieldReportPreview kind="GUDANG" assignmentId={assignmentId} locationId={locationId} basePath={basePath} backHref={backHref} />;
  }
  if (data.locationType === "PABRIK") {
    return <FieldReportPreview kind="PABRIK" assignmentId={assignmentId} locationId={locationId} basePath={basePath} backHref={backHref} />;
  }
  return <OfficeReportPreview assignmentId={assignmentId} locationId={locationId} basePath={basePath} backHref={backHref} />;
}
