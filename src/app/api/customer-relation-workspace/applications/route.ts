import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist } from "@/modules/verifikator-workspace/schema";

export async function GET() {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const applications = await db.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignments: { select: { id: true } } },
  });

  const data = applications.map((application) => {
    const payload = application.payload as ApplicationWizardValues;
    const checklist = buildDocumentChecklist(payload);
    const docsTotal = checklist.length;
    const docsLengkap = checklist.filter((d) => d.documentPath).length;
    const complete = docsTotal > 0 && docsLengkap === docsTotal;
    const hasSchedules = application.assignments.length > 0;
    const outcome = application.crOutcome || "Diproses";

    let queueStatus: "Menunggu Review" | "Dokumen Kurang" | "Siap Ditugaskan" | "Ditugaskan";
    if (hasSchedules) queueStatus = "Ditugaskan";
    else if (outcome !== "Diproses") queueStatus = "Siap Ditugaskan";
    else if (!complete) queueStatus = "Dokumen Kurang";
    else queueStatus = "Menunggu Review";

    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      company: payload.companyName || "—",
      jenis: application.verificationType,
      category: application.applicationCategory,
      submitted: application.createdAt.toISOString(),
      picName: payload.contactFullName || "",
      picPhone: payload.contactPhone || "",
      picEmail: payload.contactEmail || "",
      docsLengkap,
      docsTotal,
      complete,
      status: queueStatus,
      outcome,
      crFollowUpDate: application.crFollowUpDate?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ data });
}
