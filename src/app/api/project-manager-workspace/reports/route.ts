import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { applicationMatchesViuScheme, viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";

export type PmReportItem = {
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  approvedCount: number;
  lastApprovedAt: string | null;
};

/**
 * One card per application that has at least one PM-approved item (letterStatus APPROVED, or
 * pmReviewStatus APPROVED on any sibling) — real approvals only, scoped by `?type=VKI|VIU`.
 */
export async function GET(request: Request) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "VIU" ? "VIU" : "VKI";
  const scheme = viuSchemeFromSlug(searchParams.get("scheme"));

  const allApplications = await db.application.findMany({
    where: { verificationType: type },
    include: { assignments: true, company: true },
    orderBy: { createdAt: "desc" },
  });
  const applications = scheme
    ? allApplications.filter((app) =>
        applicationMatchesViuScheme(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes, scheme),
      )
    : allApplications;

  const rows: PmReportItem[] = [];
  for (const app of applications) {
    const payload = app.payload as { companyName?: string };
    const approvedAssignments = app.assignments.filter((a) => a.letterStatus === "APPROVED" || a.pmReviewStatus === "APPROVED");
    if (approvedAssignments.length === 0) continue;
    const lastApprovedAt = approvedAssignments
      .map((a) => a.pmReviewedAt ?? a.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    rows.push({
      applicationNumber: app.applicationNumber,
      companyName: app.company?.companyName ?? payload.companyName ?? "—",
      verificationType: app.verificationType,
      approvedCount: approvedAssignments.length,
      lastApprovedAt: lastApprovedAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ data: rows });
}
