import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { composeLocationAddress, type LocationValues } from "@/modules/shared/schema";
import { getDocumentMeta, type DocumentMetaEntry } from "@/modules/company/document-versions";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";

async function loadScopedLocation(assignmentNumber: string, locationId: string, surveyorId: string) {
  const visit = await db.locationVisit.findUnique({
    where: { id: locationId },
    include: { assignment: { include: { application: true, surveyor: true } } },
  });
  if (
    !visit ||
    visit.assignment.assignmentNumber !== assignmentNumber ||
    visit.assignment.surveyorId !== surveyorId
  ) {
    return null;
  }
  return visit;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await loadScopedLocation(id, locationId, surveyorId);
  if (!visit) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const application = visit.assignment.application;
  const payload = application.payload as ApplicationWizardValues;
  // Prefer the live Company row over the frozen application payload — same staleness fix already
  // applied to verifikator/CR's document checklists this session: a company can edit/re-upload
  // legal docs and location documents via Company Workspace's profile editor after submission, and
  // a surveyor visiting on-site afterward should see the current document, not what was on file at
  // submission time.
  const company = application.companyId ? await db.company.findUnique({ where: { id: application.companyId } }) : null;
  const payloadLocationSnapshot = (payload.locations ?? []).find(
    (loc) => loc.locationType === visit.locationType && composeLocationAddress(loc) === visit.address,
  );
  const liveLocations = (company?.locations as LocationValues[] | null) ?? null;
  const liveLocation = liveLocations?.find((loc) => loc.id === payloadLocationSnapshot?.id) ?? null;
  const payloadLocation = liveLocation ?? payloadLocationSnapshot;

  // Document Information (version/uploader/upload date) for the same 3 "Dokumen yang diperiksa"
  // rows Section1Documents shows — reuses the exact tracking verifikator's own checklist reads:
  // nib/akta are company-mapped (CompanyDocumentVersion), the location ownership/lease doc is
  // application-only (ApplicationDocumentVersion), keyed the same way buildDocumentChecklist does.
  const isSewa = payloadLocation?.buildingStatus === "SEWA";
  const ownershipDocs = (isSewa ? payloadLocation?.leaseDocuments : payloadLocation?.ownershipDocuments) ?? [];
  const kepemilikanVersionKey =
    payloadLocation && ownershipDocs.length > 0
      ? `location:${payloadLocation.id}:${isSewa ? "lease" : "ownership"}:${ownershipDocs[0].type}`
      : null;

  const companyMetaKeys: ("nibDocumentPath" | "notarialDocumentPath")[] = [];
  if (company?.nibDocumentPath) companyMetaKeys.push("nibDocumentPath");
  if (company?.notarialDocumentPath) companyMetaKeys.push("notarialDocumentPath");
  const companyMeta = company && companyMetaKeys.length ? await getDocumentMeta(company.id, companyMetaKeys, company.createdAt) : {};
  const appMeta = kepemilikanVersionKey
    ? await getApplicationDocumentMeta(application.id, [kepemilikanVersionKey], application.createdAt)
    : {};

  const documentMeta: Record<string, DocumentMetaEntry | null> = {
    nib: companyMeta.nibDocumentPath ?? null,
    akta: companyMeta.notarialDocumentPath ?? null,
    kepemilikan: kepemilikanVersionKey ? (appMeta[kepemilikanVersionKey] ?? null) : null,
  };

  return NextResponse.json({
    data: {
      ...visit,
      checklist: visit.checklist ?? [],
      photos: visit.photos ?? [],
      interviews: visit.interviews ?? [],
      findings: visit.findings ?? [],
      officeVerification: visit.officeVerification ?? null,
      warehouseVerification: visit.warehouseVerification ?? null,
      factoryVerification: visit.factoryVerification ?? null,
      assignmentNumber: visit.assignment.assignmentNumber,
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      surveyorName: visit.assignment.surveyor?.name ?? null,
      // CR's actual assigned date, regardless of Surat Tugas letterStatus (DRAFT/PENDING/APPROVED)
      // — Section 0's "Tanggal Ditugaskan" pre-fills from this so it never drifts from what CR set.
      scheduledDate: visit.assignment.scheduledDate,
      documentMeta,
      company: {
        companyName: payload.companyName ?? "—",
        nibNumber: company?.nibNumber || payload.nibNumber || null,
        nibDocumentPath: company?.nibDocumentPath || payload.nibDocumentPath || null,
        notarialDeedNumber: company?.notarialDeedNumber || payload.notarialDeedNumber || null,
        notarialDocumentPath: company?.notarialDocumentPath || payload.notarialDocumentPath || null,
        kbliEntries: payload.kbliEntries ?? [],
        kbliDocumentPath: company?.kbliDocumentPath || payload.kbliDocumentPath || null,
      },
      payloadLocation: payloadLocation ?? null,
    },
  });
}

const patchSchema = z.object({
  action: z.enum(["start", "revise"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await loadScopedLocation(id, locationId, surveyorId);
  if (!visit) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  if (parsed.data.action === "start" && visit.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Verifikasi lokasi ini sudah selesai." },
      { status: 400 },
    );
  }
  if (parsed.data.action === "revise" && visit.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Hanya lokasi yang sudah selesai yang dapat direvisi." },
      { status: 400 },
    );
  }

  // Reopening a revision clears the verifikator's prior decision (keeping their per-item notes
  // as reference) so the "needs revision" badge doesn't keep showing once the surveyor resubmits.
  const priorReportVerification = visit.reportVerification as { items?: unknown; decision?: string | null } | null;
  const clearedReportVerification =
    parsed.data.action === "revise" && priorReportVerification
      ? { items: priorReportVerification.items ?? {}, decision: null, decisionNote: null, verifiedByName: null, verifiedAt: null }
      : undefined;

  const updated = await db.locationVisit.update({
    where: { id: locationId },
    data: {
      status: "IN_PROGRESS",
      ...(clearedReportVerification ? { reportVerification: clearedReportVerification } : {}),
    },
  });

  await db.assignment.update({
    where: { id: visit.assignmentId },
    data: { status: "IN_PROGRESS" },
  });

  return NextResponse.json({ data: updated });
}
