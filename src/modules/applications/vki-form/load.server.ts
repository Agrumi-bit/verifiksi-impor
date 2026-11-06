import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { lhviuIsIssued } from "@/modules/project-manager-workspace/lhviu-completion";
import { buildVkiForm, type VkiForm } from "./model";

/** Internal roles that may open any application's Formulir Permohonan (a PERUSAHAAN account: only its own). */
const INTERNAL_ROLES = ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "CUSTOMER_RELATIONSHIP", "VERIFIKATOR", "TECHNICAL_ANALYST", "COMPLIANCE"];
const LEMBAGA = "PT Tribhakti Inspektama";

/**
 * Loads the Formulir Permohonan VKI of one application, by id or application number, after the
 * access check. Returns a ready NextResponse on refusal / not found.
 */
export async function loadVkiForm(ref: string): Promise<{ form: VkiForm; error: null } | { form: null; error: NextResponse }> {
  const session = await getServerSession();
  const user = session?.user;
  const role = user?.role ?? "";
  if (!user || (!INTERNAL_ROLES.includes(role) && role !== "PERUSAHAAN")) {
    return { form: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const application = await db.application.findFirst({
    where: { OR: [{ id: ref }, { applicationNumber: ref }] },
    select: { id: true, applicationNumber: true, verificationType: true, payload: true, companyId: true, submissionDate: true, createdAt: true },
  });
  if (!application) return { form: null, error: NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 }) };
  if (role === "PERUSAHAAN" && (!user.companyId || user.companyId !== application.companyId)) {
    return { form: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (application.verificationType !== "VKI") {
    return { form: null, error: NextResponse.json({ error: "Formulir Permohonan hanya untuk permohonan VKI" }, { status: 400 }) };
  }

  const lhvki = await loadPreviousLhvki(application.id, application.companyId);

  const form = buildVkiForm({
    payload: application.payload as unknown as ApplicationWizardValues,
    applicationNumber: application.applicationNumber,
    submissionDate: effectiveSubmissionDate(application).value,
    lhvki,
  });
  return { form, error: null };
}

/** LHVKI already issued to the same company on its other VKI applications (oldest first). */
export async function loadPreviousLhvki(applicationId: string, companyId: string | null): Promise<{ number: string; issuedAt: string; issuer: string }[]> {
  if (!companyId) return [];
  const others = await db.application.findMany({
    where: { companyId, verificationType: "VKI", id: { not: applicationId } },
    select: { lhviuDocument: true },
  });
  return others
    .map((o) => o.lhviuDocument as { number?: string; issuedAt?: string } | null)
    .filter((d): d is { number: string; issuedAt: string } => lhviuIsIssued(d))
    .map((d) => ({ number: d.number.trim(), issuedAt: d.issuedAt, issuer: LEMBAGA }))
    .sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
}
