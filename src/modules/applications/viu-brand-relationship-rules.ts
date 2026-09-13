import { getRequiredBrandDocuments } from "@/modules/merk/document-requirements";
import type { BrandDocumentCategory } from "@/modules/merk/document-requirements";
import type { MerkEvidenceType, MerkOwnerLocation } from "@/modules/merk/schema";

/**
 * VIU Barang Konsumsi — Step "Merek yang Digunakan" business rules.
 *
 * Pure, framework-agnostic module (no React, no Prisma) so it can run
 * identically on the client (live UI state) and the server (final submit
 * enforcement) — see BR-003 in the Add Brand review, which deferred exactly
 * this linkage until "create application VIU Konsumsi" was built.
 *
 * Deliberately reuses `getRequiredBrandDocuments` from the Merk module
 * instead of re-deriving a parallel document list: a brand's legal
 * relationship (domestic/foreign owner, representation type, appointment
 * source) already produces the same "representation" /
 * "official_representative_legal" / "import_authorization" document
 * requirements the Add Brand wizard's own Step 4 shows — this module only
 * adds what's genuinely new for VIU: the 9-month registration-evidence rule,
 * the foreign-owner direct-appointment restriction, and translating this
 * application's own applicantRole/appointmentSource into the shape that
 * engine expects.
 */

export const APPLICANT_BRAND_ROLES = ["OFFICIAL_REPRESENTATIVE", "IMPORTER_ONLY", "OWNER"] as const;
export type ApplicantBrandRole = (typeof APPLICANT_BRAND_ROLES)[number];
export const APPLICANT_BRAND_ROLE_LABELS: Record<ApplicantBrandRole, string> = {
  OFFICIAL_REPRESENTATIVE: "Perwakilan Resmi",
  IMPORTER_ONLY: "Hanya Bertindak sebagai Importir",
  OWNER: "Pemohon VIU Konsumsi sebagai Pemilik Merek",
};

export const IMPORT_APPOINTMENT_SOURCES = ["BRAND_OWNER", "OFFICIAL_REPRESENTATIVE"] as const;
export type ImportAppointmentSource = (typeof IMPORT_APPOINTMENT_SOURCES)[number];
export const IMPORT_APPOINTMENT_SOURCE_LABELS: Record<ImportAppointmentSource, string> = {
  BRAND_OWNER: "Pemilik Merek",
  OFFICIAL_REPRESENTATIVE: "Perwakilan Resmi",
};

export const BRAND_APPLICATION_READINESS = ["READY", "INCOMPLETE", "NOT_ELIGIBLE"] as const;
export type BrandApplicationReadiness = (typeof BRAND_APPLICATION_READINESS)[number];
export const BRAND_APPLICATION_READINESS_LABELS: Record<BrandApplicationReadiness, string> = {
  READY: "Siap Digunakan",
  INCOMPLETE: "Perlu Dilengkapi",
  NOT_ELIGIBLE: "Tidak Dapat Digunakan",
};

export const REQUIREMENT_RULE_STATUSES = ["REQUIRED", "EXEMPT", "NOT_APPLICABLE"] as const;
export type RequirementRuleStatus = (typeof REQUIREMENT_RULE_STATUSES)[number];

export type DocumentAvailability = "AVAILABLE" | "MISSING";

export const TRADEMARK_EVIDENCE_VALIDITY_STATUSES = [
  "NOT_APPLICABLE",
  "VALID_WITHIN_9_MONTHS",
  "EXPIRED_9_MONTH_LIMIT",
] as const;
export type TrademarkEvidenceValidityStatus = (typeof TRADEMARK_EVIDENCE_VALIDITY_STATUSES)[number];

export type TrademarkEvidenceValidity = {
  status: TrademarkEvidenceValidityStatus;
  /** registrationDate — doubles as the "notification date" for
   * SERTIFIKAT_INTERNASIONAL, since Merk stores a single date column reused
   * across all three evidence types (see step1-brand-info.tsx's
   * DATE_FIELD_LABEL). */
  baseDate: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
};

