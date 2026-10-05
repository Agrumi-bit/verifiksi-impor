import { getScheme } from "./registry";
import {
  DOCUMENT_SIFAT,
  VIU_SCHEME_IDS,
  type DocumentNarrative,
  type DocumentSifat,
  type LegalBasis,
  type ReportSectionId,
  type SchemeDocumentDef,
  type SchemeId,
  type SchemeLocationType,
  type SchemeTerms,
  type SectionNarrative,
} from "./types";

// ---------------------------------------------------------------------------------------------
// Scheme resolution
// ---------------------------------------------------------------------------------------------

const IMPORT_TYPE_TO_SCHEME: Record<string, SchemeId> = {
  BAHAN_BAKU_INDUSTRI: "VIU_BAHAN_BAKU_INDUSTRI",
  BAHAN_BAKU_NON_INDUSTRI: "VIU_BAHAN_BAKU_NON_INDUSTRI",
  BARANG_KONSUMSI: "VIU_KONSUMSI",
};

export type SchemeSource = {
  verificationType?: string | null;
  importTypes?: readonly string[] | null;
};

/**
 * Every scheme an application belongs to. VKI → ["VKI"]. VIU → one scheme per selected import
 * type, in a fixed order (Industri, Non Industri, Konsumsi). Unknown/empty → [] (callers must treat
 * that as "skema belum ditentukan", never as VKI).
 */
export function resolveSchemes(source: SchemeSource): SchemeId[] {
  if (source.verificationType === "VKI") return ["VKI"];
  if (source.verificationType !== "VIU") return [];
  const selected = new Set((source.importTypes ?? []).map((t) => IMPORT_TYPE_TO_SCHEME[t]).filter(Boolean));
  return VIU_SCHEME_IDS.filter((id) => selected.has(id));
}

export type ResolvedScheme = {
  schemes: SchemeId[];
  family: "VKI" | "VIU" | null;
  /** VIU application with more than one import type → one report, common chapters once. */
  isMulti: boolean;
  terms: SchemeTerms[];
};

export function resolveScheme(source: SchemeSource): ResolvedScheme {
  const schemes = resolveSchemes(source);
  return {
    schemes,
    family: schemes.length === 0 ? null : schemes[0] === "VKI" ? "VKI" : "VIU",
    isMulti: schemes.length > 1,
    terms: schemes.map((id) => getScheme(id).terms),
  };
}

// ---------------------------------------------------------------------------------------------
// "Belum diatur" marker
// ---------------------------------------------------------------------------------------------

export const BELUM_DIATUR_PREFIX = "[BELUM DIATUR untuk";

export function belumDiatur(scheme: SchemeId, what: string): string {
  return `${BELUM_DIATUR_PREFIX} ${getScheme(scheme).terms.shortLabel}] ${what}`;
}

export function isBelumDiatur(text: string | null | undefined): boolean {
  return Boolean(text?.includes(BELUM_DIATUR_PREFIX));
}

// ---------------------------------------------------------------------------------------------
// Key pattern matching
// ---------------------------------------------------------------------------------------------

/** Returns the number of literal segments matched (specificity), or -1 when the key doesn't match. */
export function matchKeyPattern(pattern: string, key: string): number {
  const p = pattern.split(":");
  const k = key.split(":");
  let literal = 0;
  for (let i = 0; i < p.length; i++) {
    const seg = p[i];
    if (seg === "*") return i <= k.length ? literal : -1;
    if (i >= k.length) return -1;
    if (/^\{[^}]+\}$/.test(seg)) {
      if (!k[i]) return -1;
      continue;
    }
    if (seg !== k[i]) return -1;
    literal++;
  }
  return p.length === k.length ? literal : -1;
}

export type DocumentContext = {
  /** Needed to tell a Kantor tenure document from a Gudang/Pabrik one. */
  locationTypeById?: Readonly<Record<string, SchemeLocationType | string>>;
};

function locationTypeOf(key: string, ctx?: DocumentContext): string | undefined {
  if (!key.startsWith("location:")) return undefined;
  return ctx?.locationTypeById?.[key.split(":")[1]];
}

