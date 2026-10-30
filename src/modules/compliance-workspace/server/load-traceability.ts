import "server-only";

import { db } from "@/lib/db";
import { applicationMatchesViuScheme } from "@/modules/project-manager-workspace/viu-schemes";
import { actionLabel, historyRows, sortTrail, trailSourceOf, type HistoryRow, type TrailEvent } from "../traceability";
import { KONSUMSI_SCHEME } from "./load-cases";

/** Without a case filter the trail shows the latest events only. */
export const TRAIL_LIMIT = 300;

const SCHEDULE_LABELS: Record<string, string> = { survey: "survey", dokumen: "verifikasi dokumen", technical: "analisis teknis" };
const SCHEDULE_SOURCE = { survey: "SV", dokumen: "VF", technical: "TA" } as const;
const PM_REVIEW_LABELS: Record<string, string> = { PENDING: "menunggu review", APPROVED: "disetujui", REJECTED: "ditolak" };

async function konsumsiApplicationIds(applicationId?: string): Promise<Map<string, string>> {
  const applications = await db.application.findMany({
    where: { verificationType: "VIU", status: { notIn: ["DRAFT", "WITHDRAWN"] }, ...(applicationId ? { id: applicationId } : {}) },
    select: { id: true, applicationNumber: true, verificationType: true, payload: true },
  });
  return new Map(
    applications
      .filter((app) => applicationMatchesViuScheme(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes, KONSUMSI_SCHEME))
      .map((app) => [app.id, app.applicationNumber]),
  );
}

/** The cross-workspace timeline: submission, scheduling, decisions, PM reviews, survey submissions and every audit-log entry. */
export async function loadTrail(applicationId?: string): Promise<TrailEvent[]> {
  const numbers = await konsumsiApplicationIds(applicationId);
  const ids = [...numbers.keys()];
  if (ids.length === 0) return [];

  const applications = await db.application.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      submissionDate: true,
      createdAt: true,
      assignments: {
        select: {
          id: true,
          assignmentNumber: true,
          scheduleType: true,
          status: true,
          createdAt: true,
          validatedAt: true,
          pmReviewStatus: true,
          pmReviewedAt: true,
          pmReviewedByName: true,
          surveyor: { select: { name: true } },
          verifikator: { select: { name: true } },
          technicalReviewer: { select: { name: true } },
          locationVisits: { select: { id: true, locationType: true, submittedAt: true } },
        },
      },
    },
  });
  const logs = await db.applicationAuditLog.findMany({
    where: { applicationId: { in: ids } },
    select: { id: true, applicationId: true, action: true, actorName: true, actorRole: true, reason: true, createdAt: true },
  });

  const events: TrailEvent[] = [];
  for (const app of applications) {
    const number = numbers.get(app.id)!;
    const base = { applicationId: app.id, applicationNumber: number };
    events.push({ ...base, id: `${app.id}-submitted`, at: (app.submissionDate ?? app.createdAt).toISOString(), source: "COMPANY", text: "Permohonan diajukan", by: null });
    for (const a of app.assignments) {
      const type = a.scheduleType ?? "";
      const label = SCHEDULE_LABELS[type] ?? type;
      events.push({ ...base, id: `${a.id}-scheduled`, at: a.createdAt.toISOString(), source: "CR", text: `Penugasan ${label} dibuat (${a.assignmentNumber})`, by: null });
      if (a.validatedAt && (type === "dokumen" || type === "technical")) {
        events.push({
          ...base,
          id: `${a.id}-decided`,
          at: a.validatedAt.toISOString(),
          source: SCHEDULE_SOURCE[type],
          text: `Keputusan ${label} dicatat (${a.status})`,
          by: (type === "dokumen" ? a.verifikator?.name : a.technicalReviewer?.name) ?? null,
        });
      }
      for (const visit of a.locationVisits) {
        if (!visit.submittedAt) continue;
        events.push({ ...base, id: `${visit.id}-submitted`, at: visit.submittedAt.toISOString(), source: "SV", text: `Hasil survey lokasi ${visit.locationType} dikirim`, by: a.surveyor?.name ?? null });
      }
      if (a.pmReviewedAt && a.pmReviewStatus) {
        events.push({
          ...base,
          id: `${a.id}-pm`,
          at: a.pmReviewedAt.toISOString(),
          source: "PM",
          text: `Laporan ${label} ${PM_REVIEW_LABELS[a.pmReviewStatus] ?? a.pmReviewStatus}`,
          by: a.pmReviewedByName,
        });
      }
    }
  }
  for (const log of logs) {
    events.push({
      id: log.id,
      at: log.createdAt.toISOString(),
      applicationId: log.applicationId,
      applicationNumber: numbers.get(log.applicationId)!,
      source: trailSourceOf(log.action, log.actorRole),
      text: log.reason ? `${actionLabel(log.action)} — ${log.reason}` : actionLabel(log.action),
      by: log.actorName,
    });
  }
  const sorted = sortTrail(events);
  return applicationId ? sorted : sorted.slice(0, TRAIL_LIMIT);
}

/** Field-level changes recorded in the audit log (Compliance's own changes and Admin edits). */
export async function loadHistory(applicationId?: string): Promise<HistoryRow[]> {
  const numbers = await konsumsiApplicationIds(applicationId);
  const ids = [...numbers.keys()];
  if (ids.length === 0) return [];
  const logs = await db.applicationAuditLog.findMany({
    where: { applicationId: { in: ids } },
    select: { id: true, applicationId: true, action: true, actorName: true, actorRole: true, changedFields: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return historyRows(
    logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString(), applicationNumber: numbers.get(log.applicationId)! })),
  );
}
