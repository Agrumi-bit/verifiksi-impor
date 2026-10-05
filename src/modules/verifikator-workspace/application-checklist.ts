import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { resolveKonsumsiChecklistContext } from "./konsumsi-brand-context";
import { resolvePartnerContexts } from "./partner-context";
import { buildDocumentChecklist, type ChecklistCompanyContext, type ChecklistPartnerContext, type DocumentChecklistItem } from "./schema";

/**
 * Server-side entry point for an application's FULL document checklist — resolves every context
 * `buildDocumentChecklist` needs (Partner Industri companies, Konsumsi brands + HS lookup) so all
 * workspaces (Verifikator, CR, PM, TA, Surveyor, Company) list exactly the same documents.
 * Without the Konsumsi context the "Dokumen Merek" / "Sertifikat Uji Mutu" rows silently vanish.
 */
export async function buildApplicationDocumentChecklist(
  payload: ApplicationWizardValues,
  company?: ChecklistCompanyContext | null,
  partners?: ChecklistPartnerContext[],
): Promise<DocumentChecklistItem[]> {
  const [resolvedPartners, { konsumsiBrands, konsumsiHsCodeLookup }] = await Promise.all([
    partners ?? resolvePartnerContexts(payload),
    resolveKonsumsiChecklistContext(payload),
  ]);
  return buildDocumentChecklist(payload, company, resolvedPartners, konsumsiBrands, konsumsiHsCodeLookup);
}
