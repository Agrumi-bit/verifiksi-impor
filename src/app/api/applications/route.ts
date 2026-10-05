import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { ADMIN_ROLES, requireAdminSession } from "@/lib/require-admin-session";
import { type ApplicationWizardValues } from "@/modules/applications/schema";
import { reopenReturnedAssignments } from "@/modules/applications/server/reopen-assignments";
import { prepareApplicationSubmission, runApplicationSubmissionSyncs } from "@/modules/applications/server/submission";

function generateApplicationNumber(verificationType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `APP-${verificationType}-${datePart}-${suffix}`;
}

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const applications = await db.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignments: { select: { status: true } } },
  });

  const data = applications.map((application) => {
    const payload = application.payload as { companyName?: string; importTypes?: string[] } | null;
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      applicationCategory: application.applicationCategory,
      companyName: payload?.companyName ?? "—",
      status: application.status,
      createdAt: application.createdAt,
      importTypes: payload?.importTypes ?? [],
      assignmentStatuses: application.assignments.map((a) => a.status),
    };
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  // Submitted from the admin wizard (any company) and from Company Workspace (a PERUSAHAAN
  // account, only ever for its own company) — nobody else, and never anonymously.
  const session = await getServerSession();
  const role = session?.user.role ?? "";
  const isAdmin = ADMIN_ROLES.includes(role);
  if (!session?.user || (!isAdmin && role !== "PERUSAHAAN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { draftApplicationId, ...wizardBody } = body ?? {};
  const prepared = await prepareApplicationSubmission(wizardBody, (values) =>
    !isAdmin && (!session.user.companyId || values.companyId !== session.user.companyId)
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : null,
  );
  if (!prepared.ok) return prepared.response;
  const values: ApplicationWizardValues = prepared.values;

  // Promote the draft row saved during the wizard instead of creating a
  // second, orphaned Application — same applicationNumber carries over.
  if (typeof draftApplicationId === "string") {
    const existing = await db.application.findUnique({ where: { id: draftApplicationId } });
    const isEditable = existing?.status === "DRAFT" || existing?.status === "RETURNED";
    if (existing && isEditable && existing.companyId === values.companyId) {
      const wasRevision = existing.status === "RETURNED";
      const promoted = await db.application.update({
        where: { id: draftApplicationId },
        data: {
          verificationType: values.verificationType,
          applicationCategory: values.applicationCategory,
          payload: values,
          status: "SUBMITTED",
        },
      });
      await db.applicationMessage.create({
        data: {
          applicationId: promoted.id,
          direction: "SYSTEM",
          text: wasRevision
            ? `Revisi permohonan ${promoted.applicationNumber} berhasil dikirim ulang.`
            : `Permohonan ${promoted.applicationNumber} berhasil diajukan.`,
        },
      });
      // "Every non-draft update of the application" — a RETURNED application resubmitted
      // through this same promote-draft path counts, since its status becomes SUBMITTED here.
      await runApplicationSubmissionSyncs(promoted.id, values);
      if (wasRevision) {
        // RETURNED → SUBMITTED: reopen the Verifikator/TA assignments that sent it back
        // ("Revisi ke-N") and record the resubmission in the application's history.
        const receivedAt = new Date();
        const reopened = await reopenReturnedAssignments(promoted.id, receivedAt);
        const receivedLabel = receivedAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
        await db.applicationAuditLog.create({
          data: {
            applicationId: promoted.id,
            action: "RESUBMIT",
            actorId: session.user.id,
            actorName: session.user.name,
            actorRole: session.user.role ?? null,
            reason: `Revisi diterima ${receivedLabel}${reopened > 0 ? ` — ${reopened} penugasan dibuka kembali` : ""}`,
            createdAt: receivedAt,
          },
        });
      }
      return NextResponse.json({
        applicationNumber: promoted.applicationNumber,
        id: promoted.id,
        createdAt: promoted.createdAt,
      });
    }
  }

  const applicationNumber = generateApplicationNumber(values.verificationType);

  const application = await db.application.create({
    data: {
      applicationNumber,
      verificationType: values.verificationType,
      applicationCategory: values.applicationCategory,
      payload: values,
      companyId: values.companyId,
    },
  });
  await db.applicationMessage.create({
    data: {
      applicationId: application.id,
      direction: "SYSTEM",
      text: `Permohonan ${application.applicationNumber} berhasil diajukan.`,
    },
  });
  await runApplicationSubmissionSyncs(application.id, values);

  return NextResponse.json({
    applicationNumber: application.applicationNumber,
    id: application.id,
    createdAt: application.createdAt,
  });
}
