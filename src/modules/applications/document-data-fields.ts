import type { ApplicationWizardValues } from "./schema";

/**
 * Data printed on (and checked against) a document, re-entered together with a new version of it.
 * Uploading a new SKT/NIB/Akta/kontrak sewa/… from Version History replaces the file; without this,
 * the Nomor/Tanggal/… the verifikator compares it with ("Uraian yang Diperiksa") and the report prints
 * would still describe the previous document.
 *
 * Where the values live depends on the document:
 * - company documents (NIB, SK, Akta, NPWP, SKT): top-level payload field + the same column on Company;
 * - location documents (`location:{id}:…`): that entry of payload.locations + Company.locations;
 * - everything else: the payload entry that carries the file (vkiSupportDocs, electricityMonths,
 *   partnerIndustriEntries, nonIndustriDocuments / konsumsiFinancialDocuments).
 * Documents without data of their own (rincian pajak, SHM/AJB, layout, bukti finansial, …) save the
 * file right away. Client-safe: no DB access.
 */
export type DocumentDataField = {
  name: string;
  label: string;
  type: "text" | "date" | "month" | "number" | "select";
  required: boolean;
  options?: readonly { value: string; label: string }[];
};

export type DocumentDataFieldValue = DocumentDataField & { value: string };

/** Live values the report prefers over the payload snapshot (see verifikator-workspace/company-context.ts). */
export type DocumentDataContext = {
  companyLegal?: Partial<Record<string, string | null>> | null;
  companyLocations?: unknown;
};

type Entry = Record<string, unknown>;
type Spec = {
  fields: readonly DocumentDataField[];
  read: (payload: ApplicationWizardValues, ctx: DocumentDataContext) => Entry;
  write: (payload: ApplicationWizardValues, values: Record<string, string>) => ApplicationWizardValues;
  /** Company documents: the same values also go to the Company row. */
  company?: true;
  /** Location documents: the same values also go to this Company.locations entry. */
  locationId?: string;
};

const text = (name: string, label: string, required = true): DocumentDataField => ({ name, label, type: "text", required });
const date = (name: string, label: string, required = true): DocumentDataField => ({ name, label, type: "date", required });

const COMPANY_FIELDS: Readonly<Record<string, readonly DocumentDataField[]>> = {
  nib: [text("nibNumber", "Nomor Induk Berusaha (NIB)"), date("nibIssueDate", "Tanggal Terbit NIB")],
  sk: [text("skNumber", "Nomor SK Kemenkumham"), date("skDate", "Tanggal SK Kemenkumham")],
  notarial: [text("notarialDeedNumber", "Nomor Akta Pendirian"), date("notarialDeedIssueDate", "Tanggal Akta Pendirian"), text("notarialIssuingAuthority", "Nama Notaris")],
  "notarial-amendment": [
    text("notarialAmendmentNumber", "Nomor Akta Perubahan"),
    date("notarialAmendmentDate", "Tanggal Akta Perubahan"),
    text("notarialAmendmentAuthority", "Nama Notaris"),
  ],
  npwp: [text("npwpNumber", "Nomor NPWP")],
  skt: [text("sktNumber", "Nomor Surat Keterangan Terdaftar (SKT)"), text("sktIssuer", "KPP Terdaftar"), date("sktDate", "Tanggal Terdaftar")],
};

const SURAT_PERNYATAAN_KEYS = ["tidak-diperjualbelikan", "memiliki-menguasai", "kebenaran-data", "alur-proses"];
const SURAT_PERNYATAAN_FIELDS = [text("nomorSurat", "Nomor Surat Pernyataan"), date("tanggal", "Tanggal Surat Pernyataan"), text("penandatangan", "Nama Penandatangan")];

