"use client";

import { useQuery } from "@tanstack/react-query";

export type ApplicationBrandOption = {
  id: string;
  brandName: string;
  ownerTitle: string | null;
  countryOfOrigin: string;
  evidenceType: string | null;
  registrationNumber: string | null;
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
  completenessPercent: number;
};

/**
 * Brand Master rows available to the applying company — same shape
 * `toMerkListItem` already produces for "Semua Merek"/"Daftar Merek", reused
 * here for the "Pilih Merek" dialog in Step "Merek yang Digunakan" instead
 * of building a second Brand list projection.
 *
 * @param companyId Only needed for the generic/admin wizard entry point
 * (a signed-in company user is scoped server-side from their own session
 * regardless of this param — see /api/applications/brand-options).
 */
export function useApplicationBrandOptions(companyId?: string) {
  return useQuery({
    queryKey: ["applications", "brand-options", companyId ?? null],
    queryFn: async () => {
      const params = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const response = await fetch(`/api/applications/brand-options${params}`);
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: ApplicationBrandOption[] };
      return json.data;
    },
  });
}
