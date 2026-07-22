import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { applicationWizardSchema } from "@/modules/applications/schema";

function generateApplicationNumber(verificationType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `APP-${verificationType}-${datePart}-${suffix}`;
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
  const parsed = applicationWizardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const applicationNumber = generateApplicationNumber(values.verificationType);
  const session = await getServerSession();

  const application = await db.application.create({
    data: {
      applicationNumber,
      verificationType: values.verificationType,
      applicationCategory: values.applicationCategory,
      payload: values,
      companyId: session?.user.companyId ?? null,
    },
  });

  return NextResponse.json({
    applicationNumber: application.applicationNumber,
    id: application.id,
    createdAt: application.createdAt,
  });
}
