import "server-only";

import { db } from "@/lib/db";
import { notifyRoles, notifyUsers } from "./notify";

/*
 * The events of the first stage — assignments & Surat Tugas, reports & the PM's review — and who hears
 * of them: the person assigned (surveyor, verifikator, technical analyst) for their own work, and every
 * active user of a role for work waiting on that role (PM for a pending letter or report, CR for a
 * rejected letter). Each opens the assignment or application it is about.
 */

type AssignmentRef = {
  id: string;
  assignmentNumber: string;
  applicationId: string;
  scheduleType: string | null;
  letterNumber?: string | null;
  surveyorId: string | null;
  verifikatorId: string | null;
  technicalReviewerId: string | null;
};

type ApplicationRef = { id: string; applicationNumber: string; verificationType: string; companyName: string };

const KIND_LABELS: Record<string, string> = { survey: "Survey Lokasi", dokumen: "Verifikasi Dokumen", technical: "Analisis Teknis" };
const REPORT_LABELS: Record<string, string> = { survey: "Laporan Survey", dokumen: "Laporan Verifikasi Dokumen", technical: "Laporan Analisis Teknis" };

/** The person an assignment is for, by its kind. */
function assigneeOf(assignment: AssignmentRef): string | null {
  if (assignment.scheduleType === "survey") return assignment.surveyorId;
  if (assignment.scheduleType === "technical") return assignment.technicalReviewerId;
  return assignment.verifikatorId;
}

/** The assignee's own page for the assignment. */
function assigneeHref(assignment: AssignmentRef): string {
  const workspace = assignment.scheduleType === "survey" ? "surveyor-workspace" : assignment.scheduleType === "technical" ? "technical-analyst-workspace" : "verifikator-workspace";
  return `/${workspace}/assignments/${assignment.assignmentNumber}`;
}

const pmHref = (application: ApplicationRef) => `/project-manager-workspace/applications/${application.verificationType.toLowerCase()}/${application.applicationNumber}`;
const crHref = (application: ApplicationRef) => `/customer-relation-workspace/applications/${application.id}`;

async function contextOf(assignmentId: string): Promise<{ assignment: AssignmentRef; application: ApplicationRef } | null> {
  const row = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      assignmentNumber: true,
      applicationId: true,
      scheduleType: true,
      letterNumber: true,
      surveyorId: true,
      verifikatorId: true,
      technicalReviewerId: true,
      application: { select: { id: true, applicationNumber: true, verificationType: true, payload: true, company: { select: { companyName: true } } } },
    },
  });
  if (!row) return null;
  const payload = row.application.payload as { companyName?: string } | null;
  return {
    assignment: row,
    application: {
      id: row.application.id,
      applicationNumber: row.application.applicationNumber,
      verificationType: row.application.verificationType,
      companyName: row.application.company?.companyName ?? payload?.companyName ?? "—",
    },
  };
}

const kindOf = (assignment: AssignmentRef) => KIND_LABELS[assignment.scheduleType ?? ""] ?? "Penugasan";
const reportOf = (assignment: AssignmentRef) => REPORT_LABELS[assignment.scheduleType ?? ""] ?? "Laporan";
const subject = (application: ApplicationRef) => `${application.companyName} · ${application.applicationNumber}`;

/** Customer Relation scheduled an assignment: its assignee hears of it (the letter still awaits the PM). */
export async function notifyAssignmentScheduled(assignmentId: string, actorId?: string | null) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  await notifyUsers([assigneeOf(assignment)], {
    kind: "ASSIGNMENT_SCHEDULED",
    title: `Penugasan ${kindOf(assignment)} baru`,
    body: `${subject(application)} — ${assignment.assignmentNumber}. Surat Tugas menunggu persetujuan Project Manager.`,
    href: assigneeHref(assignment),
    applicationId: application.id,
  }, { exclude: actorId });
}

/** Customer Relation submitted a Surat Tugas: every Project Manager is asked to approve it. */
export async function notifyLetterSubmitted(assignmentId: string, actorId?: string | null) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  await notifyRoles(["PROJECT_MANAGER"], {
    kind: "LETTER_SUBMITTED",
    title: `Surat Tugas ${assignment.letterNumber ?? assignment.assignmentNumber} menunggu persetujuan`,
    body: `${kindOf(assignment)} — ${subject(application)}.`,
    href: pmHref(application),
    applicationId: application.id,
  }, { exclude: actorId });
}

