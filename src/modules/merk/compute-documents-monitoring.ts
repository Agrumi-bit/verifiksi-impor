import { db } from "@/lib/db";
import { computeBrandCompleteness } from "./compute-brand-completeness";
import { getExpiryStatus } from "./components/management/expiry-status";
import { relationshipBucket, type OwnershipRow } from "@/app/api/merk/relationships/route";
import { MERK_AGREEMENT_TYPE_LABELS, type MerkAgreementType } from "./schema";

const STALE_DRAFT_DAYS = 30;

export type PriorityItem = {
  priority: "Kritis" | "Tinggi" | "Sedang";
  issue: string;
  brandId: string;
  brand: string;
  company: string | null;
  category: string;
  detail: string;
  deadline: string | null;
  ageDays: number;
};
const PRIORITY_RANK: Record<PriorityItem["priority"], number> = { Kritis: 0, Tinggi: 1, Sedang: 2 };

export type DocumentsMonitoringSummary = {
  kpis: {
    totalDocuments: number;
    completeDocuments: number;
    incompleteDocuments: number;
    docsExpiringSoon: number;
    docsExpired: number;
    qtProblem: number;
    qtExpiredOnly: number;
    draftStale: number;
    duplicateCount: number;
  };
  priorityQueue: PriorityItem[];
  documentHealth: { completePercent: number; incompletePercent: number };
  dataCompleteness: { informasiMerek: number; ownership: number; representation: number; documents: number; qualityTest: number };
  expiryMonitoring: { expired: number; within7: number; within30: number; within60: number; beyond60: number };
  qualityTestSummary: { valid: number; expiring: number; expired: number; incomplete: number };
  staleDrafts: { brandId: string; brandName: string; ageDays: number }[];
  duplicates: { brandIdA: string; brandA: string; companyA: string | null; brandIdB: string; brandB: string; companyB: string | null; matchedFields: string[] }[];
  brandCompleteness: {
    brandId: string; brandName: string; companyName: string | null;
    infoPercent: number; ownershipPercent: number; representationPercent: number; documentsPercent: number; qualityTestPercent: number; overallPercent: number;
  }[];
};

function agreementLabel(type: string | null): string {
  if (!type) return "Lisensi";
  return MERK_AGREEMENT_TYPE_LABELS[type.toLowerCase() as MerkAgreementType] ?? "Lisensi";
}

/**
 * The single computation behind both "Dokumen & Monitoring" and the Merek
 * Management Dashboard's operational KPIs — extracted so the two pages can
 * never quietly drift apart the way "Semua Merek"'s cards once did against
 * its table (see that fix's report). Every number is derived from real
 * rows. Two deliberate simplifications, stated rather than hidden:
 * duplicate detection is exact-normalized-name matching, not fuzzy
 * similarity; and Priority Queue items have no persisted triage status
 * (Belum Ditindaklanjuti/Dalam Tindak Lanjut/Selesai/Diabaikan) — there is
 * no database table for that yet.
 */
