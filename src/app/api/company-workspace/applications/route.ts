import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationStatusValue } from "@/modules/company-workspace/status";
import { APPLICATION_STATUSES } from "@/modules/company-workspace/status";
import { computeDisplayStatus } from "@/modules/company-workspace/workflow-stage";

export async function GET(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;

  if (!companyId) {
    return NextResponse.json({ data: [], total: 0, page: 1, pageSize: 10 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const statusParam = searchParams.get("status");
  const status =
    statusParam && APPLICATION_STATUSES.includes(statusParam as ApplicationStatusValue)
      ? (statusParam as ApplicationStatusValue)
      : null;
  const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

  const applications = await db.application.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
    },
    include: {
      assignments: {
        select: { scheduleType: true, status: true, verifikatorId: true, technicalReviewerId: true },
      },
    },
    orderBy: { createdAt: sort },
  });

  const filtered = q
    ? applications.filter((application) => {
        const payload = application.payload as { companyName?: string } | null;
        return (
          application.applicationNumber.toLowerCase().includes(q) ||
          application.verificationType.toLowerCase().includes(q) ||
          (payload?.companyName ?? "").toLowerCase().includes(q)
        );
      })
    : applications;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const data = paged.map((application) => {
    const payload = application.payload as { companyName?: string } | null;
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      verificationType: application.verificationType,
      applicationCategory: application.applicationCategory,
      companyName: payload?.companyName ?? "—",
      status: application.status,
      displayStatus: computeDisplayStatus(application, application.assignments),
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  });

  return NextResponse.json({ data, total, page, pageSize });
}

function generateApplicationNumber(verificationType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `APP-${verificationType}-${datePart}-${suffix}`;
}

const draftSchema = z.object({
  applicationId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

/**
 * "Save as Draft" from the wizard. Unlike full submit, the payload is
 * intentionally unvalidated — a draft can be missing any amount of data.
 * Upserts a single Application row per draft session (`applicationId` once
 * assigned) so re-saving updates in place instead of piling up duplicates.
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Akun Anda belum terhubung dengan perusahaan manapun." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data draft tidak valid" }, { status: 400 });
  }
  const { applicationId, payload } = parsed.data;

  const verificationType = typeof payload.verificationType === "string" ? payload.verificationType : "VKI";
  const applicationCategory = typeof payload.applicationCategory === "string" ? payload.applicationCategory : "";

  if (applicationId) {
    const existing = await db.application.findUnique({ where: { id: applicationId } });
    const isEditable = existing?.status === "DRAFT" || existing?.status === "RETURNED";
    if (existing && existing.companyId === companyId && isEditable) {
      const updated = await db.application.update({
        where: { id: applicationId },
        data: { verificationType, applicationCategory, payload: payload as object },
      });
      return NextResponse.json({ id: updated.id, applicationNumber: updated.applicationNumber });
    }
  }

  const created = await db.application.create({
    data: {
      applicationNumber: generateApplicationNumber(verificationType),
      verificationType,
      applicationCategory,
      payload: payload as object,
      companyId,
      status: "DRAFT",
    },
  });
  return NextResponse.json({ id: created.id, applicationNumber: created.applicationNumber });
}
