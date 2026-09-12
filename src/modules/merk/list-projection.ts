import { computeBrandCompleteness } from "./compute-brand-completeness";
import { getExpiryStatus } from "./components/management/expiry-status";

const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

type MerkListRow = {
  id: string;
  brandName: string;
  productCategory: string;
  countryOfOrigin: string;
  registrationNumber: string | null;
  trademarkClass: string | null;
  certificateType: string | null;
  ownershipType: string;
  brandOwnerName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  company: { companyName: string } | null;
  ownership: {
    ownerLocation: string;
    ownerName: string | null;
    ownerCompany: { name: string } | null;
    relationshipWithApiu: string | null;
    representationType: string | null;
    appointmentSource: string | null;
    agreementType: string | null;
  } | null;
  documents: { documentType: string; filePath: string; expiryDate: Date | null }[];
  qualityTests: { expiryDate: Date | null }[];
};

/** Shared "Semua Merek" / "Daftar Merek" row shape — adds Pemilik Merek,
 * Perusahaan, Kelengkapan, and the expiry/quality-test flags "Semua Merek"'s
 * advanced filters need, without changing any existing field the table
 * already relied on. Used by both `/api/merk` and
 * `/api/company-workspace/brands` GET so the two lists never compute
 * completeness (or expiry status) differently. */
export function toMerkListItem(merk: MerkListRow) {
  const ownership = merk.ownership;
  const ownerTitle = ownership
    ? ownership.ownerLocation === "DOMESTIC"
      ? (ownership.ownerCompany?.name ?? ownership.ownerName ?? APIU_PLACEHOLDER_NAME)
      : ownership.ownerName
    : null;
  const completeness = computeBrandCompleteness({
    certificateType: merk.certificateType,
    ownership,
    documents: merk.documents,
  });

  const docStatuses = merk.documents.map((d) => getExpiryStatus(d.expiryDate));
  const docExpired = docStatuses.includes("expired");
  const docExpiring = docStatuses.includes("expiring_soon");

  const qtStatuses = merk.qualityTests.map((q) => getExpiryStatus(q.expiryDate));
  const qtStatus: "lengkap" | "belum_ada" | "akan_kedaluwarsa" =
    merk.qualityTests.length === 0
      ? "belum_ada"
      : qtStatuses.some((s) => s === "expired" || s === "expiring_soon")
        ? "akan_kedaluwarsa"
        : "lengkap";

  return {
    id: merk.id,
    brandName: merk.brandName,
    productCategory: merk.productCategory,
    countryOfOrigin: merk.countryOfOrigin,
    registrationNumber: merk.registrationNumber,
    trademarkClass: merk.trademarkClass,
    // Same casing as MERK_EVIDENCE_TYPES ("SERTIFIKAT_MEREK_TERDAFTAR" etc.) —
    // no transform needed, see schema.ts.
    evidenceType: merk.certificateType,
    ownershipType: merk.ownershipType,
    // Legacy scalar — still the field Step 1/4's duplicate-check UI reads
    // (`ExistingBrandMatch.brandOwnerName`); kept alongside the richer
    // `ownerTitle` above rather than migrating every existing caller.
    brandOwnerName: merk.brandOwnerName,
    status: merk.status,
    createdAt: merk.createdAt,
    updatedAt: merk.updatedAt,
    companyName: merk.company?.companyName ?? null,
    ownerTitle,
    completenessPercent: completeness.percent,
    docExpired,
    docExpiring,
    qtStatus,
  };
}

/** Prisma `select`/`include` shape `toMerkListItem` needs — reused by both
 * list routes so they never drift out of sync with the projection above. */
export const MERK_LIST_INCLUDE = {
  company: { select: { companyName: true } },
  ownership: {
    select: {
      ownerLocation: true,
      ownerName: true,
      ownerCompany: { select: { name: true } },
      relationshipWithApiu: true,
      representationType: true,
      appointmentSource: true,
      agreementType: true,
    },
  },
  documents: { select: { documentType: true, filePath: true, expiryDate: true } },
  qualityTests: { select: { expiryDate: true } },
} as const;
