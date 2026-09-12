"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { MerkEvidenceType, MerkOwnerLocation } from "@/modules/merk/schema";
import {
  getVIUConsumptionBrandRequirements,
  type ApplicantBrandRole,
  type ImportAppointmentSource,
  type VIUBrandRequirementsResult,
} from "../viu-brand-relationship-rules";

type BrandDetailResponse = {
  id: string;
  brandName: string;
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
  certificateType: MerkEvidenceType | null;
  registrationNumber: string | null;
  registrationDate: string | null;
  trademarkClass: string | null;
  ownership: {
    ownerLocation: "DOMESTIC" | "FOREIGN";
    ownerName: string | null;
    ownerCompany: { name: string } | null;
    ownerCountryCode: string | null;
  } | null;
  documents: { documentType: string }[];
};

/** Full Brand Master detail for one Brand used in this VIU application, plus
 * this application's own relationship choice for it fed straight into
 * `getVIUConsumptionBrandRequirements` — never re-derived by hand in a
 * component. `apiBase` is `/api/company-workspace/brands` in Company
 * Workspace or `/api/merk` from the generic/admin wizard entry point, same
 * split as `MerkSurface`. */
export function useBrandApplicationDetail(
  apiBase: string,
  brandId: string,
  relationship: {
    applicantRole: ApplicantBrandRole | null;
    appointmentSource: ImportAppointmentSource | null;
    officialRepresentativeCompanyId: string | null;
  },
) {
  const query = useQuery({
    queryKey: ["applications", "brand-detail", apiBase, brandId],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/${brandId}`);
      if (!response.ok) throw new Error("Gagal memuat detail merek");
      const json = (await response.json()) as { data: BrandDetailResponse };
      return json.data;
    },
    enabled: Boolean(brandId),
  });

  const ownerLocation: MerkOwnerLocation | null = query.data?.ownership
    ? query.data.ownership.ownerLocation === "DOMESTIC"
      ? "domestic"
      : "foreign"
    : null;
  const ownerTitle = query.data?.ownership
    ? ownerLocation === "domestic"
      ? (query.data.ownership.ownerCompany?.name ?? query.data.ownership.ownerName)
      : query.data.ownership.ownerName
    : null;

  const requirements: VIUBrandRequirementsResult | null = useMemo(() => {
    if (!query.data) return null;
    return getVIUConsumptionBrandRequirements({
      brandStatus: query.data.status,
      evidenceType: query.data.certificateType,
      registrationDate: query.data.registrationDate,
      ownerLocation,
      applicantRole: relationship.applicantRole,
      appointmentSource: relationship.appointmentSource,
      officialRepresentativeCompanyId: relationship.officialRepresentativeCompanyId ?? null,
      availableDocumentCodes: new Set(query.data.documents.map((d) => d.documentType)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ownerLocation/ownerTitle are derived from query.data, not independent inputs
  }, [
    query.data,
    relationship.applicantRole,
    relationship.appointmentSource,
    relationship.officialRepresentativeCompanyId,
  ]);

  return {
    brand: query.data ?? null,
    ownerLocation,
    ownerTitle,
    requirements,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
