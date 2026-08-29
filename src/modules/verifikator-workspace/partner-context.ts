import { db } from "@/lib/db";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import type { ChecklistPartnerContext } from "./schema";

/**
 * Resolves the `Partner.company` NIB/NPWP/SK document paths for every enabled entry in a VIU
 * application's `partnerIndustriEntries`, for `buildDocumentChecklist`'s `partners` argument.
 * Returns `[]` (no query) when the application has no enabled partners — every non-VIU-industri
 * application, and any VIU-industri one with every partner toggled off.
 */
export async function resolvePartnerContexts(payload: ApplicationWizardValues): Promise<ChecklistPartnerContext[]> {
  const partnerIds = (payload.partnerIndustriEntries ?? []).filter((e) => e.enabled).map((e) => e.partnerId);
  if (partnerIds.length === 0) return [];

  const partners = await db.partner.findMany({
    where: { id: { in: partnerIds } },
    include: { company: { select: { companyName: true, nibDocumentPath: true, npwpDocumentPath: true, skDocumentPath: true } } },
  });

  return partners.map((partner) => ({
    partnerId: partner.id,
    companyName: partner.company.companyName,
    nibDocumentPath: partner.company.nibDocumentPath,
    npwpDocumentPath: partner.company.npwpDocumentPath,
    skDocumentPath: partner.company.skDocumentPath,
  }));
}
