import {
  findDocumentDef,
  getScheme,
  belumDiatur,
  type DocTextParams,
  type DocumentNarrative,
  type SchemeId,
  type SchemeNarrative,
  type SchemeTerms,
} from "@/modules/schemes";
import { createComplianceResolver, type ComplianceResolver } from "./scheme-compliance";
import {
  buildLocationDocuments,
  KONSUMSI_MODAL_FINANSIAL_DOCUMENTS,
  LEGALITAS_DOCUMENTS,
  MODAL_FINANSIAL_DOCUMENTS,
  PERPAJAKAN_DOCUMENTS,
  type DocDetail,
  type DocField,
  type NarrativeContext,
} from "./report-narrative";

/**
 * Per-scheme content for the Laporan Verifikasi Dokumen. Returned only when every scheme of the
 * application is rolled out (schemes/rollout.ts); otherwise the report keeps its legacy text.
 *
 * Document pages reuse the legacy DocDetail's DATA (documentPath, fields, verification state) but
 * ALL wording — intro, findings, kesimpulan — comes from the scheme's own narrative.ts. A document
 * without legacy DocDetail (Merek, Uji Mutu, Label, …) gets a generic data block from its row.
 */
export type ReportRow = {
  key: string;
  label: string;
  category: string;
  documentPath: string | null;
  status: string;
};

export type SchemeReport = {
  schemes: SchemeId[];
  terms: SchemeTerms[];
  narrative: SchemeNarrative;
  compliance: ComplianceResolver;
  /** e.g. "VIU Barang Konsumsi" (multi: joined with " + ") */
  label: string;
  family: "VKI" | "VIU";
  /** Rows that belong in the report: supporting documents without a file are dropped. */
  relevantRows: <R extends ReportRow>(rows: R[]) => R[];
  /** Chapters (checklist categories) in the scheme's report order. */
  orderCategories: (categories: string[]) => string[];
  buildCategoryDocs: (category: string, rows: ReportRow[], ctx: NarrativeContext) => DocDetail[];
  productChapter: { title: string; desc: (company: string) => string } | null;
};

export function toRoman(n: number): string {
  const table: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  let rest = n;
  for (const [value, numeral] of table) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out || String(n);
}

function locationTypeMap(ctx: NarrativeContext): Record<string, string> {
  const map: Record<string, string> = {};
  for (const loc of [...(ctx.payload.locations ?? []), ...(ctx.companyLocations ?? [])]) map[loc.id] = loc.locationType;
  return map;
}

function genericDoc(row: ReportRow): DocDetail {
  const hasDocument = Boolean(row.documentPath);
  return {
    key: row.key,
    no: 0,
    title: row.label,
    documentPath: () => row.documentPath,
    intro: () => [],
    fields: () => [
      { label: "Nama Dokumen", value: row.label, ok: true },
      { label: "Status Unggah", value: hasDocument ? "Diunggah" : "Belum Diunggah", ok: hasDocument },
    ],
    findings: () => [],
    kesimpulan: (ctx) => ({ memenuhi: hasDocument && ctx.documentStatuses[row.key] === "VALID", text: "" }),
  };
}

/** Same points as the review modal's "Uraian yang Diperiksa" for Sertifikat Merek
 * (document-checklist-items.ts brandEvidenceItems), printed as the page's data block. */
function brandEvidenceDoc(row: ReportRow, brandId: string): DocDetail {
  const hasDocument = Boolean(row.documentPath);
  const field = (label: string, value: string | null | undefined): DocField => ({ label, value: value || "—", ok: Boolean(value) });
  return {
    ...genericDoc(row),
    fields: (ctx) => {
      const brand = ctx.konsumsiBrands?.find((b) => b.brandId === brandId);
      const details = brand?.details ?? null;
      return [
        field("Nama Merek", brand?.brandName),
        field("Jenis Bukti Merek", details?.evidenceTypeLabel),
        field("Nomor Sertifikat / Pendaftaran", details?.registrationNumber),
        field("Tanggal Penerbitan", details?.registrationDate ? fmtTanggal(details.registrationDate) : null),
        field("Tanggal Kedaluwarsa", details?.registrationExpiryDate ? fmtTanggal(details.registrationExpiryDate) : null),
        field("Kelas Merek", details?.trademarkClasses.join("; ")),
        field("Pemilik Merek", details?.ownerName),
        field("Hubungan dengan Pemohon VIU Konsumsi", details?.applicantRelationship),
        { label: "Status Unggah", value: hasDocument ? "Diunggah" : "Belum Diunggah", ok: hasDocument },
      ];
    },
  };
}

