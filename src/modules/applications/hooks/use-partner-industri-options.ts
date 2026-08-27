"use client";

import { useQuery } from "@tanstack/react-query";

export type PartnerIndustriOption = {
  id: string;
  name: string;
  nibNumber: string;
  nibDocumentPath: string | null;
};

/** Shared across the Partner Industri step (toggle cards) and Product Information (linking
 * each product to the partner supplying it) — both need the same registered-partner list. */
export function usePartnerIndustriOptions() {
  return useQuery({
    queryKey: ["partners", "INDUSTRI"],
    queryFn: async () => {
      const response = await fetch("/api/partners?type=INDUSTRI");
      if (!response.ok) throw new Error("Gagal memuat data partner industri");
      const json = (await response.json()) as {
        data: { id: string; company: { companyName: string; nibNumber: string; nibDocumentPath: string | null } }[];
      };
      return json.data.map(
        (partner): PartnerIndustriOption => ({
          id: partner.id,
          name: partner.company.companyName,
          nibNumber: partner.company.nibNumber,
          nibDocumentPath: partner.company.nibDocumentPath,
        }),
      );
    },
  });
}
