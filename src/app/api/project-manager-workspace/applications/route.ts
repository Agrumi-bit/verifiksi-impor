import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { computeApplicationStage, type SiblingForStage } from "@/modules/project-manager-workspace/stage";
import { collectApplicationVisits, groupVisitsByLocation, assignmentLocations, locationKey, type SurveyPayloadLocation } from "@/modules/shared/survey-visit-scope";
import { compareBySubmissionDate, effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { applicationMatchesViuScheme, viuSchemeFromSlug } from "@/modules/project-manager-workspace/viu-schemes";

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
  // ?scheme=industri|non-industri|konsumsi narrows VIU to one import type (a PM VIU sub menu).
  const scheme = viuSchemeFromSlug(searchParams.get("scheme"));

  const allApplications = await db.application.findMany({
    where: { verificationType: type },
    include: {
      company: true,
      assignments: {
        include: {
          surveyor: { select: { name: true } },
          verifikator: { select: { name: true } },
          technicalReviewer: { select: { name: true } },
          locationVisits: { select: { id: true, status: true, locationType: true, address: true, companyLocationId: true, submittedAt: true, updatedAt: true, reportVerification: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const applications = scheme
    ? allApplications.filter((app) =>
        applicationMatchesViuScheme(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes, scheme),
      )
    : allApplications;

  applications.sort((a, b) => compareBySubmissionDate(b, a));

  const rows: PmApplicationRow[] = applications.map((app) => {
    const payload = app.payload as { companyName?: string; locations?: (SurveyPayloadLocation & { city: string })[] };
    const dokumen = app.assignments.find((a) => a.scheduleType === "dokumen") ?? null;
    const survey = app.assignments.find((a) => a.scheduleType === "survey") ?? null;
    const technical = app.assignments.find((a) => a.scheduleType === "technical") ?? null;

    const { groups } = groupVisitsByLocation(collectApplicationVisits(app.assignments), payload.locations ?? []);
    const siblings: SiblingForStage[] = app.assignments.map((a) => ({
      scheduleType: a.scheduleType,
      status: a.status,
      dueDate: a.dueDate?.toISOString() ?? null,
      // One status per location this assignment is responsible for (NOT_STARTED when it has no
      // visit yet), taken from the application location's single active visit.
      locationVisits: assignmentLocations(a, payload.locations ?? []).map((loc) => ({
        status: groups.find((group) => group.key === locationKey(loc))?.active?.status ?? "NOT_STARTED",
      })),
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
      submitted: effectiveSubmissionDate(app).value,
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