export type VIURequirementItem = {
  code: string;
  label: string;
  category: BrandDocumentCategory;
  requirementStatus: RequirementRuleStatus;
  availability: DocumentAvailability | null;
};

export const DOCUMENT_DISPLAY_STATES = ["TERSEDIA", "BELUM_TERSEDIA", "DIKECUALIKAN", "TIDAK_BERLAKU"] as const;
export type DocumentDisplayState = (typeof DOCUMENT_DISPLAY_STATES)[number];
export const DOCUMENT_DISPLAY_STATE_LABELS: Record<DocumentDisplayState, string> = {
  TERSEDIA: "Tersedia",
  BELUM_TERSEDIA: "Belum Tersedia",
  DIKECUALIKAN: "Dikecualikan",
  TIDAK_BERLAKU: "Tidak Berlaku",
};

/** The single source of truth for which of the 4 user-facing document
 * states a requirement item shows — combines `requirementStatus` (the
 * regulation) with `availability` (the upload) so UI never has to re-derive
 * that mapping itself. */
export function getDocumentDisplayState(item: VIURequirementItem): DocumentDisplayState {
  if (item.requirementStatus === "EXEMPT") return "DIKECUALIKAN";
  if (item.requirementStatus === "NOT_APPLICABLE") return "TIDAK_BERLAKU";
  return item.availability === "AVAILABLE" ? "TERSEDIA" : "BELUM_TERSEDIA";
}

export type VIUBrandRuleInput = {
  brandStatus: "ACTIVE" | "DRAFT" | "INACTIVE";
  evidenceType: MerkEvidenceType | null;
  registrationDate: string | null;
  ownerLocation: MerkOwnerLocation | null;
  applicantRole: ApplicantBrandRole | null;
  appointmentSource: ImportAppointmentSource | null;
  officialRepresentativeCompanyId: string | null;
  /** BrandDocument.documentType codes already on file for this brand — used
   * to resolve each REQUIRED item's availability without asking the user to
   * re-upload anything Brand Master already has. */
  availableDocumentCodes: Set<string>;
  /** Injectable for deterministic testing; defaults to the real current time. */
  now?: Date;
};

export type VIUBrandRequirementsResult = {
  evidenceValidity: TrademarkEvidenceValidity;
  relationshipValid: boolean;
  relationshipIssue: string | null;
  requirements: VIURequirementItem[];
  readiness: BrandApplicationReadiness;
  requiredDocumentCount: number;
  availableRequiredDocumentCount: number;
  missingRequiredDocumentCount: number;
  exemptDocumentCount: number;
};

const NINE_MONTHS = 9;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * "Tanda Pendaftaran Merek" (TANDA_DAFTAR_MEREK) and "Tanda Pendaftaran Merek
 * Internasional" (SERTIFIKAT_INTERNASIONAL) may stand in for a Sertifikat
 * Merek for at most 9 months from their registration/notification date.
 * SERTIFIKAT_MEREK_TERDAFTAR (an actual issued certificate) has no such
 * limit. A missing date on an evidence type that needs one fails safe as
 * EXPIRED — a regulatory limit can't be proven from an absent date.
 */
export function computeTrademarkEvidenceValidity(
  evidenceType: MerkEvidenceType | null,
  registrationDate: string | null,
  now: Date = new Date(),
): TrademarkEvidenceValidity {
  if (!evidenceType || evidenceType === "SERTIFIKAT_MEREK_TERDAFTAR") {
    return { status: "NOT_APPLICABLE", baseDate: null, expiryDate: null, daysRemaining: null };
  }
  if (!registrationDate) {
    return { status: "EXPIRED_9_MONTH_LIMIT", baseDate: null, expiryDate: null, daysRemaining: null };
  }
  const base = new Date(registrationDate);
  const expiry = addMonths(base, NINE_MONTHS);
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / MS_PER_DAY);
  return {
    status: expiry.getTime() >= now.getTime() ? "VALID_WITHIN_9_MONTHS" : "EXPIRED_9_MONTH_LIMIT",
    baseDate: registrationDate,
    expiryDate: expiry.toISOString(),
    daysRemaining,
  };
}

