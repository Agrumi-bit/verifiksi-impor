import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

const LOCATION_TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };

/**
 * Statuses at which a "dokumen" Assignment's report is worth showing to the company — SUBMITTED
 * onward, once the verifikator actually has data to review. Before that (ASSIGNED/SCHEDULED/
 * IN_PROGRESS) there's nothing yet to show. COMPLETED/RETURNED both render with the report's own
 * "Final" treatment; SUBMITTED renders as "Draf (belum disubmit)" — company can watch it update
 * live as the verifikator works, not just see the finished artifact.
 */
const DOKUMEN_REPORT_VISIBLE_STATUSES = new Set(["SUBMITTED", "RETURNED", "COMPLETED"]);

/**
 * Aggregates every report the company can view across all its applications: one entry per
 * completed survey LocationVisit (real per-location survey report), and one entry per "dokumen"
 * Assignment that has reached SUBMITTED or later (verifikator's document verification report,
 * draft or final). Both already have real, working detail pages — this just indexes them for a
 * single Reports list.
 */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  const assignments = await db.assignment.findMany({
    where: { application: { companyId } },
    include: {
      application: { select: { applicationNumber: true, verificationType: true } },
      locationVisits: true,
    },
    orderBy: { createdAt: "desc" },
  });

  type ReportEntry = {
    id: string;
    type: "survey" | "dokumen";
    title: string;
    applicationNumber: string;
    verificationType: string;
    meta: string;
    date: string | null;
    href: string;
  };

  const reports: ReportEntry[] = [];

  for (const assignment of assignments) {
    const scheduleType = assignment.scheduleType ?? (assignment.verifikatorId ? "dokumen" : "survey");

    if (scheduleType === "dokumen" && DOKUMEN_REPORT_VISIBLE_STATUSES.has(assignment.status)) {
      const isFinal = assignment.status === "COMPLETED" || assignment.status === "RETURNED";
      reports.push({
        id: `dokumen:${assignment.id}`,
        type: "dokumen",
        title: isFinal ? "Laporan Verifikasi Dokumen" : "Laporan Verifikasi Dokumen (Draf)",
        applicationNumber: assignment.application.applicationNumber,
        verificationType: assignment.application.verificationType,
        meta: assignment.application.applicationNumber,
        date: (assignment.validatedAt ?? assignment.updatedAt).toISOString(),
        href: `/company-workspace/assignments/${assignment.assignmentNumber}/document-report`,
      });
    }

    for (const visit of assignment.locationVisits) {
      if (visit.status !== "COMPLETED") continue;
      reports.push({
        id: `survey:${visit.id}`,
        type: "survey",
        title: "Laporan Survey Lokasi",
        applicationNumber: assignment.application.applicationNumber,
        verificationType: assignment.application.verificationType,
        meta: `${LOCATION_TYPE_LABEL[visit.locationType] ?? visit.locationType} · ${assignment.application.applicationNumber}`,
        date: (visit.submittedAt ?? visit.updatedAt).toISOString(),
        href: `/company-workspace/assignments/${assignment.assignmentNumber}/report/${visit.id}`,
      });
    }
  }

  reports.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return NextResponse.json({ data: reports });
}
