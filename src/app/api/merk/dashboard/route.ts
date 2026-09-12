import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { getDocumentsMonitoringSummary } from "@/modules/merk/compute-documents-monitoring";

const EXPIRY_WINDOW_DAYS = 30;

/** Platform-level Brand Management overview — Admin Dashboard KPIs. The
 * completeness/expiry/duplicate/draft numbers come from the exact same
 * `getDocumentsMonitoringSummary()` "Dokumen & Monitoring" uses, so the two
 * pages can never quietly disagree (see the "Semua Merek" cards-vs-table
 * sync fix for why that matters). Status counts and the two alert lists
 * below are this page's own — cheap, targeted queries with nothing else to
 * drift against. No VIU Application metrics (that linkage doesn't exist
 * yet). */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const now = new Date();
  const expiryHorizon = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const expiryWhere = { expiryDate: { gte: now, lte: expiryHorizon } };

  const [summary, totalMerek, aktif, draft, inactive, documentsExpiringSoon, qualityTestsExpiringSoon, recentBrands, recentUpdates] =
    await Promise.all([
      getDocumentsMonitoringSummary(),
      db.merk.count(),
      db.merk.count({ where: { status: "ACTIVE" } }),
      db.merk.count({ where: { status: "DRAFT" } }),
      db.merk.count({ where: { status: "INACTIVE" } }),
      db.brandDocument.findMany({
        where: expiryWhere,
        orderBy: { expiryDate: "asc" },
        take: 5,
        include: { merk: { select: { id: true, brandName: true } } },
      }),
      db.brandQualityTest.findMany({
        where: expiryWhere,
        orderBy: { expiryDate: "asc" },
        take: 5,
        include: { merk: { select: { id: true, brandName: true } } },
      }),
      db.merk.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, brandName: true, status: true, createdAt: true, company: { select: { companyName: true } } },
      }),
      db.merk.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, brandName: true, status: true, updatedAt: true, company: { select: { companyName: true } } },
      }),
    ]);

  return NextResponse.json({
    data: {
      kpis: {
        totalMerek,
        merekAktif: aktif,
        draft,
        merekTidakAktif: inactive,
        dokumenTidakLengkap: summary.kpis.incompleteDocuments,
        dokumenAkanKedaluwarsa: summary.kpis.docsExpiringSoon,
        dokumenKedaluwarsa: summary.kpis.docsExpired,
        hasilUjiMutuBermasalah: summary.kpis.qtProblem,
        draftLama: summary.kpis.draftStale,
        potensiDuplikasi: summary.kpis.duplicateCount,
      },
      recentBrands,
      recentUpdates,
      documentAlerts: documentsExpiringSoon.map((doc) => ({
        id: doc.id,
        brandId: doc.merk.id,
        brandName: doc.merk.brandName,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate,
      })),
      qualityTestAlerts: qualityTestsExpiringSoon.map((qt) => ({
        id: qt.id,
        brandId: qt.merk.id,
        brandName: qt.merk.brandName,
        certificateNumber: qt.certificateNumber,
        expiryDate: qt.expiryDate,
      })),
    },
  });
}
