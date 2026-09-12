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
 * Brand Master rows available for the "Pilih Merek" dialog in Step "Merek
 * yang Digunakan" — same shape `toMerkListItem` already produces for "Semua
 * Merek"/"Daftar Merek", reused here instead of a second Brand list
 * projection.
 *
 * Scoping happens entirely server-side from the session (see
 * /api/applications/brand-options): a company-workspace user only ever gets
 * their own company's Brands, while staff (the generic/admin wizard entry
 * point) get every registered Brand regardless of which company is picked in
 * Step 1 — Brand Master rows are registered by admin, not necessarily tied
 * to whichever company ends up applying.
 */
export function useApplicationBrandOptions() {
  return useQuery({
    queryKey: ["applications", "brand-options"],
    queryFn: async () => {
      const response = await fetch("/api/applications/brand-options");
      if (!response.ok) throw new Error("Gagal memuat data merek");
      const json = (await response.json()) as { data: ApplicationBrandOption[] };
      return json.data;
    },
  });
}
