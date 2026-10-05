import {
  DOCUMENT_SIFAT_LABELS,
  getScheme,
  isSchemeRolloutActive,
  resolveDocumentRequirement,
  resolveSchemes,
  type LegalBasis,
  type ReportSectionId,
  type SchemeId,
} from "@/modules/schemes";
import { COMPLIANCE_SECTION_DEFS, getComplianceDef, type DocumentComplianceDef } from "./document-compliance-defs";

/**
 * Bridges the checklist UIs and the document report to the per-scheme module
 * (src/modules/schemes). For an application whose schemes are all rolled out, every
 * "Persyaratan / Referensi Regulasi / Keterangan" cell and every section intro comes from its own
 * scheme — never from the VKI-worded legacy defs. Other applications keep the legacy defs until
 * their scheme's stage lands (schemes/rollout.ts). Client-safe: no DB access.
 */

/** Checklist category (buildDocumentChecklist) → scheme report section. */
export const CATEGORY_SECTION: Record<string, ReportSectionId> = {
  "Legalitas Perusahaan": "legalitas",
  Perpajakan: "perpajakan",
  "Dokumen Lokasi": "lokasi",
  "Bukti Kemampuan Finansial — Konsumsi": "kemampuan-finansial",
  "Dokumen Pendukung": "kemampuan-finansial",
  "Dokumen Merek": "merek",
  "Sertifikat Uji Mutu": "uji-mutu",
  "Dokumen Label": "label",
  "Dokumen Partner Industri": "mitra-industri",
  "Tenaga Kerja": "tenaga-kerja",
  "Surat Pernyataan": "surat-pernyataan",
  "Dokumen Pendukung VKI": "kemampuan-produksi",
};

/** Scheme report section → the checklist category that holds its documents for that scheme. */
export function categoryForSection(section: ReportSectionId, scheme: SchemeId): string | undefined {
  if (section === "kemampuan-finansial") return scheme === "VIU_KONSUMSI" ? "Bukti Kemampuan Finansial — Konsumsi" : "Dokumen Pendukung";
  return Object.entries(CATEGORY_SECTION).find(([, s]) => s === section)?.[0];
}

export type ComplianceSection = { category: string; title: string; desc: string; intro: readonly string[] };

export type SchemeSource = {
  verificationType?: string | null;
  importTypes?: readonly string[] | null;
  locations?: readonly { id: string; locationType: string }[] | null;
};

export type ComplianceResolver = {
  /** null → legacy (scheme not rolled out yet). */
  schemes: SchemeId[] | null;
  def: (key: string) => DocumentComplianceDef | undefined;
  /** Every applicable section, in report order. Callers may drop empty ones. */
  sections: () => ComplianceSection[];
  section: (category: string) => ComplianceSection | undefined;
};

const PERMENPERIN_SHORT = "Permenperin Nomor 27 Tahun 2025";

function formatReference(basis: LegalBasis): string {
  if (basis.kind === "INTERNAL_LVI") return "Persyaratan internal Lembaga Pelaksana Verifikasi";
  if (basis.kind === "TERKAIT") return `${basis.citation} ${PERMENPERIN_SHORT} (persyaratan terkait)`;
  return `${basis.citation} ${PERMENPERIN_SHORT}`;
}

function legacyResolver(verificationType: string | null | undefined): ComplianceResolver {
  const sections = COMPLIANCE_SECTION_DEFS.filter(
    (def) => (!def.vkiOnly || verificationType === "VKI") && (!def.viuOnly || verificationType === "VIU"),
  ).map((def) => ({ category: def.category, title: def.title, desc: def.desc, intro: def.intro }));
  return {
    schemes: null,
    def: getComplianceDef,
    sections: () => sections,
    section: (category) => sections.find((s) => s.category === category),
  };
}

export function createComplianceResolver(source: SchemeSource, companyLocations?: readonly { id: string; locationType: string }[] | null): ComplianceResolver {
  const schemes = resolveSchemes(source);
  if (!isSchemeRolloutActive(schemes)) return legacyResolver(source.verificationType);

  const locationTypeById: Record<string, string> = {};
  for (const loc of [...(source.locations ?? []), ...(companyLocations ?? [])]) locationTypeById[loc.id] = loc.locationType;
  const multi = schemes.length > 1;

  const def = (key: string): DocumentComplianceDef | undefined => {
    const req = resolveDocumentRequirement(schemes, key, { locationTypeById });
    if (!req.applicable || !req.sifat) return undefined;
    const references = req.bySchemes.map(({ scheme, def: d }) => {
      const ref = formatReference(d.legalBasis);
      return multi ? `${getScheme(scheme).terms.shortLabel}: ${ref}` : ref;
    });
    const first = req.bySchemes[0];
    const narrative = getScheme(first.scheme).narrative?.documents[first.def.id];
    return {
      persyaratan: DOCUMENT_SIFAT_LABELS[req.sifat],
      referensi: [...new Set(references)].join("; "),
      keterangan: narrative?.keterangan ?? first.def.legalBasis.note ?? "",
    };
  };

  const sections = (): ComplianceSection[] => {
    const out: ComplianceSection[] = [];
    for (const scheme of schemes) {
      const narrative = getScheme(scheme).narrative;
      for (const section of getScheme(scheme).reportSections) {
        const category = categoryForSection(section, scheme);
        if (!category || out.some((s) => s.category === category)) continue;
        const text = narrative?.sections[section];
        out.push({
          category,
          title: text?.title ?? category,
          desc: text?.desc ?? "",
          intro: text?.intro ?? [],
        });
      }
    }
    return out;
  };

  return { schemes, def, sections, section: (category) => sections().find((s) => s.category === category) };
}
