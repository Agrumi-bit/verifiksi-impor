import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { computeFindings, type OfficeVerificationValues } from "@/modules/surveyor-workspace/components/office-verification/schema";
import {
  buildDocumentChecklist,
  buildProductChecklist,
  documentVerificationsSchema,
  productVerificationsSchema,
} from "@/modules/verifikator-workspace/schema";

async function loadAssignment(assignmentNumber: string, verifikatorId: string) {
  const found = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true, surveyor: true, locationVisits: true },
  });
  if (!found) return null;

  // Claim-on-view: the Approval Center is a shared queue. Opening an
  // unclaimed, submitted assignment assigns it to the viewing verifikator,
  // matching the "Setiap item pada Approval Center terhubung langsung ke
  // Assignment Detail" workflow — there is no separate "Claim" step.
  if (found.verifikatorId === null && found.status === "SUBMITTED") {
    const claimed = await db.assignment.update({
      where: { id: found.id },
      data: { verifikatorId },
      include: { application: true, surveyor: true, locationVisits: true },
    });
    return claimed;
  }

  if (found.verifikatorId !== verifikatorId) return null;
  return found;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await loadAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const documentChecklist = buildDocumentChecklist(payload);
  const productChecklist = buildProductChecklist(payload);
  const documentVerifications = documentVerificationsSchema.parse(assignment.documentVerifications ?? {});
  const productVerifications = productVerificationsSchema.parse(assignment.productVerifications ?? {});

  const documentsVerified = documentChecklist.filter(
    (item) => documentVerifications[item.key]?.status && documentVerifications[item.key]?.status !== "PENDING",
  ).length;
  const productsVerified = productChecklist.filter(
    (item) => productVerifications[item.id]?.status && productVerifications[item.id]?.status !== "PENDING",
  ).length;

  let totalFindings = 0;
  for (const visit of assignment.locationVisits) {
    if (visit.officeVerification) {
      totalFindings += computeFindings(visit.officeVerification as OfficeVerificationValues).length;
    } else if (Array.isArray(visit.findings)) {
      totalFindings += visit.findings.length;
    }
  }

  const completedVisits = assignment.locationVisits.filter((v) => v.status === "COMPLETED");
  const surveyCompletionDate = completedVisits.length
    ? completedVisits.reduce<Date | null>((latest, v) => {
        if (!v.submittedAt) return latest;
        return !latest || v.submittedAt > latest ? v.submittedAt : latest;
      }, null)
    : null;

  const surveyProgress = assignment.locationVisits.length
    ? completedVisits.length / assignment.locationVisits.length
    : 0;

  let overallProgress: number;
  let currentStage: string;
  if (assignment.status === "COMPLETED") {
    overallProgress = 100;
    currentStage = "Selesai — Disetujui";
  } else if (assignment.status === "RETURNED") {
    overallProgress = 100;
    currentStage = "Dikembalikan untuk Revisi";
  } else if (assignment.status === "SUBMITTED") {
    const reviewTotal = documentChecklist.length + productChecklist.length;
    const reviewDone = documentsVerified + productsVerified;
    const reviewFraction = reviewTotal > 0 ? reviewDone / reviewTotal : 0;
    overallProgress = Math.round(70 + reviewFraction * 30);
    currentStage = "Menunggu Validasi Verifikator";
  } else {
    overallProgress = Math.round(surveyProgress * 70);
    currentStage = "Survey Lapangan Berlangsung";
  }

  const timeline: { label: string; date: string; description?: string }[] = [
    { label: "Assignment Dibuat", date: assignment.createdAt.toISOString() },
  ];
  if (assignment.scheduledDate) {
    timeline.push({ label: "Survey Dijadwalkan", date: assignment.scheduledDate.toISOString() });
  }
  for (const visit of completedVisits) {
    if (visit.submittedAt) {
      timeline.push({
        label: `Survey Lokasi Selesai — ${visit.locationType}`,
        date: visit.submittedAt.toISOString(),
        description: visit.address,
      });
    }
  }
  if (assignment.validatedAt) {
    timeline.push({
      label: assignment.status === "COMPLETED" ? "Disetujui Verifikator" : "Dikembalikan Verifikator",
      date: assignment.validatedAt.toISOString(),
      description: assignment.validationNotes ?? undefined,
    });
  }
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const kantorLocation = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];

  return NextResponse.json({
    data: {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      status: assignment.status,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
      dueDate: assignment.dueDate,
      validationNotes: assignment.validationNotes,
      validatedAt: assignment.validatedAt,
      application: {
        applicationNumber: assignment.application.applicationNumber,
        verificationType: assignment.application.verificationType,
        applicationCategory: assignment.application.applicationCategory,
        payload,
      },
      company: {
        companyName: payload.companyName,
        nibNumber: payload.nibNumber,
        businessAddress: kantorLocation
          ? `${kantorLocation.address}, ${kantorLocation.city}, ${kantorLocation.province}`
          : null,
        kbliEntries: payload.kbliEntries ?? [],
        locations: payload.locations ?? [],
      },
      verificationProgram: {
        type: assignment.application.verificationType,
        importTypes: payload.importTypes ?? [],
        products: productChecklist,
      },
      surveyInformation: {
        surveyorName: assignment.surveyor.name,
        scheduledDate: assignment.scheduledDate,
        completionDate: surveyCompletionDate,
        locationVisits: assignment.locationVisits.map((v) => ({
          id: v.id,
          locationType: v.locationType,
          address: v.address,
          city: v.city,
          status: v.status,
          submittedAt: v.submittedAt,
        })),
      },
      progress: {
        overallProgress,
        currentStage,
        timeline,
      },
      quickStats: {
        totalDocuments: documentChecklist.length,
        documentsVerified,
        totalProducts: productChecklist.length,
        productsVerified,
        totalFindings,
        pendingReview: documentChecklist.length + productChecklist.length - documentsVerified - productsVerified,
      },
    },
  });
}