/** Structural validity of this application's own applicantRole/appointmentSource
 * choice for the brand — independent of, and layered on top of, whatever the
 * brand's own Brand Master ownership record already allows (the Add Brand
 * wizard no longer even collects a Perwakilan/appointment choice at
 * registration time — see the note above validateOwnershipStep in
 * modules/merk/schema.ts). Historically, a foreign-owned brand's
 * MerkOwnership record could permit "appointed_importer" + appointmentSource
 * "brand_owner" — VIU still refuses it here, since a foreign brand owner has
 * no standing under Indonesian law to directly appoint an importer without
 * going through an Official Representative. */
function validateRelationship(input: VIUBrandRuleInput): { valid: boolean; issue: string | null } {
  if (!input.applicantRole) {
    return { valid: false, issue: "Pilih peran perusahaan pemohon terhadap merek ini." };
  }
  if (input.applicantRole === "OWNER" && input.ownerLocation !== "domestic") {
    return {
      valid: false,
      issue:
        "Pemohon hanya dapat berperan sebagai Pemilik Merek apabila pemilik merek berkedudukan di Indonesia.",
    };
  }
  if (input.applicantRole === "IMPORTER_ONLY") {
    if (!input.appointmentSource) {
      return { valid: false, issue: "Pilih sumber penunjukan importir." };
    }
    if (input.appointmentSource === "BRAND_OWNER" && input.ownerLocation !== "domestic") {
      return {
        valid: false,
        issue:
          "Penunjukan langsung dari pemilik merek hanya dapat digunakan apabila pemilik merek berkedudukan di Indonesia.",
      };
    }
    if (input.appointmentSource === "OFFICIAL_REPRESENTATIVE" && !input.officialRepresentativeCompanyId) {
      return { valid: false, issue: "Pilih Perwakilan Resmi." };
    }
  }
  return { valid: true, issue: null };
}

/** Maps this application's applicantRole/appointmentSource (plus the brand's
 * own ownerLocation) into the lowercase snake_case shape
 * `getRequiredBrandDocuments` (Add Brand wizard's own engine) expects — see
 * that function's docstring for what each combination produces. */
function toDocumentRequirementInput(input: VIUBrandRuleInput) {
  const domestic = input.ownerLocation === "domestic";

  // Pemohon VIU Konsumsi is itself the registered Brand Owner — no
  // representation/import-authorization document exists to ask for, same as
  // the "MILIK_SENDIRI" scenario Brand Master's own domestic model already
  // covers. Only valid for a domestic-owned brand (see validateRelationship)
  // — a domestic applicant can't literally be a foreign owner.
  if (input.applicantRole === "OWNER") {
    return domestic
      ? { relationshipWithApiu: "apiu_is_owner" as const }
      : { representationType: "apiu_official_representative" as const };
  }

  if (input.applicantRole === "OFFICIAL_REPRESENTATIVE") {
    return domestic
      ? { relationshipWithApiu: "apiu_is_owner" as const }
      : { representationType: "apiu_official_representative" as const };
  }

  // IMPORTER_ONLY
  if (domestic) {
    // Brand Master's own domestic model only ever sources an importer
    // appointment from the brand owner — there is no "official
    // representative" concept for a domestic owner.
    return { relationshipWithApiu: "apiu_is_importer" as const };
  }
  if (input.appointmentSource === "OFFICIAL_REPRESENTATIVE") {
    return { representationType: "other_official_representative" as const };
  }
  // appointmentSource === "BRAND_OWNER" on a foreign brand is structurally
  // invalid (see validateRelationship) — still mapped through so the
  // requirement list resolves to *something* rather than throwing; readiness
  // is forced NOT_ELIGIBLE by relationshipValid regardless.
  return { representationType: "appointed_importer" as const, appointmentSource: "brand_owner" as const };
}