/** Mirrors WAREHOUSE_REGISTRATION_TYPES / their labels (shared/schema.ts, document-checklist-items.ts). */
const WAREHOUSE_REGISTRATION_OPTIONS = [
  { value: "TANDA_DAFTAR_GUDANG", label: "Tanda Daftar Gudang" },
  { value: "PENETAPAN_GUDANG_BERIKAT", label: "Penetapan Gudang Berikat" },
  { value: "GUDANG_PENIMBUNAN_SEMENTARA", label: "Gudang Penimbunan Sementara" },
];

const MODAL_KERJA_KEY = "surat-pernyataan-modal-kerja";

/** Read/write one entry of a payload array, matched by `match`; a missing entry is created with `seed`. */
function arrayEntry<K extends keyof ApplicationWizardValues>(field: K, match: (entry: Entry) => boolean, seed: Entry) {
  const list = (payload: ApplicationWizardValues) => ((payload[field] as unknown as Entry[] | undefined) ?? []);
  return {
    read: (payload: ApplicationWizardValues): Entry => list(payload).find(match) ?? {},
    write: (payload: ApplicationWizardValues, values: Record<string, string>): ApplicationWizardValues => {
      const entries = list(payload);
      const found = entries.some(match);
      const next = found ? entries.map((entry) => (match(entry) ? { ...entry, ...values } : entry)) : [...entries, { ...seed, ...values }];
      return { ...payload, [field]: next } as ApplicationWizardValues;
    },
  };
}

