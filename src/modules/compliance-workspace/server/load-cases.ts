import "server-only";

import { db } from "@/lib/db";
import { effectiveSubmissionDate } from "@/modules/applications/submission-date";
import { lhviuIsIssued } from "@/modules/project-manager-workspace/lhviu-completion";
import { PM_VIU_SCHEMES, applicationMatchesViuScheme } from "@/modules/project-manager-workspace/viu-schemes";
import { buildCaseRow, type CaseRow, type CaseSource } from "../case-list";

/** Compliance covers VIU – Barang Konsumsi only (for now). */
export const KONSUMSI_SCHEME = PM_VIU_SCHEMES.find((scheme) => scheme.slug === "konsumsi")!;

/** Drafts were never submitted and withdrawn applications left the process — neither reaches Compliance. */
const EXCLUDED_STATUSES = ["DRAFT", "WITHDRAWN"] as const;

function lhviuFields(value: unknown): { number: string | null; issuedAt: string | null } {
  if (!value || typeof value !== "object") return { number: null, issuedAt: null };
  const raw = value as { number?: unknown; issuedAt?: unknown };
  return {
    number: typeof raw.number === "string" && raw.number.trim() ? raw.number.trim() : null,
    issuedAt: typeof raw.issuedAt === "string" ? raw.issuedAt : null,
  };
}

function latest(dates: (Date | null | undefined)[]): string {
  const times = dates.filter((date): date is Date => Boolean(date)).map((date) => date.getTime());
  return new Date(Math.max(...times)).toISOString();
}

/** Every VIU Konsumsi application as a Daftar Permohonan row — read only. */
export async function loadComplianceCases(): Promise<CaseRow[]> {
  const applications = await db.application.findMany({
    where: { verificationType: "VIU", status: { notIn: [...EXCLUDED_STATUSES] } },
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
      assignments: { select: { scheduleType: true, status: true, letterStatus: true, pmReviewStatus: true, updatedAt: true } },
      complianceCase: { include: { picUser: { select: { name: true } } } },
      complianceIssues: { select: { id: true, issueNumber: true, kind: true, title: true, sourceWorkspace: true, updatedAt: true } },
    },
  });

  return applications
    .filter((app) =>
      applicationMatchesViuScheme(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes, KONSUMSI_SCHEME),
    )
    .map((app) => {
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
        updatedAt: latest([
          app.updatedAt,
          ...app.assignments.map((a) => a.updatedAt),
          complianceCase?.updatedAt,
          ...app.complianceIssues.map((issue) => issue.updatedAt),
        ]),
        applicationStatus: app.status,
        returnedByRole: app.returnedByRole,
        assignments: app.assignments,
        lhviuIssued: lhviuIsIssued(lhviu),
        lhviuNumber: lhviu.number,
        lhviuIssuedAt: lhviu.issuedAt,
        complianceStatus: complianceCase?.complianceStatus ?? "BELUM_DIREVIEW",
        picUserId: complianceCase?.picUserId ?? null,
        picName: complianceCase?.picUser?.name ?? null,
        reviewFlag: complianceCase?.reviewFlag ?? false,
        finalReviewDone: complianceCase?.finalReviewDone ?? false,
        dossierComplete: complianceCase?.dossierComplete ?? false,
        findings: app.complianceIssues.map(({ id, issueNumber, kind, title, sourceWorkspace }) => ({ id, issueNumber, kind, title, sourceWorkspace })),
      };
      return buildCaseRow(source);
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
