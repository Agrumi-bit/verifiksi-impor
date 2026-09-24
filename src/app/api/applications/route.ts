import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { applicationWizardSchema, type LocationValues } from "@/modules/applications/schema";

function generateApplicationNumber(verificationType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `APP-${verificationType}-${datePart}-${suffix}`;
}

const locationKey = (loc: LocationValues) => `${loc.locationType}::${loc.address}`;

/**
 * A wizard applicant can add a new facility (e.g. Pabrik) directly in the
 * application's Location step without ever visiting Company Profile — that
 * facility only lives in Application.payload.locations until we mirror it
 * back here. Existing facilities are left untouched; only genuinely new
 * ones (by locationType+address) get appended.
 */
async function syncNewFacilitiesToCompany(companyId: string, submittedLocations: LocationValues[]): Promise<void> {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { locations: true } });
  if (!company) return;

  const existingLocations = (company.locations as LocationValues[] | null) ?? [];
  const existingKeys = new Set(existingLocations.map(locationKey));
  const newLocations = submittedLocations.filter((loc) => !existingKeys.has(locationKey(loc)));
  if (newLocations.length === 0) return;

  await db.company.update({
    where: { id: companyId },
    data: { locations: [...existingLocations, ...newLocations] },
  });
}

export async function GET() {
  const applications = await db.application.findMany({
    orderBy: { createdAt: "desc" },
  });

  const data = applications.map((application) => {
    const payload = application.payload as { companyName?: string } | null;
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      applicationCategory: application.applicationCategory,
      companyName: payload?.companyName ?? "—",
      status: application.status,
      createdAt: application.createdAt,
    };
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { draftApplicationId, ...wizardBody } = body ?? {};
  const parsed = applicationWizardSchema.safeParse(wizardBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;

  // Promote the draft row saved during the wizard instead of creating a
  // second, orphaned Application — same applicationNumber carries over.
  if (typeof draftApplicationId === "string") {
    const existing = await db.application.findUnique({ where: { id: draftApplicationId } });
    if (existing && existing.status === "DRAFT" && existing.companyId === values.companyId) {
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
          text: `Permohonan ${promoted.applicationNumber} berhasil diajukan.`,
        },
      });
      if (values.companyId) {
        await syncNewFacilitiesToCompany(values.companyId, values.locations);
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
  if (values.companyId) {
    await syncNewFacilitiesToCompany(values.companyId, values.locations);
  }

  return NextResponse.json({
    applicationNumber: application.applicationNumber,
    id: application.id,
    createdAt: application.createdAt,
  });
}
