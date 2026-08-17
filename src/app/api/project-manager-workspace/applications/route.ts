import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { computeApplicationStage, type SiblingForStage } from "@/modules/project-manager-workspace/stage";

export type PmApplicationRow = {
  applicationNumber: string;
  company: string;
  location: string;
  nib: string;
  kbliCode: string;
  kbliName: string;
  stage: string;
  status: string;
  surveyor: string;
  verifikator: string;
  technicalAnalis: string;
  slaLabel: string;
  slaDetail: string;
  slaColor: string;
  submitted: string;
};

/**
 * Every VKI or VIU application, joined to its real sibling assignments — no ownership scoping,
 * PM oversees everything. `stage`/`status`/SLA come from `computeApplicationStage` (real
 * timestamps/statuses, never fabricated placeholders like the design mock's static rows).
 */
export async function GET(request: Request) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "VIU" ? "VIU" : "VKI";

  const applications = await db.application.findMany({
    where: { verificationType: type },
    include: {
      company: true,
      assignments: {
        include: {
          surveyor: { select: { name: true } },
          verifikator: { select: { name: true } },
          technicalReviewer: { select: { name: true } },
          locationVisits: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: PmApplicationRow[] = applications.map((app) => {
    const payload = app.payload as { companyName?: string; locations?: { locationType: string; address: string; city: string }[] };
    const dokumen = app.assignments.find((a) => a.scheduleType === "dokumen") ?? null;
    const survey = app.assignments.find((a) => a.scheduleType === "survey") ?? null;
    const technical = app.assignments.find((a) => a.scheduleType === "technical") ?? null;

    const siblings: SiblingForStage[] = app.assignments.map((a) => ({
      scheduleType: a.scheduleType,
      status: a.status,
      dueDate: a.dueDate?.toISOString() ?? null,
      locationVisits: a.locationVisits.map((v) => ({ status: v.status })),
    }));
    const { stage, status, slaLabel, slaDetail, slaColor } = computeApplicationStage(siblings);

    const kantor = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];
    const kbli = Array.isArray(app.company?.kbliEntries) ? (app.company.kbliEntries as { code?: string; description?: string }[])[0] : null;

    return {
      applicationNumber: app.applicationNumber,
      company: app.company?.companyName ?? payload.companyName ?? "—",
      location: kantor ? `${kantor.address}, ${kantor.city}` : "—",
      nib: app.company?.nibNumber ?? "—",
      kbliCode: kbli?.code ?? "—",
      kbliName: kbli?.description ?? "—",
      stage,
      status,
      surveyor: survey?.surveyor?.name ?? "",
      verifikator: dokumen?.verifikator?.name ?? "",
      technicalAnalis: technical?.technicalReviewer?.name ?? "",
      slaLabel,
      slaDetail,
      slaColor,
      submitted: app.createdAt.toISOString(),
    };
  });

  const kpis = {
    total: rows.length,
    submitted: rows.filter((r) => r.status === "Submitted").length,
    inProgress: rows.filter((r) => r.status === "In Progress").length,
    revisionRequired: rows.filter((r) => r.status === "Revision Required").length,
    overdue: rows.filter((r) => r.status === "Overdue").length,
    completed: rows.filter((r) => r.status === "Completed").length,
  };

  return NextResponse.json({ data: { rows, kpis } });
}
