import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireComplianceSession } from "@/lib/require-compliance-session";
import { FINDING_KINDS, FINDING_SEVERITIES, nextIssueNumber } from "@/modules/compliance-workspace/finding-rules";
import { REQUIREMENTS } from "@/modules/compliance-workspace/requirements";
import { loadCompliancePics } from "@/modules/compliance-workspace/server/load-cases";
import { complianceUserName, isKonsumsiCase, loadFindings } from "@/modules/compliance-workspace/server/findings";
import { WORKSPACE_KEYS } from "@/modules/compliance-workspace/workspace-status";

/** Temuan & Exception list — every finding with its case, plus counts per tab and the possible owners. */
export async function GET() {
  const { error } = await requireComplianceSession();
  if (error) return error;

  const [findings, pics] = await Promise.all([loadFindings(), loadCompliancePics()]);
  const counts = Object.fromEntries(FINDING_KINDS.map((kind) => [kind, findings.filter((finding) => finding.kind === kind).length]));
  return NextResponse.json({ data: { findings, counts, pics } });
}

const createSchema = z.object({
  applicationId: z.string().min(1, "Pilih permohonan."),
  requirementKey: z.enum(REQUIREMENTS.map((requirement) => requirement.key) as [string, ...string[]], { message: "Pilih requirement." }),
  kind: z.enum(["OPEN", "KLARIFIKASI", "CONFLICT"], { message: "Pilih jenis temuan." }),
  severity: z.enum(FINDING_SEVERITIES as [string, ...string[]], { message: "Pilih severity." }),
  sourceWorkspace: z.enum(WORKSPACE_KEYS, { message: "Pilih workspace sumber." }),
  title: z.string().trim().min(10, "Judul temuan minimal 10 karakter.").max(300),
  evidenceA: z.string().trim().max(500).optional(),
  evidenceB: z.string().trim().max(500).optional(),
  ownerId: z.string().min(1).nullable().optional(),
});

/** Catat Temuan — a finding recorded manually by Compliance on a VIU Konsumsi case. */
export async function POST(request: Request) {
  const { session, error } = await requireComplianceSession();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const input = parsed.data;

  if (!(await isKonsumsiCase(input.applicationId))) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan atau bukan VIU Barang Konsumsi." }, { status: 400 });
  }
  const ownerName = input.ownerId ? await complianceUserName(input.ownerId) : null;
  if (input.ownerId && !ownerName) return NextResponse.json({ error: "Owner harus user Compliance yang aktif." }, { status: 400 });

  // The unique issueNumber guards against two findings created at the same moment; retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await db.complianceIssue.findMany({ select: { issueNumber: true } });
    const issueNumber = nextIssueNumber(existing.map((row) => row.issueNumber));
    try {
      const created = await db.$transaction(async (tx) => {
        const finding = await tx.complianceIssue.create({
          data: {
            issueNumber,
            applicationId: input.applicationId,
            requirementKey: input.requirementKey,
            kind: input.kind,
            severity: input.severity as "RENDAH" | "SEDANG" | "TINGGI",
            sourceWorkspace: input.sourceWorkspace,
            title: input.title,
            evidenceA: input.evidenceA || null,
            evidenceB: input.evidenceB || null,
            ownerId: input.ownerId ?? null,
            createdByName: session.user.name,
          },
        });
        await tx.complianceIssueFollowUp.create({
          data: { issueId: finding.id, status: input.kind, note: "Temuan dicatat.", actorId: session.user.id, actorName: session.user.name },
        });
        await tx.applicationAuditLog.create({
          data: {
            applicationId: input.applicationId,
            action: "COMPLIANCE_FINDING_CREATE",
            actorId: session.user.id,
            actorName: session.user.name,
            actorRole: session.user.role ?? null,
            reason: `${issueNumber}: ${input.title}`,
          },
        });
        return finding;
      });
      return NextResponse.json({ data: { id: created.id, issueNumber } }, { status: 201 });
    } catch (cause) {
      const isDuplicate = (cause as { code?: string }).code === "P2002";
      if (!isDuplicate || attempt === 1) throw cause;
    }
  }
  return NextResponse.json({ error: "Gagal mencatat temuan." }, { status: 500 });
}