const VIU_RELEVANT_CATEGORIES: BrandDocumentCategory[] = [
  "representation",
  "official_representative_legal",
  "import_authorization",
];

// These two document codes are only ever required as proof of a license/
// sublicense relationship — exactly what a still-valid registration-evidence
// exemption (Scenario A2 / "Importer via Official Representative +
// Registration Evidence") replaces. See document-requirements.ts's
// licenseRequirements().
const LICENSE_EXEMPTIBLE_CODES = new Set(["license_or_sublicense", "license_registration"]);

/**
 * The centralized rule engine — everything Step "Merek yang Digunakan" needs
 * for one selected Brand: evidence validity, relationship structural
 * validity, the resolved document checklist (REQUIRED/EXEMPT/NOT_APPLICABLE
 * + AVAILABLE/MISSING), and overall readiness. Never mixes requirement rule
 * with upload state — `requirementStatus` and `availability` are always
 * computed and reported separately.
 */
export function getVIUConsumptionBrandRequirements(
  input: VIUBrandRuleInput,
): VIUBrandRequirementsResult {
  const evidenceValidity = computeTrademarkEvidenceValidity(
    input.evidenceType,
    input.registrationDate,
    input.now,
  );
  const { valid: relationshipValid, issue: relationshipIssue } = validateRelationship(input);

  const baseRequirements = getRequiredBrandDocuments({
    evidenceType: input.evidenceType ?? undefined,
    ownerLocation: input.ownerLocation ?? undefined,
    ...toDocumentRequirementInput(input),
  });

  const requirements: VIURequirementItem[] = baseRequirements
    .filter((requirement) => VIU_RELEVANT_CATEGORIES.includes(requirement.category))
    .map((requirement) => {
      let requirementStatus: RequirementRuleStatus = requirement.required ? "REQUIRED" : "NOT_APPLICABLE";
      if (
        requirementStatus === "REQUIRED" &&
        LICENSE_EXEMPTIBLE_CODES.has(requirement.code) &&
        evidenceValidity.status === "VALID_WITHIN_9_MONTHS"
      ) {
        requirementStatus = "EXEMPT";
      }
      const availability: DocumentAvailability | null =
        requirementStatus === "REQUIRED"
          ? input.availableDocumentCodes.has(requirement.code)
            ? "AVAILABLE"
            : "MISSING"
          : null;
      return {
        code: requirement.code,
        label: requirement.label,
        category: requirement.category,
        requirementStatus,
        availability,
      };
    });

  const requiredItems = requirements.filter((r) => r.requirementStatus === "REQUIRED");
  const requiredDocumentCount = requiredItems.length;
  const availableRequiredDocumentCount = requiredItems.filter((r) => r.availability === "AVAILABLE").length;
  const missingRequiredDocumentCount = requiredDocumentCount - availableRequiredDocumentCount;
  const exemptDocumentCount = requirements.filter((r) => r.requirementStatus === "EXEMPT").length;

  let readiness: BrandApplicationReadiness;
  if (
    input.brandStatus !== "ACTIVE" ||
    evidenceValidity.status === "EXPIRED_9_MONTH_LIMIT" ||
    !relationshipValid
  ) {
    readiness = "NOT_ELIGIBLE";
  } else if (missingRequiredDocumentCount > 0) {
    readiness = "INCOMPLETE";
  } else {
    readiness = "READY";
  }

  return {
    evidenceValidity,
    relationshipValid,
    relationshipIssue,
    requirements,
    readiness,
    requiredDocumentCount,
    availableRequiredDocumentCount,
    missingRequiredDocumentCount,
    exemptDocumentCount,
  };
}