function fmtTanggal(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function createSchemeReport(source: {
  verificationType: string;
  payload: NarrativeContext["payload"];
  companyLocations: NarrativeContext["companyLocations"];
}): SchemeReport | null {
  const compliance = createComplianceResolver(
    { verificationType: source.verificationType, importTypes: source.payload.importTypes, locations: source.payload.locations },
    source.companyLocations,
  );
  const schemes = compliance.schemes;
  if (!schemes) return null;
  const primary = schemes.find((s) => getScheme(s).narrative) ?? schemes[0];
  const narrative = getScheme(primary).narrative;
  if (!narrative) return null; // rolled out without narrative — never print another scheme's text

  const terms = schemes.map((s) => getScheme(s).terms);
  const locationTypeById: Record<string, string> = {};
  for (const loc of [...(source.payload.locations ?? []), ...(source.companyLocations ?? [])]) locationTypeById[loc.id] = loc.locationType;

  const defFor = (key: string, ctx?: NarrativeContext) => {
    const types = ctx ? locationTypeMap(ctx) : locationTypeById;
    for (const scheme of schemes) {
      const def = findDocumentDef(scheme, key, { locationTypeById: types });
      if (def) return { scheme, def };
    }
    return undefined;
  };

  const relevantRows = <R extends ReportRow>(rows: R[]): R[] =>
    rows.filter((row) => {
      const found = defFor(row.key);
      if (!found) return false;
      // Supporting documents the company never uploaded have no page, row or count in the report;
      // only mandatory ones (Wajib / alternatif / pilih salah satu) are reported as missing.
      const supporting = found.def.sifat === "PENDUKUNG" || found.def.sifat === "PENDUKUNG_JIKA_ADA";
      return !(supporting && !row.documentPath);
    });

  const sectionOrder = compliance.sections().map((s) => s.category);
  const orderCategories = (categories: string[]) =>
    [...categories].sort((a, b) => {
      const ia = sectionOrder.indexOf(a);
      const ib = sectionOrder.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });

  const buildCategoryDocs = (category: string, rows: ReportRow[], ctx: NarrativeContext): DocDetail[] => {
    const legacy: DocDetail[] = [
      ...LEGALITAS_DOCUMENTS,
      ...PERPAJAKAN_DOCUMENTS,
      ...buildLocationDocuments(ctx),
      ...(category === "Bukti Kemampuan Finansial — Konsumsi" ? KONSUMSI_MODAL_FINANSIAL_DOCUMENTS : MODAL_FINANSIAL_DOCUMENTS),
    ];
    return rows
      .filter((row) => row.category === category)
      .map((row, i) => {
        const brandEvidenceId = row.key.match(/^konsumsi-brand:([^:]+):evidence$/)?.[1];
        const base =
          legacy.find((d) => d.key === row.key) ?? (brandEvidenceId ? brandEvidenceDoc(row, brandEvidenceId) : genericDoc(row));
        const found = defFor(row.key, ctx);
        const text: DocumentNarrative | string = found
          ? (getScheme(found.scheme).narrative?.documents[found.def.id] ?? belumDiatur(found.scheme, `narasi dokumen "${found.def.label}"`))
          : belumDiatur(primary, `dokumen "${row.label}"`);
        const params = (c: NarrativeContext): DocTextParams => {
          const fields = base.fields(c).map((f) => ({ label: f.label, value: f.value }));
          return {
            company: c.company,
            title: base.title,
            memenuhi: base.kesimpulan(c).memenuhi,
            hasDocument: Boolean(row.documentPath ?? base.documentPath(c)),
            fields,
            field: (label) => fields.find((f) => f.label === label)?.value || "—",
          };
        };
        if (typeof text === "string") {
          // "[BELUM DIATUR …]" — printed as-is so the gap is visible; never another scheme's text.
          return { ...base, no: i + 1, intro: () => [text], findings: () => [], kesimpulan: () => ({ memenuhi: false, text }) };
        }
        return {
          ...base,
          no: i + 1,
          intro: (c) => text.intro(params(c)),
          findings: (c) => text.findings(params(c)),
          kesimpulan: (c) => {
            const p = params(c);
            return { memenuhi: p.memenuhi, text: text.conclusion(p) };
          },
        };
      });
  };

  const isKonsumsiOnly = schemes.length === 1 && schemes[0] === "VIU_KONSUMSI";
  return {
    schemes,
    terms,
    narrative,
    compliance,
    label: terms.map((t) => t.shortLabel).join(" + "),
    family: terms[0].family,
    relevantRows,
    orderCategories,
    buildCategoryDocs,
    productChapter: isKonsumsiOnly
      ? {
          title: "Produk Tekstil yang Akan Diimpor",
          desc: (company) =>
            `Klasifikasi Produk Tekstil yang akan diimpor ${company} sebagai barang konsumsi, beserta merek, deskripsi produk, dan pos tarif/Harmonized System (HS Code) yang berlaku.`,
        }
      : null,
  };
}
