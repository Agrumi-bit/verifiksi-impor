import "server-only";

import { db } from "@/lib/db";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { lhviuIsIssued } from "@/modules/project-manager-workspace/lhviu-completion";
import { buildCaseRow, type CaseRow, type CaseSource } from "../case-list";
import { schemeOfApplication, type ComplianceScheme } from "../scheme";
import { withoutTechnical } from "../workspace-status";

/** VIU Konsumsi has no Technical Analyst step — Prisma `where` for its assignments (NULL = legacy row, kept). */
export const NOT_TECHNICAL = { OR: [{ scheduleType: null }, { scheduleType: { not: "technical" } }] };

/** The assignments a scheme's case reads: VKI all of them, VIU Konsumsi all but the technical ones. */
export function assignmentScope(scheme: ComplianceScheme) {
  return scheme === "vki" ? {} : NOT_TECHNICAL;
}

/** Drafts were never submitted and withdrawn applications left the process — neither reaches Compliance. */
const EXCLUDED_STATUSES = ["DRAFT", "WITHDRAWN"] as const;

/** Prisma `where` for the applications Compliance covers (VIU — Konsumsi is picked by schemeOfCase — and VKI). */
export const COMPLIANCE_APPLICATIONS = { verificationType: { in: ["VIU", "VKI"] }, status: { notIn: [...EXCLUDED_STATUSES] } };

/** The Compliance scheme of a loaded application, or null when Compliance does not cover it. */
export function schemeOfCase(app: { verificationType: string; payload: unknown }): ComplianceScheme | null {
  return schemeOfApplication(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes);
}

function lhviuFields(value: unknown): { number: string | null; issuedAt: string | null } {
  if (!value || typeof value !== "object") return { number: null, issuedAt: null };
  const raw = value as { number?: unknown; issuedAt?: unknown };
  return {
    number: typeof raw.number === "string" && raw.number.trim() ? raw.number.trim() : null,
    issuedAt: typeof raw.issuedAt === "string" ? raw.issuedAt : null,
  };
}

/** Whether the application declares a Gudang among its locations. */
export function hasGudangLocation(payload: unknown): boolean {
  const locations = (payload as { locations?: { locationType?: string }[] } | null)?.locations ?? [];
  return locations.some((location) => location.locationType === "GUDANG");
}

function latest(dates: (Date | null | undefined)[]): string {
  const times = dates.filter((date): date is Date => Boolean(date)).map((date) => date.getTime());
  return new Date(Math.max(...times)).toISOString();
}

/** Every VIU Konsumsi and VKI application as a Daftar Permohonan row — read only. */
export async function loadComplianceCases(): Promise<CaseRow[]> {
  const applications = await db.application.findMany({
    where: COMPLIANCE_APPLICATIONS,
    select: {
      id: true,
      applicationNumber: true,
      verificationType: true,
      status: true,
      payload: true,
      submissionDate: true,
      createdAt: true,
      updatedAt: true,
      lhviuDocument: true,
      returnedByRole: true,
      company: { select: { companyName: true, nibNumber: true } },
      assignments: {
        select: { scheduleType: true, status: true, letterStatus: true, pmReviewStatus: true, updatedAt: true, locationVisits: { select: { id: true } } },
      },
      complianceCase: { include: { picUser: { select: { name: true } } } },
      complianceIssues: { select: { id: true, issueNumber: true, kind: true, title: true, sourceWorkspace: true, requirementKey: true, updatedAt: true } },
    },
  });

  return applications.flatMap((app) => {
      const scheme = schemeOfCase(app);
      if (!scheme) return [];
      const assignments = scheme === "vki" ? app.assignments : withoutTechnical(app.assignments);
      const payload = app.payload as { companyName?: string } | null;
      const submitted = effectiveSubmissionDate(app);
      const lhviu = lhviuFields(app.lhviuDocument);
      const complianceCase = app.complianceCase;
      const source: CaseSource = {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        companyName: app.company?.companyName ?? payload?.companyName ?? "—",
        nib: app.company?.nibNumber ?? "—",
        submittedAt: submitted.value,
        submittedIsSystemDate: submitted.isFallback,
        hasGudang: hasGudangLocation(app.payload),
        updatedAt: latest([
          app.updatedAt,
          ...assignments.map((a) => a.updatedAt),
          complianceCase?.updatedAt,
          ...app.complianceIssues.map((issue) => issue.updatedAt),
        ]),
        applicationStatus: app.status,
        returnedByRole: app.returnedByRole,
        assignments,
        scheme,
        lhviuIssued: lhviuIsIssued(lhviu),
        lhviuNumber: lhviu.number,
        lhviuIssuedAt: lhviu.issuedAt,
        complianceStatus: complianceCase?.complianceStatus ?? "BELUM_DIREVIEW",
        picUserId: complianceCase?.picUserId ?? null,
        picName: complianceCase?.picUser?.name ?? null,
        reviewFlag: complianceCase?.reviewFlag ?? false,
        finalReviewDone: complianceCase?.finalReviewDone ?? false,
        dossierComplete: complianceCase?.dossierComplete ?? false,
        findings: app.complianceIssues.map(({ id, issueNumber, kind, title, sourceWorkspace, requirementKey }) => ({ id, issueNumber, kind, title, sourceWorkspace, requirementKey })),
      };
      return [buildCaseRow(source)];
    });
}

/** The people a case can be assigned to: active users with the COMPLIANCE role. */
export async function loadCompliancePics(): Promise<{ id: string; name: string }[]> {
  return db.user.findMany({
    where: { role: "COMPLIANCE", NOT: { banned: true } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