function specFor(key: string): Spec | null {
  const companyFields = COMPANY_FIELDS[key];
  if (companyFields) {
    return {
      fields: companyFields,
      read: (payload, ctx) => {
        const out: Entry = { ...(payload as unknown as Entry) };
        for (const f of companyFields) if (ctx.companyLegal?.[f.name]) out[f.name] = ctx.companyLegal[f.name];
        return out;
      },
      write: (payload, values) => ({ ...payload, ...values }),
      company: true,
    };
  }

  const sp = key.match(/^vki-support:([^:]+)$/)?.[1];
  if (sp && SURAT_PERNYATAAN_KEYS.includes(sp)) {
    return { fields: SURAT_PERNYATAAN_FIELDS, ...arrayEntry("vkiSupportDocs", (e) => e.key === sp, { key: sp }) };
  }

  const monthId = key.match(/^vki-support:listrik:(.+)$/)?.[1];
  if (monthId) {
    return {
      fields: [
        { name: "bulan", label: "Periode Tagihan", type: "month", required: true },
        { name: "nominal", label: "Nominal Pembayaran (Rp)", type: "number", required: true },
        { name: "kwh", label: "Pemakaian Listrik (kWh)", type: "number", required: true },
      ],
      ...arrayEntry("electricityMonths", (e) => e.id === monthId, { id: monthId }),
    };
  }

  const partnerId = key.match(/^partner:([^:]+):lhvki$/)?.[1];
  if (partnerId) {
    return { fields: [text("lhvki", "Nomor LHVKI")], ...arrayEntry("partnerIndustriEntries", (e) => e.partnerId === partnerId, { partnerId, enabled: true }) };
  }

  const financial = key.match(/^(nonindustri-support|konsumsi-financial):(.+)$/);
  if (financial && financial[2] === MODAL_KERJA_KEY) {
    const field = financial[1] === "nonindustri-support" ? "nonIndustriDocuments" : "konsumsiFinancialDocuments";
    return {
      fields: [{ name: "amount", label: "Jumlah Modal Kerja (Rp)", type: "number", required: true }],
      ...arrayEntry(field, (e) => e.key === MODAL_KERJA_KEY, { key: MODAL_KERJA_KEY, enabled: true }),
    };
  }

  const location = key.match(/^location:([^:]+):(lease:[^:]+|warehouseRegistration|warehouseLayout)$/);
  if (location) {
    const [, locationId, kind] = location;
    const fields: DocumentDataField[] = kind.startsWith("lease:")
      ? [text("leaseOriginalOwnerName", "Nama Pemilik Asli"), date("leaseStartDate", "Tanggal Mulai Sewa"), date("leaseEndDate", "Tanggal Berakhir Sewa")]
      : kind === "warehouseRegistration"
        ? [
            { name: "warehouseRegistrationType", label: "Jenis Tanda Daftar", type: "select", required: true, options: WAREHOUSE_REGISTRATION_OPTIONS },
            text("warehouseRegistrationNumber", "Nomor Tanda Daftar Gudang"),
            date("warehouseRegistrationIssueDate", "Tanggal Terbit"),
            text("warehouseRegistrationIssuingAuthority", "Instansi Penerbit"),
          ]
        : [text("warehouseOwnerNibNumber", "NIB Pemilik Gudang", false)];
    const entry = arrayEntry("locations", (e) => e.id === locationId, { id: locationId });
    return {
      fields,
      read: (payload, ctx) => {
        const live = (Array.isArray(ctx.companyLocations) ? (ctx.companyLocations as Entry[]) : []).find((l) => l.id === locationId);
        return live ?? entry.read(payload);
      },
      write: entry.write,
      locationId,
    };
  }

  return null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function toInput(field: DocumentDataField, raw: unknown): string {
  const value = typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
  if (field.type === "date") return DATE_RE.test(value.slice(0, 10)) ? value.slice(0, 10) : "";
  if (field.type === "month") return MONTH_RE.test(value.slice(0, 7)) ? value.slice(0, 7) : "";
  return value;
}

/** The document's fields with their current values; [] when the document carries no data. */
export function documentDataFieldValues(key: string, payload: ApplicationWizardValues, ctx: DocumentDataContext = {}): DocumentDataFieldValue[] {
  const spec = specFor(key);
  if (!spec) return [];
  const source = spec.read(payload, ctx);
  return spec.fields.map((field) => ({ ...field, value: toInput(field, source[field.name]) }));
}

export type ParsedDocumentData = { ok: true; values: Record<string, string> } | { ok: false; error: string };

/** Validates the values sent with a new document version. Unknown names are ignored. */
export function parseDocumentData(key: string, raw: Record<string, unknown> | null | undefined): ParsedDocumentData {
  const values: Record<string, string> = {};
  for (const field of specFor(key)?.fields ?? []) {
    const input = raw?.[field.name];
    let value = typeof input === "string" ? input.trim() : "";
    if (field.type === "number") value = value.replace(/\D/g, "");
    if (!value) {
      if (field.required) return { ok: false, error: `${field.label} wajib diisi` };
      values[field.name] = "";
      continue;
    }
    if (field.type === "date" && !DATE_RE.test(value)) return { ok: false, error: `${field.label} tidak valid` };
    if (field.type === "month" && !MONTH_RE.test(value)) return { ok: false, error: `${field.label} tidak valid` };
    if (field.type === "select" && !field.options?.some((o) => o.value === value)) return { ok: false, error: `${field.label} tidak valid` };
    values[field.name] = value;
  }
  return { ok: true, values };
}

/** Payload with the re-entered values written where this document keeps them. */
export function applyDocumentDataToPayload(payload: ApplicationWizardValues, values: Record<string, string>, key: string): ApplicationWizardValues {
  const spec = specFor(key);
  if (!spec || Object.keys(values).length === 0) return payload;
  return spec.write(payload, values);
}

/** Company documents only: the values as Company columns (date columns as Date). */
export function companyDocumentDataUpdate(key: string, values: Record<string, string>): Record<string, string | Date> {
  const spec = specFor(key);
  const update: Record<string, string | Date> = {};
  if (!spec?.company) return update;
  for (const field of spec.fields) {
    const value = values[field.name];
    if (!value) continue;
    update[field.name] = field.type === "date" ? new Date(`${value}T00:00:00.000Z`) : value;
  }
  return update;
}

/** Location documents only: the Company.locations entry the values must also reach. */
export function documentDataLocationId(key: string): string | null {
  return specFor(key)?.locationId ?? null;
}
