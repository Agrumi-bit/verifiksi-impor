import "server-only";

import { db } from "@/lib/db";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { normalizeKonsumsiPayload } from "@/modules/applications/viu-schemes/konsumsi/normalize";
import { getDocumentMeta } from "@/modules/company/document-versions";
import { VIU_KONSUMSI_KBLI } from "@/modules/schemes/viu-konsumsi/terms";
import { splitKbliEntries, type KbliCategory } from "@/modules/shared/schema";
import { buildApplicationDocumentChecklist } from "@/modules/verifikator-workspace/application-checklist";
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";
import { COMPANY_MAPPED_DOCUMENT_KEYS } from "@/modules/verifikator-workspace/schema";
import { LEGALITAS_CATEGORIES, buildLegalitasRows, kbliCheck, type DocumentStatusInput, type LegalitasRow } from "../legalitas";

export type LegalitasStage = {
  company: {
    name: string;
    nib: string;
    npwp: string;
    active: boolean | null;
    kbliUtama: string;
    officeAddress: string;
    apiType: string;
    pic: string;
  };
  kbli: ReturnType<typeof kbliCheck>;
  rows: LegalitasRow[];
};

type Payload = ApplicationWizardValues & {
  kbliEntries?: { code: string; description?: string; category?: KbliCategory }[];
  npwpNumber?: string;
  skNumber?: string;
  sktNumber?: string;
  notarialAmendmentNumber?: string;
  taxProofs?: { year?: string }[];
};

/**
 * Tahap 2 data for one case — the same document checklist and verification statuses every other
 * workspace reads (buildApplicationDocumentChecklist + document version meta), read only.
 */
export async function loadLegalitasStage(applicationId: string): Promise<LegalitasStage | null> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { id: true, payload: true, createdAt: true, companyId: true },
  });
  if (!application) return null;
  const company = application.companyId ? await db.company.findUnique({ where: { id: application.companyId } }) : null;

  const payload = normalizeKonsumsiPayload(application.payload as ApplicationWizardValues) as Payload;
  const checklist = (await buildApplicationDocumentChecklist(payload, toChecklistCompanyContext(company))).filter((item) =>
    LEGALITAS_CATEGORIES.includes(item.category),
  );

  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const applicationKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyMeta = company
    ? await getDocumentMeta(company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt)
    : {};
  const applicationMeta = await getApplicationDocumentMeta(application.id, applicationKeys, application.createdAt);
  const statuses: Record<string, DocumentStatusInput | undefined> = Object.fromEntries(
    checklist.map((item) => [
      item.key,
      item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : applicationMeta[item.key],
    ]),
  );

  const { utama, pendukung } = splitKbliEntries(payload.kbliEntries ?? []);
  const kbliText = (entry: { code: string; description?: string }) => [entry.code, entry.description].filter(Boolean).join(" – ");
  const rows = buildLegalitasRows(checklist, statuses, {
    nib: payload.nibNumber || company?.nibNumber || null,
    npwp: payload.npwpNumber || null,
    kbliUtama: utama.map(kbliText),
    kbliPendukung: pendukung.map(kbliText),
    notarialDeedNumber: payload.notarialDeedNumber || null,
    notarialAmendmentNumber: payload.notarialAmendmentNumber || null,
    skNumber: payload.skNumber || null,
    sktNumber: payload.sktNumber || null,
    taxProofYears: (payload.taxProofs ?? []).map((proof) => proof.year).filter((year): year is string => Boolean(year)),
  });

  const address = company
    ? [company.addressJalan, company.addressDesa, company.addressKecamatan, company.addressKota, company.addressProvinsi].filter(Boolean).join(", ")
    : "";
  return {
    company: {
      name: company?.companyName ?? payload.companyName ?? "—",
      nib: payload.nibNumber || company?.nibNumber || "—",
      npwp: payload.npwpNumber || "—",
      active: company ? company.status === "ACTIVE" : null,
      kbliUtama: utama.length ? utama.map(kbliText).join("; ") : "—",
      officeAddress: address || "—",
      apiType: company?.apiType ?? "—",
      pic: [payload.contactFullName ?? company?.contactFullName, payload.contactEmail ?? company?.contactEmail].filter(Boolean).join(" · ") || "—",
    },
    kbli: kbliCheck(VIU_KONSUMSI_KBLI, utama.map((entry) => entry.code)),
    rows,
  };
}
