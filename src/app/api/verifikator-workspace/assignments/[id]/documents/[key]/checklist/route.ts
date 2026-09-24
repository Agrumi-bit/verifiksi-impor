import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { patchApplicationDocumentChecklistItem, type ChecklistItemResult } from "@/modules/applications/document-versions";
import { patchDocumentChecklistItem } from "@/modules/company/document-versions";
import { buildDocumentChecklist, COMPANY_MAPPED_DOCUMENT_KEYS } from "@/modules/verifikator-workspace/schema";
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

const patchSchema = z.object({
  itemId: z.string().min(1),
  result: z.enum(["PASS", "FAIL", "NA"]).optional(),
  note: z.string().trim().nullable().optional(),
  criteriaChecked: z.array(z.boolean()).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, key } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Dokumen hanya dapat diverifikasi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const { itemId, result, note, criteriaChecked } = parsed.data;

  // Only include keys actually sent — the store merges this onto whatever
  // was already saved for the item, so an omitted key must stay untouched
  // (an explicit `undefined` here would instead blank it out).
  const itemPatch: Partial<ChecklistItemResult> = {};
  if (result !== undefined) itemPatch.result = result;
  if (note !== undefined) itemPatch.note = note;
  if (criteriaChecked !== undefined) itemPatch.criteriaChecked = criteriaChecked;

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const item = buildDocumentChecklist(payload, toChecklistCompanyContext(company)).find((c) => c.key === key);
  if (!item) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }
  if (!item.documentPath) {
    return NextResponse.json({ error: "Dokumen belum diunggah oleh perusahaan" }, { status: 400 });
  }

  if (key in COMPANY_MAPPED_DOCUMENT_KEYS) {
    if (!company) {
      return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
    }
    const fieldKey = COMPANY_MAPPED_DOCUMENT_KEYS[key];
    const checklistResult = await patchDocumentChecklistItem(
      company.id,
      fieldKey,
      company[fieldKey] ?? item.documentPath,
      company.createdAt,
      itemId,
      itemPatch,
    );
    return NextResponse.json({ data: checklistResult });
  }

  const checklistResult = await patchApplicationDocumentChecklistItem(
    assignment.application.id,
    item.key,
    item.documentPath,
    assignment.application.createdAt,
    itemId,
    itemPatch,
  );
  return NextResponse.json({ data: checklistResult });
}
