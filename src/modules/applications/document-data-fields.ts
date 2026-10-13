import type { ApplicationWizardValues } from "./schema";

/**
 * Data printed on (and checked against) a document, re-entered together with a new version of it.
 * Uploading a new SKT/NIB/Akta/… from Version History replaces the file; without this, the
 * Nomor/Tanggal/Instansi the verifikator compares it with ("Uraian yang Diperiksa") and the report
 * prints would still describe the previous document.
 *
 * Company documents: field `name` is the same on the application payload and on the Company row (all
 * of these keys are COMPANY_MAPPED_DOCUMENT_KEYS), so one value updates both. VKI surat pernyataan
 * (`vki-support:{defKey}`): the fields live on that entry of `payload.vkiSupportDocs` only.
 * Client-safe: no DB access.
 */
export type DocumentDataField = {
  name: DocumentDataFieldName;
  label: string;
  type: "text" | "date";
  required: boolean;
};

export type DocumentDataFieldName =
  | "nibNumber"
  | "nibIssueDate"
  | "skNumber"
  | "skDate"
  | "notarialDeedNumber"
  | "notarialDeedIssueDate"
  | "notarialIssuingAuthority"
  | "notarialAmendmentNumber"
  | "notarialAmendmentDate"
  | "notarialAmendmentAuthority"
  | "npwpNumber"
  | "sktNumber"
  | "sktIssuer"
  | "sktDate"
  | "nomorSurat"
  | "tanggal"
  | "penandatangan";

/** The four VKI surat pernyataan uploaded with Nomor/Tanggal/Penandatangan (vkiSupportDocEntrySchema). */
const SURAT_PERNYATAAN_KEYS = ["tidak-diperjualbelikan", "memiliki-menguasai", "kebenaran-data", "alur-proses"] as const;
const SURAT_PERNYATAAN_FIELDS: readonly DocumentDataField[] = [
  { name: "nomorSurat", label: "Nomor Surat Pernyataan", type: "text", required: true },
  { name: "tanggal", label: "Tanggal Surat Pernyataan", type: "date", required: true },
  { name: "penandatangan", label: "Nama Penandatangan", type: "text", required: true },
];

/** `vki-support:memiliki-menguasai` → "memiliki-menguasai"; null for any other key. */
function suratPernyataanKey(key: string): string | null {
  const defKey = key.match(/^vki-support:([^:]+)$/)?.[1];
  return defKey && (SURAT_PERNYATAAN_KEYS as readonly string[]).includes(defKey) ? defKey : null;
}

export const DOCUMENT_DATA_FIELDS: Readonly<Record<string, readonly DocumentDataField[]>> = {
  nib: [
    { name: "nibNumber", label: "Nomor Induk Berusaha (NIB)", type: "text", required: true },
    { name: "nibIssueDate", label: "Tanggal Terbit NIB", type: "date", required: true },
  ],
  sk: [
    { name: "skNumber", label: "Nomor SK Kemenkumham", type: "text", required: true },
    { name: "skDate", label: "Tanggal SK Kemenkumham", type: "date", required: true },
  ],
  notarial: [
    { name: "notarialDeedNumber", label: "Nomor Akta Pendirian", type: "text", required: true },
    { name: "notarialDeedIssueDate", label: "Tanggal Akta Pendirian", type: "date", required: true },
    { name: "notarialIssuingAuthority", label: "Nama Notaris", type: "text", required: true },
  ],
  "notarial-amendment": [
    { name: "notarialAmendmentNumber", label: "Nomor Akta Perubahan", type: "text", required: true },
    { name: "notarialAmendmentDate", label: "Tanggal Akta Perubahan", type: "date", required: true },
    { name: "notarialAmendmentAuthority", label: "Nama Notaris", type: "text", required: true },
  ],
  npwp: [{ name: "npwpNumber", label: "Nomor NPWP", type: "text", required: true }],
  skt: [
    { name: "sktNumber", label: "Nomor Surat Keterangan Terdaftar (SKT)", type: "text", required: true },
    { name: "sktIssuer", label: "KPP Terdaftar", type: "text", required: true },
    { name: "sktDate", label: "Tanggal Terdaftar", type: "date", required: true },
  ],
  ...Object.fromEntries(SURAT_PERNYATAAN_KEYS.map((defKey) => [`vki-support:${defKey}`, SURAT_PERNYATAAN_FIELDS])),
};

export type DocumentDataFieldValue = DocumentDataField & { value: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "2024-03-05T00:00:00.000Z" / "2024-03-05" → "2024-03-05" (what <input type="date"> takes). */
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const head = value.slice(0, 10);
  return DATE_RE.test(head) ? head : "";
}

/** The document's fields with their current value (live Company value first, then the payload snapshot). */
export function documentDataFieldValues(
  key: string,
  payload: ApplicationWizardValues,
  companyLegal?: Partial<Record<DocumentDataFieldName, string | null>> | null,
): DocumentDataFieldValue[] {
  const spKey = suratPernyataanKey(key);
  const source: Record<string, unknown> = spKey
    ? ((payload.vkiSupportDocs ?? []).find((entry) => entry.key === spKey) ?? {})
    : (payload as Record<string, unknown>);
  return (DOCUMENT_DATA_FIELDS[key] ?? []).map((field) => {
    const raw = (spKey ? null : companyLegal?.[field.name]) || source[field.name];
    const text = typeof raw === "string" ? raw : "";
    return { ...field, value: field.type === "date" ? toDateInput(text) : text };
  });
}

export type ParsedDocumentData = { ok: true; values: Partial<Record<DocumentDataFieldName, string>> } | { ok: false; error: string };

/** Validates the values sent with a new document version. Unknown names are ignored. */
export function parseDocumentData(key: string, raw: Record<string, unknown> | null | undefined): ParsedDocumentData {
  const fields = DOCUMENT_DATA_FIELDS[key] ?? [];
  const values: Partial<Record<DocumentDataFieldName, string>> = {};
  for (const field of fields) {
    const input = raw?.[field.name];
    const value = typeof input === "string" ? input.trim() : "";
    if (!value) {
      if (field.required) return { ok: false, error: `${field.label} wajib diisi` };
      continue;
    }
    if (field.type === "date" && !DATE_RE.test(value)) return { ok: false, error: `${field.label} tidak valid` };
    values[field.name] = value;
  }
  return { ok: true, values };
}

/** Payload with the re-entered values (dates kept as "YYYY-MM-DD", like the wizard stores them). */
export function applyDocumentDataToPayload(
  payload: ApplicationWizardValues,
  values: Partial<Record<DocumentDataFieldName, string>>,
  key: string,
): ApplicationWizardValues {
  const spKey = suratPernyataanKey(key);
  if (!spKey) return { ...payload, ...values };
  const entries = payload.vkiSupportDocs ?? [];
  const found = entries.some((entry) => entry.key === spKey);
  return {
    ...payload,
    vkiSupportDocs: found
      ? entries.map((entry) => (entry.key === spKey ? { ...entry, ...values } : entry))
      : [...entries, { key: spKey, ...values }],
  };
}

/** The same values for the Company row (date columns as Date). */
export function companyDocumentDataUpdate(key: string, values: Partial<Record<DocumentDataFieldName, string>>): Record<string, string | Date> {
  const update: Record<string, string | Date> = {};
  if (suratPernyataanKey(key)) return update; // application-only document
  for (const field of DOCUMENT_DATA_FIELDS[key] ?? []) {
    const value = values[field.name];
    if (!value) continue;
    update[field.name] = field.type === "date" ? new Date(`${value}T00:00:00.000Z`) : value;
  }
  return update;
}
