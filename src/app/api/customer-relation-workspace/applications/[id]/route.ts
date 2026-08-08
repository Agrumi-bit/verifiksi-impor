import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import { getDocumentMeta } from "@/modules/company/document-versions";
import { buildDocumentChecklist, COMPANY_MAPPED_DOCUMENT_KEYS, toChecklistStatus } from "@/modules/verifikator-workspace/schema";
import {
  crDocumentRequestsSchema,
  editApplicationFieldsSchema,
} from "@/modules/customer-relation-workspace/schema";
import { CR_OUTCOMES, SCHEDULE_TYPE_DEFS, type ScheduleType } from "@/modules/customer-relation-workspace/status";

async function loadApplication(id: string) {
  return db.application.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { surveyor: true, verifikator: true, technicalReviewer: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function scheduleTypeOf(assignment: { surveyorId: string | null; verifikatorId: string | null; technicalReviewerId: string | null; scheduleType: string | null }): ScheduleType {
  if (assignment.scheduleType) return assignment.scheduleType as ScheduleType;
  if (assignment.verifikatorId) return "dokumen";
  if (assignment.technicalReviewerId) return "technical";
  return "survey";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id } = await params;
  const application = await loadApplication(id);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const payload = application.payload as ApplicationWizardValues;
  const checklist = buildDocumentChecklist(payload);
  const requests = crDocumentRequestsSchema.parse(application.crDocumentVerifications ?? {});
  const docsTotal = checklist.length;
  const docsLengkap = checklist.filter((d) => d.documentPath).length;

  const company = application.companyId ? await db.company.findUnique({ where: { id: application.companyId } }) : null;
  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyMeta = company
    ? await getDocumentMeta(company.id, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt)
    : {};
  const appMeta = await getApplicationDocumentMeta(application.id, appOnlyKeys, application.createdAt);

  const documents = checklist.map((item) => {
    const meta = item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appMeta[item.key];
    const lengkap = Boolean(item.documentPath);
    return {
      key: item.key,
      label: item.label,
      category: item.category,
      documentPath: item.documentPath,
      lengkap,
      status: meta ? toChecklistStatus(meta.verificationStatus) : "PENDING",
      rejectionNote: meta?.rejectionNote ?? "",
      requestNote: requests[item.key]?.requestNote ?? "",
    };
  });

  const schedules = application.assignments.map((assignment) => {
    const scheduleType = scheduleTypeOf(assignment);
    const person = assignment.surveyor ?? assignment.verifikator ?? assignment.technicalReviewer;
    return {
      id: assignment.id,
      scheduleType,
      typeLabel: SCHEDULE_TYPE_DEFS[scheduleType].label,
      facility: assignment.location,
      date: assignment.scheduledDate?.toISOString() ?? null,
      person: person?.name ?? "—",
      status: assignment.status,
      letterNumber: assignment.letterNumber,
      letterStatus: assignment.letterStatus,
    };
  });

  const stageDone = (type: ScheduleType) =>
    application.assignments.some((a) => scheduleTypeOf(a) === type && a.status === "COMPLETED");
  const stageActive = (type: ScheduleType) => application.assignments.some((a) => scheduleTypeOf(a) === type);

  const workflowStages = [
    { key: "survey", label: "Survey", done: stageDone("survey"), active: stageActive("survey") },
    { key: "dokumen", label: "Verifikasi Dokumen", done: stageDone("dokumen"), active: stageActive("dokumen") },
    { key: "technical", label: "Technical", done: stageDone("technical"), active: stageActive("technical") },
    { key: "approval", label: "Approval", done: application.crOutcome === "Disetujui", active: application.crOutcome === "Menunggu Approval" },
  ];

  return NextResponse.json({
    data: {
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
      complete: docsTotal > 0 && docsLengkap === docsTotal,
      crOutcome: application.crOutcome || "Diproses",
      crFollowUpDate: application.crFollowUpDate?.toISOString() ?? null,
      crNotes: application.crNotes || "",
      documents,
      schedules,
      workflowStages,
    },
  });
}

const patchSchema = z.object({
  crOutcome: z.enum(CR_OUTCOMES).optional(),
  crFollowUpDate: z.string().trim().optional().nullable(),
  edit: editApplicationFieldsSchema.optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const application = await db.application.update({
    where: { id },
    data: {
      crOutcome: values.crOutcome,
      crFollowUpDate:
        values.crFollowUpDate === undefined
          ? undefined
          : values.crFollowUpDate
            ? new Date(values.crFollowUpDate)
            : null,
      crNotes: values.edit?.notes,
    },
    select: { id: true, crOutcome: true, crFollowUpDate: true, crNotes: true },
  });

  return NextResponse.json({ data: application });
}
