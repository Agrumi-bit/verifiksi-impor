/**
 * Pure constants for the document fields covered by version tracking +
 * verification (Legal + Tax tabs today). No `db` import — safe to import
 * from client components, unlike `document-versions.ts`.
 */
export const DOCUMENT_FIELD_KEYS = [
  "nibDocumentPath",
  "kbliDocumentPath",
  "notarialDocumentPath",
  "notarialAmendmentDocPath",
  "skDocumentPath",
  "npwpDocumentPath",
  "sktDocumentPath",
] as const;
export type DocumentFieldKey = (typeof DOCUMENT_FIELD_KEYS)[number];

const TAX_PROOF_FIELD_KEY_RE = /^taxProof:(\d{4})$/;

export function isKnownDocumentFieldKey(value: string): boolean {
  return (DOCUMENT_FIELD_KEYS as readonly string[]).includes(value) || TAX_PROOF_FIELD_KEY_RE.test(value);
}

export function parseTaxProofYear(fieldKey: string): string | null {
  const match = fieldKey.match(TAX_PROOF_FIELD_KEY_RE);
  return match ? match[1] : null;
}

const DOCUMENT_FIELD_TITLES: Record<DocumentFieldKey, string> = {
  nibDocumentPath: "NIB (Nomor Induk Berusaha)",
  kbliDocumentPath: "KBLI",
  notarialDocumentPath: "Akta Pendirian",
  notarialAmendmentDocPath: "Akta Perubahan",
  skDocumentPath: "SK Kemenkumham",
  npwpDocumentPath: "NPWP",
  sktDocumentPath: "Surat Keterangan Terdaftar Pajak (SKT)",
};

export function documentFieldTitle(fieldKey: string): string {
  if (fieldKey in DOCUMENT_FIELD_TITLES) return DOCUMENT_FIELD_TITLES[fieldKey as DocumentFieldKey];
  const year = parseTaxProofYear(fieldKey);
  return year ? `Bukti Bayar Pajak ${year}` : fieldKey;
}

const TAX_FIELD_KEY_SET = new Set<string>(["npwpDocumentPath", "sktDocumentPath"]);

export function documentFieldCategory(fieldKey: string): string {
  if (TAX_FIELD_KEY_SET.has(fieldKey) || parseTaxProofYear(fieldKey)) return "Perpajakan";
  return "Legalitas Perusahaan";
}

const DOCUMENT_FIELD_CODE: Record<DocumentFieldKey, string> = {
  nibDocumentPath: "NIB",
  kbliDocumentPath: "KBLI",
  notarialDocumentPath: "AKTA_PENDIRIAN",
  notarialAmendmentDocPath: "AKTA_PERUBAHAN",
  skDocumentPath: "SK_KEMENKUMHAM",
  npwpDocumentPath: "NPWP",
  sktDocumentPath: "SKT",
};

/** Short code used to build the display file name — see `document-filename.ts`. */
export function documentFieldCode(fieldKey: string): string {
  if (fieldKey in DOCUMENT_FIELD_CODE) return DOCUMENT_FIELD_CODE[fieldKey as DocumentFieldKey];
  const year = parseTaxProofYear(fieldKey);
  return year ? `BUKTI_PAJAK_${year}` : "DOKUMEN";
}
