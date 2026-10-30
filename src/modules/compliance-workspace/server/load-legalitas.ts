import "server-only";

import { VIU_KONSUMSI_KBLI } from "@/modules/schemes/viu-konsumsi/terms";
import { splitKbliEntries, type KbliCategory } from "@/modules/shared/schema";
import { LEGALITAS_CATEGORIES, buildLegalitasRows, kbliCheck, type LegalitasRow } from "../legalitas";
import { loadCaseDocuments } from "./document-statuses";

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

type LegalPayload = {
  companyName?: string;
  contactFullName?: string;
  contactEmail?: string;
  nibNumber?: string;
  notarialDeedNumber?: string;
  kbliEntries?: { code: string; description?: string; category?: KbliCategory }[];
  npwpNumber?: string;
  skNumber?: string;
  sktNumber?: string;
  notarialAmendmentNumber?: string;
  taxProofs?: { year?: string }[];
};

/**
 * Tahap 2 data for one case — the same document checklist and verification statuses every other
 * workspace reads (loadCaseDocuments), read only.
 */
export async function loadLegalitasStage(applicationId: string): Promise<LegalitasStage | null> {
  const documents = await loadCaseDocuments(applicationId, LEGALITAS_CATEGORIES);
  if (!documents) return null;
  const { company, checklist, statuses } = documents;
  const payload = documents.payload as unknown as LegalPayload;

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
