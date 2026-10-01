import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

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
 * Admin-workspace counterpart to /api/company-workspace/applications' own
 * draft POST — same unvalidated-payload upsert pattern, so "Save as Draft"
 * from /applications/new creates a real Application(DRAFT) row that shows up
 * in Application Management's list. (The older /api/applications/drafts
 * singleton only ever persisted a per-admin resume payload, never a real
 * Application row, which is why saved drafts never appeared in the list.)
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data draft tidak valid" }, { status: 400 });
  }
  const { applicationId, payload } = parsed.data;

  const verificationType = typeof payload.verificationType === "string" ? payload.verificationType : "VKI";
  const applicationCategory = typeof payload.applicationCategory === "string" ? payload.applicationCategory : "";
  const companyId = typeof payload.companyId === "string" && payload.companyId ? payload.companyId : null;

  if (applicationId) {
    const existing = await db.application.findUnique({ where: { id: applicationId } });
    const isEditable = existing?.status === "DRAFT" || existing?.status === "RETURNED";
    if (existing && isEditable) {
      const updated = await db.application.update({
        where: { id: applicationId },
        data: { verificationType, applicationCategory, companyId, payload: payload as object },
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
