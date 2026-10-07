import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { resolveKonsumsiChecklistContext, type ChecklistKonsumsiBrandContext } from "./konsumsi-brand-context";
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
  return (await buildApplicationDocumentChecklistWithBrands(payload, company, partners)).checklist;
}

/** Same checklist, plus the resolved Konsumsi brand contexts — for the Laporan Verifikasi Dokumen,
 * whose Sertifikat Merek pages print each brand's own data. Empty for non-Konsumsi applications. */
export async function buildApplicationDocumentChecklistWithBrands(
  payload: ApplicationWizardValues,
  company?: ChecklistCompanyContext | null,
  partners?: ChecklistPartnerContext[],
): Promise<{ checklist: DocumentChecklistItem[]; konsumsiBrands: ChecklistKonsumsiBrandContext[] }> {
  const [resolvedPartners, { konsumsiBrands, konsumsiHsCodeLookup }] = await Promise.all([
    partners ?? resolvePartnerContexts(payload),
    resolveKonsumsiChecklistContext(payload),
  ]);
  return {
    checklist: buildDocumentChecklist(payload, company, resolvedPartners, konsumsiBrands, konsumsiHsCodeLookup),
    konsumsiBrands: konsumsiBrands ?? [],
  };
}