/** The PM decided on a Surat Tugas: approved — the assignee may start, and CR knows; rejected — back to CR. */
export async function notifyLetterDecided(assignmentId: string, approved: boolean, note: string | null | undefined, actorId?: string | null) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  const letter = assignment.letterNumber ?? assignment.assignmentNumber;
  if (approved) {
    await notifyUsers([assigneeOf(assignment)], {
      kind: "LETTER_APPROVED",
      title: `Surat Tugas ${letter} disetujui — penugasan dapat dimulai`,
      body: `${kindOf(assignment)} — ${subject(application)}.`,
      href: assigneeHref(assignment),
      applicationId: application.id,
    }, { exclude: actorId });
  }
  await notifyRoles(["CUSTOMER_RELATIONSHIP"], {
    kind: approved ? "LETTER_APPROVED" : "LETTER_REJECTED",
    title: approved ? `Surat Tugas ${letter} disetujui Project Manager` : `Surat Tugas ${letter} ditolak Project Manager`,
    body: approved ? `${kindOf(assignment)} — ${subject(application)}.` : `${subject(application)}. Catatan: ${note?.trim() || "—"}`,
    href: crHref(application),
    applicationId: application.id,
  }, { exclude: actorId });
}

/** A report reached the PM for review (surveyor's location report, verifikator's or analyst's submitted report). */
export async function notifyReportSubmitted(assignmentId: string, detail: string | null, actorId?: string | null) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  await notifyRoles(["PROJECT_MANAGER"], {
    kind: "REPORT_SUBMITTED",
    title: `${reportOf(assignment)} menunggu review`,
    body: `${detail ? `${detail} — ` : ""}${subject(application)} (${assignment.assignmentNumber}).`,
    href: pmHref(application),
    applicationId: application.id,
  }, { exclude: actorId });
}

const DECISION_TITLES: Record<string, string> = {
  APPROVED: "disetujui Project Manager",
  REJECTED: "ditolak Project Manager",
  REVISION: "dikembalikan untuk revisi",
  REREVIEW: "akan direview ulang Project Manager",
};

/** The PM decided on a report (Approve/Tolak/Revisi/Review Ulang): its author hears of it. */
export async function notifyReportDecided(assignmentId: string, decision: string, note: string | null | undefined, actorId?: string | null) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  await notifyUsers([assigneeOf(assignment)], {
    kind: `REPORT_${decision}`,
    title: `${reportOf(assignment)} ${DECISION_TITLES[decision] ?? decision}`,
    body: `${subject(application)} (${assignment.assignmentNumber}).${note?.trim() ? ` Catatan: ${note.trim()}` : ""}`,
    href: assigneeHref(assignment),
    applicationId: application.id,
  }, { exclude: actorId });
}

/** A newer version of a report cleared the PM's earlier decision: the PM is asked to review it again. */
export async function notifyReviewReset(assignmentId: string, reason: string) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  await notifyRoles(["PROJECT_MANAGER"], {
    kind: "REVIEW_RESET",
    title: `${reportOf(assignment)} perlu direview ulang`,
    body: reason,
    href: pmHref(application),
    applicationId: application.id,
  });
}

/** A report was sent back to its author by someone other than the PM (verifikator on a survey report, analyst on the document report). */
export async function notifyReportReturned(assignmentId: string, by: string, note: string | null | undefined, actorId?: string | null) {
  const ctx = await contextOf(assignmentId);
  if (!ctx) return;
  const { assignment, application } = ctx;
  await notifyUsers([assigneeOf(assignment)], {
    kind: "REPORT_RETURNED",
    title: `${reportOf(assignment)} dikembalikan oleh ${by}`,
    body: `${subject(application)} (${assignment.assignmentNumber}).${note?.trim() ? ` Catatan: ${note.trim()}` : ""}`,
    href: assigneeHref(assignment),
    applicationId: application.id,
  }, { exclude: actorId });
}