/** The scheme's own definition for a checklist key, or undefined when the scheme doesn't ask for it. */
export function findDocumentDef(scheme: SchemeId, key: string, ctx?: DocumentContext): SchemeDocumentDef | undefined {
  const locationType = locationTypeOf(key, ctx);
  let best: SchemeDocumentDef | undefined;
  let bestScore = -1;
  for (const def of getScheme(scheme).documents) {
    if (def.locationTypes && locationType && !def.locationTypes.includes(locationType as SchemeLocationType)) continue;
    for (const pattern of def.keyPatterns) {
      const score = matchKeyPattern(pattern, key);
      if (score > bestScore) {
        best = def;
        bestScore = score;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// Documents across one or more schemes
// ---------------------------------------------------------------------------------------------

const SIFAT_RANK: Record<DocumentSifat, number> = Object.fromEntries(
  DOCUMENT_SIFAT.map((s, i) => [s, DOCUMENT_SIFAT.length - i]),
) as Record<DocumentSifat, number>;

/** Strongest sifat wins (WAJIB > WAJIB_ALTERNATIF > PILIH_SALAH_SATU > PENDUKUNG > PENDUKUNG_JIKA_ADA). */
export function strongestSifat(values: DocumentSifat[]): DocumentSifat {
  return values.reduce((a, b) => (SIFAT_RANK[b] > SIFAT_RANK[a] ? b : a));
}

export type ResolvedDocument = {
  id: string;
  label: string;
  section: ReportSectionId;
  sifat: DocumentSifat;
  /** Each scheme keeps its OWN legal basis — never merged into one citation. */
  bySchemes: { scheme: SchemeId; def: SchemeDocumentDef }[];
};

/** Union of the documents of the given schemes; a document shared by several schemes appears once. */
export function resolveSchemeDocuments(schemes: readonly SchemeId[]): ResolvedDocument[] {
  const byId = new Map<string, ResolvedDocument>();
  for (const scheme of schemes) {
    for (const def of getScheme(scheme).documents) {
      const existing = byId.get(def.id);
      if (existing) {
        existing.bySchemes.push({ scheme, def });
        existing.sifat = strongestSifat([existing.sifat, def.sifat]);
      } else {
        byId.set(def.id, { id: def.id, label: def.label, section: def.section, sifat: def.sifat, bySchemes: [{ scheme, def }] });
      }
    }
  }
  return [...byId.values()];
}

export type DocumentRequirement = {
  applicable: boolean;
  sifat: DocumentSifat | null;
  bySchemes: { scheme: SchemeId; def: SchemeDocumentDef }[];
};

/**
 * Is this checklist key part of the application's scheme(s), and how binding is it?
 * Keys no scheme defines (e.g. a VKI-only key on a VIU application, legacy `support:{id}`) are
 * not applicable → hidden from checklists/reports, never deleted from storage.
 */
export function resolveDocumentRequirement(
  schemes: readonly SchemeId[],
  key: string,
  ctx?: DocumentContext,
): DocumentRequirement {
  const bySchemes = schemes
    .map((scheme) => ({ scheme, def: findDocumentDef(scheme, key, ctx) }))
    .filter((x): x is { scheme: SchemeId; def: SchemeDocumentDef } => Boolean(x.def));
  return {
    applicable: bySchemes.length > 0,
    sifat: bySchemes.length ? strongestSifat(bySchemes.map((x) => x.def.sifat)) : null,
    bySchemes,
  };
}

export function isDocumentApplicable(schemes: readonly SchemeId[], key: string, ctx?: DocumentContext): boolean {
  return resolveDocumentRequirement(schemes, key, ctx).applicable;
}

export function legalBasisFor(scheme: SchemeId, key: string, ctx?: DocumentContext): LegalBasis | null {
  return findDocumentDef(scheme, key, ctx)?.legalBasis ?? null;
}

// ---------------------------------------------------------------------------------------------
// Report content
// ---------------------------------------------------------------------------------------------

/** Chapters shared by every VIU scheme — printed ONCE in a multi-import-type report. */
export const COMMON_REPORT_SECTIONS: readonly ReportSectionId[] = ["legalitas", "perpajakan", "lokasi"];

export type ReportSectionContent = {
  section: ReportSectionId;
  /** Scheme whose narrative/legal basis the section uses. Common sections list every scheme. */
  schemes: SchemeId[];
  narrative: SectionNarrative | string;
};

export type ReportContent = {
  schemes: SchemeId[];
  terms: SchemeTerms[];
  forewords: (string)[];
  conclusions: (string)[];
  sections: ReportSectionContent[];
  documentNarrative: (scheme: SchemeId, documentId: string) => DocumentNarrative | string;
  /** Every "[BELUM DIATUR …]" marker in the content. Non-empty → finalization must be blocked. */
  unresolved: string[];
};

/**
 * Report structure for the application's schemes:
 *   1. common chapters (Legalitas, Perpajakan, Lokasi) once,
 *   2. then each scheme's own chapters in scheme order (e.g. Mitra Industri, Merek, Uji Mutu…).
 * Missing narrative never falls back to another scheme: it resolves to the BELUM DIATUR marker
 * and is listed in `unresolved`.
 */
export function resolveReportContent(schemes: readonly SchemeId[]): ReportContent {
  const unresolved: string[] = [];
  const track = (text: string) => {
    if (isBelumDiatur(text)) unresolved.push(text);
    return text;
  };

  const sections: ReportSectionContent[] = [];
  const seen = new Set<ReportSectionId>();

  for (const scheme of schemes) {
    for (const section of getScheme(scheme).reportSections) {
      const isCommon = COMMON_REPORT_SECTIONS.includes(section);
      if (isCommon && seen.has(section)) {
        sections.find((s) => s.section === section)!.schemes.push(scheme);
        continue;
      }
      // A scheme-specific chapter id shared by two schemes (e.g. kemampuan-finansial in Industri
      // and Non Industri) stays one chapter PER scheme, each with its own narrative.
      seen.add(section);
      const narrative = getScheme(scheme).narrative.sections[section];
      sections.push({
        section,
        schemes: [scheme],
        narrative: narrative ?? track(belumDiatur(scheme, `narasi bab "${section}"`)),
      });
    }
  }

  const forewords = schemes.map((s) => getScheme(s).narrative.foreword || track(belumDiatur(s, "kata pengantar")));
  const conclusions = schemes.map((s) => getScheme(s).narrative.conclusion || track(belumDiatur(s, "kesimpulan")));

  for (const scheme of schemes) {
    for (const def of getScheme(scheme).documents) {
      if (!getScheme(scheme).narrative.documents[def.id]) track(belumDiatur(scheme, `narasi dokumen "${def.label}"`));
    }
  }

  return {
    schemes: [...schemes],
    terms: schemes.map((s) => getScheme(s).terms),
    forewords,
    conclusions,
    sections,
    documentNarrative: (scheme, documentId) =>
      getScheme(scheme).narrative.documents[documentId] ?? belumDiatur(scheme, `narasi dokumen "${documentId}"`),
    unresolved,
  };
}

export function canFinalizeReport(content: ReportContent): { ok: boolean; reasons: string[] } {
  return { ok: content.unresolved.length === 0, reasons: content.unresolved };
}

// ---------------------------------------------------------------------------------------------
// Forbidden terms
// ---------------------------------------------------------------------------------------------

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Forbidden phrases of `scheme` found in `text` (case-insensitive, whole-word). */
export function findForbiddenTerms(scheme: SchemeId, text: string): string[] {
  return getScheme(scheme).terms.forbiddenTerms.filter((term) =>
    new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}($|[^\\p{L}\\p{N}])`, "iu").test(text),
  );
}

// ---------------------------------------------------------------------------------------------
// KBLI (VIU only — Pasal 37 ayat (2) … angka 2 huruf b) jo. Pasal 38 ayat (2) huruf b)
// ---------------------------------------------------------------------------------------------

export type KbliCheck = {
  scheme: SchemeId;
  ok: boolean;
  allowed: readonly string[];
  matched: string[];
};

/** For every VIU scheme: does the company hold at least one allowed KBLI? VKI is never checked. */
export function validateViuKbli(schemes: readonly SchemeId[], kbliCodes: readonly string[]): KbliCheck[] {
  const codes = kbliCodes.map((c) => c.replace(/\D/g, "").slice(0, 5)).filter(Boolean);
  return schemes
    .filter((s) => s !== "VKI")
    .map((scheme) => {
      const allowed = getScheme(scheme).terms.allowedKbli ?? [];
      const matched = codes.filter((c) => allowed.includes(c));
      return { scheme, ok: matched.length > 0, allowed, matched };
    });
}