export async function getDocumentsMonitoringSummary(): Promise<DocumentsMonitoringSummary> {
  const now = new Date();

  const brands = await db.merk.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      brandName: true,
      status: true,
      certificateType: true,
      trademarkClass: true,
      registrationNumber: true,
      countryOfOrigin: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { companyName: true } },
      ownership: {
        select: {
          ownerLocation: true,
          ownerType: true,
          ownerName: true,
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
      documents: {
        select: { documentType: true, category: true, filePath: true, fileName: true, expiryDate: true, issueDate: true, documentNumber: true },
      },
      qualityTests: {
        select: {
          certificateNumber: true,
          laboratoryName: true,
          issueDate: true,
          expiryDate: true,
          commodityGroup: { select: { name: true } },
          commoditySubGroup: { select: { name: true } },
        },
      },
    },
  });

  const priorityQueue: PriorityItem[] = [];
  let totalRequiredDocs = 0;
  let totalCompleteDocs = 0;
  let docsExpiringSoon = 0;
  let docsExpired = 0;
  let qtProblem = 0;
  let qtExpiredOnly = 0;
  let draftStale = 0;
  const qtSummary = { valid: 0, expiring: 0, expired: 0, incomplete: 0 };
  const staleDrafts: { brandId: string; brandName: string; ageDays: number }[] = [];
  const expiry5 = { expired: 0, within7: 0, within30: 0, within60: 0, beyond60: 0 };
  const dataCompletenessSums = { info: 0, ownership: 0, representation: 0, documents: 0, qualityTest: 0, count: 0 };
  const brandCompletenessRows: DocumentsMonitoringSummary["brandCompleteness"] = [];

  function bucketExpiry(days: number) {
    if (days < 0) expiry5.expired++;
    else if (days <= 7) expiry5.within7++;
    else if (days <= 30) expiry5.within30++;
    else if (days <= 60) expiry5.within60++;
    else expiry5.beyond60++;
  }

  for (const brand of brands) {
    const ownership = brand.ownership;
    const companyName = brand.company?.companyName ?? null;

    for (const doc of brand.documents) {
      if (!doc.expiryDate) continue;
      const days = Math.round((doc.expiryDate.getTime() - now.getTime()) / 86400000);
      bucketExpiry(days);
      const status = getExpiryStatus(doc.expiryDate);
      if (status === "expired") {
        docsExpired++;
        priorityQueue.push({
          priority: "Kritis", issue: `${doc.documentType === "trademark_evidence" ? "Sertifikat Merek" : doc.fileName} Kedaluwarsa`,
          brandId: brand.id, brand: brand.brandName, company: companyName, category: "Dokumen",
          detail: doc.fileName, deadline: doc.expiryDate.toISOString(), ageDays: Math.abs(days),
        });
      } else if (status === "expiring_soon") {
        docsExpiringSoon++;
      }
    }

    if (brand.status !== "DRAFT" && brand.qualityTests.length === 0) {
      qtSummary.incomplete++;
    }
    for (const qt of brand.qualityTests) {
      if (!qt.expiryDate) { qtSummary.valid++; continue; }
      const days = Math.round((qt.expiryDate.getTime() - now.getTime()) / 86400000);
      bucketExpiry(days);
      const status = getExpiryStatus(qt.expiryDate);
      if (status === "expired") {
        qtProblem++; qtExpiredOnly++; qtSummary.expired++;
        priorityQueue.push({
          priority: "Kritis", issue: "Hasil Uji Mutu Kedaluwarsa", brandId: brand.id, brand: brand.brandName, company: companyName,
          category: "Hasil Uji Mutu", detail: `Sertifikat ${qt.certificateNumber}`, deadline: qt.expiryDate.toISOString(), ageDays: Math.abs(days),
        });
      } else if (status === "expiring_soon") {
        qtProblem++; qtSummary.expiring++;
      } else {
        qtSummary.valid++;
      }
    }

    if (brand.status === "DRAFT") {
      const age = Math.round((now.getTime() - brand.updatedAt.getTime()) / 86400000);
      if (age > STALE_DRAFT_DAYS) draftStale++;
      if (age > 7) {
        staleDrafts.push({ brandId: brand.id, brandName: brand.brandName, ageDays: age });
        priorityQueue.push({
          priority: "Sedang", issue: "Draft Tidak Diperbarui", brandId: brand.id, brand: brand.brandName, company: companyName,
          category: "Draft", detail: `${age} hari tanpa perubahan`, deadline: null, ageDays: age,
        });
      }
      continue;
    }

    if (ownership?.agreementEndDate) {
      const status = getExpiryStatus(ownership.agreementEndDate);
      if (status === "expiring_soon" || status === "expired") {
        priorityQueue.push({
          priority: "Tinggi", issue: `Perjanjian ${agreementLabel(ownership.agreementType)} Akan Berakhir`,
          brandId: brand.id, brand: brand.brandName, company: companyName, category: "Kepemilikan & Perwakilan",
          detail: `Perjanjian ${agreementLabel(ownership.agreementType)}${ownership.agreementNumber ? ` ${ownership.agreementNumber}` : ""}`,
          deadline: ownership.agreementEndDate.toISOString(),
          ageDays: Math.round((ownership.agreementEndDate.getTime() - now.getTime()) / 86400000),
        });
      }
    }
    const bucket = relationshipBucket(ownership as OwnershipRow);
    if (bucket === "importir_ditunjuk" && ownership?.appointmentEndDate) {
      const status = getExpiryStatus(ownership.appointmentEndDate);
      if (status === "expiring_soon" || status === "expired") {
        priorityQueue.push({
          priority: "Tinggi", issue: "Surat Penunjukan Importir Akan Berakhir",
          brandId: brand.id, brand: brand.brandName, company: companyName, category: "Kepemilikan & Perwakilan",
          detail: `Surat Penunjukan Importir${ownership.appointmentLetterNumber ? ` ${ownership.appointmentLetterNumber}` : ""}`,
          deadline: ownership.appointmentEndDate.toISOString(),
          ageDays: Math.round((ownership.appointmentEndDate.getTime() - now.getTime()) / 86400000),
        });
      }
    }

    const completeness = computeBrandCompleteness({ certificateType: brand.certificateType, ownership, documents: brand.documents });
    totalRequiredDocs += completeness.requiredCount;
    totalCompleteDocs += completeness.completeCount;
    if (completeness.missingCount > 0) {
      priorityQueue.push({
        priority: "Sedang", issue: "Dokumen Merek Belum Lengkap", brandId: brand.id, brand: brand.brandName, company: companyName,
        category: "Dokumen", detail: `${completeness.missingLabels[0]} belum diunggah`, deadline: null,
        ageDays: Math.round((now.getTime() - brand.updatedAt.getTime()) / 86400000),
      });
    }

    const infoChecks = [Boolean(brand.countryOfOrigin && brand.countryOfOrigin !== "Belum ditentukan"), Boolean(brand.certificateType), Boolean(brand.registrationNumber), Boolean(brand.trademarkClass)];
    const infoPercent = Math.round((infoChecks.filter(Boolean).length / infoChecks.length) * 100);

    let ownershipPercent = 0;
    if (ownership) {
      const hasOwnerIdentity = ownership.ownerLocation === "DOMESTIC" ? Boolean(ownership.ownerCompany || ownership.ownerName) : Boolean(ownership.ownerName);
      ownershipPercent = hasOwnerIdentity ? 100 : 50;
    }

    let representationPercent = 0;
    if (ownership) {
      representationPercent = ownership.ownerLocation === "DOMESTIC"
        ? (ownership.relationshipWithApiu ? 100 : 0)
        : (ownership.representationType ? 100 : 0);
    }

    const qualityTestPercent = brand.qualityTests.length === 0 ? 0 : brand.qualityTests.some((qt) => qt.expiryDate && getExpiryStatus(qt.expiryDate) !== "ok") ? 50 : 100;
    const overallPercent = Math.round((infoPercent + ownershipPercent + representationPercent + completeness.percent + qualityTestPercent) / 5);

    dataCompletenessSums.info += infoPercent;
    dataCompletenessSums.ownership += ownershipPercent;
    dataCompletenessSums.representation += representationPercent;
    dataCompletenessSums.documents += completeness.percent;
    dataCompletenessSums.qualityTest += qualityTestPercent;
    dataCompletenessSums.count++;

    brandCompletenessRows.push({
      brandId: brand.id, brandName: brand.brandName, companyName,
      infoPercent, ownershipPercent, representationPercent, documentsPercent: completeness.percent, qualityTestPercent, overallPercent,
    });
  }

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const byName = new Map<string, typeof brands>();
  for (const b of brands) {
    if (b.status === "DRAFT") continue;
    const key = normalize(b.brandName);
    byName.set(key, [...(byName.get(key) ?? []), b]);
  }
  const duplicates: DocumentsMonitoringSummary["duplicates"] = [];
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        if ((a.company?.companyName ?? null) === (b.company?.companyName ?? null) && a.company) continue;
        const matched = ["Nama Merek"];
        if (a.registrationNumber && a.registrationNumber === b.registrationNumber) matched.push("Trademark Number");
        if (a.trademarkClass && a.trademarkClass === b.trademarkClass) matched.push("Class");
        if (a.ownership && b.ownership) {
          const ownerA = a.ownership.ownerCompany?.name ?? a.ownership.ownerName;
          const ownerB = b.ownership.ownerCompany?.name ?? b.ownership.ownerName;
          if (ownerA && ownerA === ownerB) matched.push("Owner");
        }
        duplicates.push({
          brandIdA: a.id, brandA: a.brandName, companyA: a.company?.companyName ?? null,
          brandIdB: b.id, brandB: b.brandName, companyB: b.company?.companyName ?? null,
          matchedFields: matched,
        });
        priorityQueue.push({
          priority: "Sedang", issue: "Potensi Duplikasi", brandId: a.id, brand: a.brandName, company: a.company?.companyName ?? null,
          category: "Duplikasi", detail: `Nama sama dengan ${b.brandName} / ${b.company?.companyName ?? "—"}`, deadline: null, ageDays: 0,
        });
      }
    }
  }

  priorityQueue.sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || y.ageDays - x.ageDays);

  const n = dataCompletenessSums.count || 1;
  const totalDocuments = totalRequiredDocs;

  return {
    kpis: {
      totalDocuments,
      completeDocuments: totalCompleteDocs,
      incompleteDocuments: totalRequiredDocs - totalCompleteDocs,
      docsExpiringSoon,
      docsExpired,
      qtProblem,
      qtExpiredOnly,
      draftStale,
      duplicateCount: duplicates.length,
    },
    priorityQueue: priorityQueue.slice(0, 100),
    documentHealth: {
      completePercent: totalDocuments === 0 ? 0 : Math.round((totalCompleteDocs / totalDocuments) * 1000) / 10,
      incompletePercent: totalDocuments === 0 ? 0 : Math.round(((totalRequiredDocs - totalCompleteDocs) / totalDocuments) * 1000) / 10,
    },
    dataCompleteness: {
      informasiMerek: Math.round(dataCompletenessSums.info / n),
      ownership: Math.round(dataCompletenessSums.ownership / n),
      representation: Math.round(dataCompletenessSums.representation / n),
      documents: Math.round(dataCompletenessSums.documents / n),
      qualityTest: Math.round(dataCompletenessSums.qualityTest / n),
    },
    expiryMonitoring: expiry5,
    qualityTestSummary: qtSummary,
    staleDrafts: staleDrafts.sort((a, b) => b.ageDays - a.ageDays).slice(0, 5),
    duplicates,
    brandCompleteness: brandCompletenessRows,
  };
}
