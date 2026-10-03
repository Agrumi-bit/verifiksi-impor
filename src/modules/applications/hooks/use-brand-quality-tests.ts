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
};

/** Not-yet-expired `BrandQualityTest` rows for one (brandId, commodityGroupId) pair — backs the
 * "Pilih sertifikat yang sudah ada" option in the Merek x Sub Kelompok certificate panel. */
export function useExistingBrandQualityTests(brandId: string | undefined, commodityGroupId: string | undefined) {
  return useQuery({
    queryKey: ["applications", "brand-quality-tests", brandId, commodityGroupId],
    queryFn: async () => {
      const params = new URLSearchParams({ merkId: brandId!, commodityGroupId: commodityGroupId! });
      const response = await fetch(`/api/applications/brand-quality-tests?${params}`);
      if (!response.ok) throw new Error("Gagal memuat sertifikat Hasil Uji Mutu");
      const json = (await response.json()) as { data: ExistingBrandQualityTest[] };
      return json.data;
    },
    enabled: Boolean(brandId && commodityGroupId),
  });
}
