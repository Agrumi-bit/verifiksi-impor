"use client";

import { useQuery } from "@tanstack/react-query";

export type ExistingBrandQualityTest = {
  id: string;
  certificateNumber: string;
  laboratoryName: string;
  issueDate: string;
  expiryDate: string | null;
  fileName: string;
  filePath: string;
  /** Every Sub Kelompok Komoditas the certificate currently covers. */
  coverageNames: string[];
  /** Whether that scope already includes the group asked about. */
  coversGroup: boolean;
};

/** Not-yet-expired `BrandQualityTest` rows of one Brand (all its Sub Kelompok — a certificate may
 * cover several), flagged by whether they already cover `commodityGroupId` — backs the "Dari
 * Hasil Uji Mutu" option in the Merek x Sub Kelompok certificate panel. */
export function useExistingBrandQualityTests(brandId: string | undefined, commodityGroupId: string | undefined) {
  return useQuery({
    queryKey: ["applications", "brand-quality-tests", brandId, commodityGroupId],
    queryFn: async () => {
      const params = new URLSearchParams({ merkId: brandId!, ...(commodityGroupId ? { commodityGroupId } : {}) });
      const response = await fetch(`/api/applications/brand-quality-tests?${params}`);
      if (!response.ok) throw new Error("Gagal memuat sertifikat Hasil Uji Mutu");
      const json = (await response.json()) as { data: ExistingBrandQualityTest[] };
      return json.data;
    },
    enabled: Boolean(brandId),
  });
}
