import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { APPROVAL_CATEGORY_META, type ApprovalCategory, type PmDashboardStats } from "@/modules/project-manager-workspace/status";

export type PmApprovalItem = {
  id: string;
  assignmentNumber: string;
  category: ApprovalCategory;
  title: string;
  company: string;
  jenis: string;
  refId: string;
  meta: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  preparedBy: string;
  date: string | null;
};

/**
 * Every real "pending PM review" item across the whole system — PM oversees everything, not
 * scoped to a single user's own assignments like every other workspace's dashboard. Readiness is
 * computed here, never stored (see prisma/schema.prisma comment on Assignment.pmReviewStatus):
 * Surat Tugas = letterStatus PENDING; Laporan Survey = every locationVisit COMPLETED; Laporan
 * Verifikasi/Teknis = assignment.status COMPLETED. Already-decided items (pmReviewStatus /
 * letterStatus APPROVED) are included too so Approved/Rejected/Total stat cards are real counts,
 * not just the open queue.
 */
export async function GET() {
  const { session, error } = await requireProjectManagerSession();
  if (error) return error;

  const assignments = await db.assignment.findMany({
    include: {
      application: { select: { applicationNumber: true, verificationType: true, payload: true } },
      surveyor: { select: { name: true } },
      verifikator: { select: { name: true } },
      technicalReviewer: { select: { name: true } },
      locationVisits: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items: PmApprovalItem[] = [];

  for (const a of assignments) {
    const payload = a.application.payload as { companyName?: string } | null;
    const company = payload?.companyName ?? "—";
    const jenis = a.application.verificationType;

    if (a.letterStatus === "PENDING" || a.letterStatus === "APPROVED") {
      items.push({
        id: a.id,
        assignmentNumber: a.assignmentNumber,
        category: "suratTugas",
        title: `Surat Tugas ${a.scheduleType ?? ""}`.trim(),
        company,
        jenis,
        refId: a.letterNumber ?? a.assignmentNumber,
        meta: `Personel: ${a.surveyor?.name ?? a.verifikator?.name ?? a.technicalReviewer?.name ?? "—"}`,
        status: a.letterStatus === "APPROVED" ? "APPROVED" : "PENDING",
        preparedBy: "Customer Relation",
        date: a.updatedAt.toISOString(),
      });
    }

    if (a.scheduleType === "survey") {
      const locationsReady = a.locationVisits.length > 0 && a.locationVisits.every((v) => v.status === "COMPLETED");
      if (locationsReady || a.pmReviewStatus) {
        items.push({
          id: a.id,
          assignmentNumber: a.assignmentNumber,
          category: "laporanSurvey",
          title: "Laporan Hasil Survey Lapangan",
          company,
          jenis,
          refId: a.assignmentNumber,
          meta: `Surveyor: ${a.surveyor?.name ?? "—"}`,
          status: a.pmReviewStatus ?? "PENDING",
          preparedBy: a.surveyor?.name ?? "—",
          date: (a.validatedAt ?? a.updatedAt).toISOString(),
        });
      }
    }

    if (a.scheduleType === "dokumen" && (a.status === "COMPLETED" || a.pmReviewStatus)) {
      items.push({
        id: a.id,
        assignmentNumber: a.assignmentNumber,
        category: "laporanVerifikasi",
        title: "Laporan Verifikasi Dokumen",
        company,
        jenis,
        refId: a.assignmentNumber,
        meta: `Verifikator: ${a.verifikator?.name ?? "—"}`,
        status: a.pmReviewStatus ?? "PENDING",
        preparedBy: a.verifikator?.name ?? "—",
        date: (a.validatedAt ?? a.updatedAt).toISOString(),
      });
    }

    if (a.scheduleType === "technical" && (a.status === "COMPLETED" || a.pmReviewStatus)) {
      items.push({
        id: a.id,
        assignmentNumber: a.assignmentNumber,
        category: "laporanTeknis",
        title: "Laporan Analisis Teknis",
        company,
        jenis,
        refId: a.assignmentNumber,
        meta: `Analis: ${a.technicalReviewer?.name ?? "—"}`,
        status: a.pmReviewStatus ?? "PENDING",
        preparedBy: a.technicalReviewer?.name ?? "—",
        date: (a.validatedAt ?? a.updatedAt).toISOString(),
      });
    }
  }

  const stats: PmDashboardStats = {
    pendingVki: items.filter((i) => i.jenis === "VKI" && i.status === "PENDING").length,
    pendingViu: items.filter((i) => i.jenis === "VIU" && i.status === "PENDING").length,
    approved: items.filter((i) => i.status === "APPROVED").length,
    rejected: items.filter((i) => i.status === "REJECTED").length,
    total: items.length,
  };

  const recentActivity = items
    .filter((i) => i.status !== "PENDING")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 8);

  return NextResponse.json({
    data: {
      stats,
      items,
      recentActivity,
      categoryMeta: APPROVAL_CATEGORY_META,
      user: { name: session.user.name, role: session.user.role },
    },
  });
}
