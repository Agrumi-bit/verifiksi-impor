import "server-only";

import { db } from "@/lib/db";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { normalizeKonsumsiPayload } from "@/modules/applications/viu-schemes/konsumsi/normalize";
import { getDocumentMeta } from "@/modules/company/document-versions";
import { buildApplicationDocumentChecklist } from "@/modules/verifikator-workspace/application-checklist";
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";
import { COMPANY_MAPPED_DOCUMENT_KEYS } from "@/modules/verifikator-workspace/schema";
import type { ChecklistInput, DocumentStatusInput } from "../legalitas";

export type CaseDocuments = {
  payload: ApplicationWizardValues;
  company: Awaited<ReturnType<typeof db.company.findUnique>>;
  checklist: ChecklistInput[];
  statuses: Record<string, DocumentStatusInput | undefined>;
};

/**
 * One case's document checklist (the same one every workspace reads) for the given categories, with
 * the latest verification status per document — company documents from the company's own version
 * history, application documents from the application's. Read only.
 */
export async function loadCaseDocuments(applicationId: string, categories: string[]): Promise<CaseDocuments | null> {
  const application = await db.application.findUnique({ where: { id: applicationId }, select: { id: true, payload: true, createdAt: true, companyId: true } });
  if (!application) return null;
  const company = application.companyId ? await db.company.findUnique({ where: { id: application.companyId } }) : null;

  const payload = normalizeKonsumsiPayload(application.payload as ApplicationWizardValues);
  const checklist = (await buildApplicationDocumentChecklist(payload, toChecklistCompanyContext(company))).filter((item) => categories.includes(item.category));

  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const applicationKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyMeta = company ? await getDocumentMeta(company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt) : {};
  const applicationMeta = await getApplicationDocumentMeta(application.id, applicationKeys, application.createdAt);
  const statuses = Object.fromEntries(
    checklist.map((item) => [item.key, item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : applicationMeta[item.key]]),
  );
  return { payload, company, checklist, statuses };
}
