import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { computeBrandCompleteness } from "@/modules/merk/compute-brand-completeness";

const APIU_PLACEHOLDER_NAME = "Perusahaan API-U (Aplikasi VIU)";

export type RelationshipBucket = "pemilik_merek" | "company_pemilik" | "apiu_perwakilan" | "perwakilan_lain" | "importir_ditunjuk";

export type OwnershipRow = {
  ownerLocation: string;
  ownerType: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  ownerCompany: { name: string } | null;
  ownerCountryCode: string | null;
  relationshipWithApiu: string | null;
  representationType: string | null;
  officialRepresentative: { name: string } | null;
  agreementType: string | null;
  agreementNumber: string | null;
  agreementStartDate: Date | null;
  agreementEndDate: Date | null;
  appointmentSource: string | null;
  appointmentLetterNumber: string | null;
  appointmentStartDate: Date | null;
  appointmentEndDate: Date | null;
} | null;

/** Classifies a raw MerkOwnership row into one of the 5 relationship
 * "shapes" for platform-wide monitoring. The Add Brand wizard no longer
 * collects relationshipWithApiu/representationType at all (Perwakilan was
 * removed as a dedicated step — see the note above validateOwnershipStep in
 * modules/merk/schema.ts), so a brand created after that change always
 * falls through to the "pemilik_merek" bucket here; only legacy rows
 * written before the change resolve to the other 4 buckets. */
export function relationshipBucket(o: OwnershipRow): RelationshipBucket {
  if (!o) return "pemilik_merek";
  if (o.ownerLocation === "DOMESTIC") {
    if (o.relationshipWithApiu === "APIU_IS_IMPORTER") return "importir_ditunjuk";
    if (o.ownerType === "COMPANY") return "company_pemilik";
    return "pemilik_merek";
  }
  if (o.representationType === "APIU_OFFICIAL_REPRESENTATIVE") return "apiu_perwakilan";
  if (o.representationType === "OTHER_OFFICIAL_REPRESENTATIVE") return "perwakilan_lain";
  if (o.representationType === "APPOINTED_IMPORTER") return "importir_ditunjuk";
  return "pemilik_merek";
}

/** Platform-wide ownership/representation relationships — a monitoring view
 * over `MerkOwnership`, not a second Company Master (owner/representative
 * names still resolve through the existing `BrandOwner` registry). Company/
 * Importer is the real applicant when it doubles as owner, otherwise the
 * VIU-Application-applicant placeholder — there is still no real applicant
 * record to reference (see the Merek Management navigation report). */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const merks = await db.merk.findMany({
    where: { ownership: { isNot: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      brandName: true,
      status: true,
      certificateType: true,
      trademarkClass: true,
      registrationNumber: true,
      company: { select: { companyName: true } },
      documents: { select: { documentType: true, filePath: true, expiryDate: true } },
      ownership: {
        select: {
          ownerLocation: true,
          ownerType: true,
          ownerName: true,
          ownerAddress: true,
          ownerCompany: { select: { name: true } },
          ownerCountryCode: true,
          relationshipWithApiu: true,
          representationType: true,
          officialRepresentative: { select: { name: true } },
          agreementType: true,
          agreementNumber: true,
          agreementStartDate: true,
          agreementEndDate: true,
          appointmentSource: true,
          appointmentLetterNumber: true,
          appointmentStartDate: true,
          appointmentEndDate: true,
        },
      },
    },
  });

  const rows = merks.map((merk) => {
    const ownership = merk.ownership;
    const isDomestic = ownership?.ownerLocation === "DOMESTIC";
    const bucket = relationshipBucket(ownership);

    const ownerName = ownership
      ? isDomestic
        ? (ownership.ownerCompany?.name ?? ownership.ownerName)
        : ownership.ownerName
      : null;

    // Company/Importer: the domestic owner itself when it's also the
    // applicant, otherwise the API-U placeholder — never a fabricated
    // separate importer record.
    const companyImporterName =
      bucket === "company_pemilik" ? ownerName : bucket === "pemilik_merek" ? null : APIU_PLACEHOLDER_NAME;

    const officialRepresentativeName =
      bucket === "apiu_perwakilan"
        ? APIU_PLACEHOLDER_NAME
        : (ownership?.officialRepresentative?.name ?? null);

    const completeness = computeBrandCompleteness({
      certificateType: merk.certificateType,
      ownership,
      documents: merk.documents,
    });

    const displayStatus: "Aktif" | "Tidak Aktif" | "Tidak Lengkap" =
      merk.status === "INACTIVE" ? "Tidak Aktif" : completeness.percent < 100 ? "Tidak Lengkap" : "Aktif";

    return {
      brandId: merk.id,
      brandName: merk.brandName,
      trademarkClass: merk.trademarkClass,
      registrationNumber: merk.registrationNumber,
      brandStatus: merk.status,
      companyName: merk.company?.companyName ?? null,
      ownerName,
      ownerEntityType: isDomestic ? (ownership?.ownerType === "COMPANY" ? "Perusahaan (PT)" : "Perorangan") : "Company",
      ownerAddress: ownership?.ownerAddress ?? null,
      ownerLocation: isDomestic ? "domestic" : "foreign",
      ownerCountry: isDomestic ? "Indonesia" : ownership?.ownerCountryCode ?? null,
      officialRepresentativeName,
      companyImporterName,
      relationshipBucket: bucket,
      agreementType: ownership?.agreementType ?? null,
      agreementNumber: ownership?.agreementNumber ?? null,
      agreementStartDate: ownership?.agreementStartDate ?? null,
      agreementEndDate: ownership?.agreementEndDate ?? null,
      appointmentLetterNumber: ownership?.appointmentLetterNumber ?? null,
      appointmentStartDate: ownership?.appointmentStartDate ?? null,
      appointmentEndDate: ownership?.appointmentEndDate ?? null,
      completenessPercent: completeness.percent,
      missingDocCount: completeness.missingCount,
      missingDocLabels: completeness.missingLabels,
      hasDocuments: merk.documents.length > 0,
      status: displayStatus,
    };
  });

  return NextResponse.json({ data: rows });
}
