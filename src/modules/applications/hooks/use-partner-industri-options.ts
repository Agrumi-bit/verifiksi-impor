"use client";

import { useQuery } from "@tanstack/react-query";

export type PartnerIndustriOption = {
  id: string;
  name: string;
  nibNumber: string;
  nibDocumentPath: string | null;
};

/**
 * Shared across the Partner Industri step (toggle cards) and Product Information (linking each
 * product to the partner supplying it) — both need the same registered-partner list.
 *
 * @param ownerCompanyId When the applying company is known (set once a company is picked/locked
 * in Step 1), scopes the list to partners *that company itself* registered via Company
 * Workspace's own Partner Companies module — an application only offers the applicant's own
 * partners, not the whole system-wide registry. Omit to get the unscoped list (used by the
 * admin Partner Management table).
 */
export function usePartnerIndustriOptions(ownerCompanyId?: string) {
  return useQuery({
    queryKey: ["partners", "INDUSTRI", ownerCompanyId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ type: "INDUSTRI" });
      if (ownerCompanyId) params.set("ownerCompanyId", ownerCompanyId);
      const response = await fetch(`/api/partners?${params}`);
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
