import "server-only";

import { db } from "@/lib/db";
import { applicationMatchesViuScheme } from "@/modules/project-manager-workspace/viu-schemes";
import type { FindingKind } from "../consolidation";
import type { FindingSeverity } from "../finding-rules";
import { KONSUMSI_SCHEME } from "./load-cases";

export type FindingRow = {
  id: string;
  issueNumber: string;
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  requirementKey: string;
  kind: FindingKind;
  severity: FindingSeverity;
  sourceWorkspace: string;
  title: string;
  evidenceA: string | null;
  evidenceB: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FindingFollowUp = { id: string; status: FindingKind; note: string; actorName: string | null; createdAt: string };

const FINDING_SELECT = {
  id: true,
  issueNumber: true,
  applicationId: true,
  requirementKey: true,
  kind: true,
  severity: true,
  sourceWorkspace: true,
  title: true,
  evidenceA: true,
  evidenceB: true,
  ownerId: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { name: true } },
  application: { select: { applicationNumber: true, payload: true, company: { select: { companyName: true } } } },
} as const;

type SelectedFinding = {
  id: string;
  issueNumber: string;
  applicationId: string;
  requirementKey: string;
  kind: FindingKind;
  severity: FindingSeverity;
  sourceWorkspace: string;
  title: string;
  evidenceA: string | null;
  evidenceB: string | null;
  ownerId: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  owner: { name: string } | null;
  application: { applicationNumber: string; payload: unknown; company: { companyName: string } | null };
};

function toRow(finding: SelectedFinding): FindingRow {
  const payload = finding.application.payload as { companyName?: string } | null;
  return {
    id: finding.id,
    issueNumber: finding.issueNumber,
    applicationId: finding.applicationId,
    applicationNumber: finding.application.applicationNumber,
    companyName: finding.application.company?.companyName ?? payload?.companyName ?? "—",
    requirementKey: finding.requirementKey,
    kind: finding.kind,
    severity: finding.severity,
    sourceWorkspace: finding.sourceWorkspace,
    title: finding.title,
    evidenceA: finding.evidenceA,
    evidenceB: finding.evidenceB,
    ownerId: finding.ownerId,
    ownerName: finding.owner?.name ?? null,
    createdByName: finding.createdByName,
    createdAt: finding.createdAt.toISOString(),
    updatedAt: finding.updatedAt.toISOString(),
  };
}

export async function loadFindings(): Promise<FindingRow[]> {
  const findings = await db.complianceIssue.findMany({ select: FINDING_SELECT, orderBy: { updatedAt: "desc" } });
  return findings.map(toRow);
}

export async function loadFinding(id: string): Promise<(FindingRow & { followUps: FindingFollowUp[] }) | null> {
  const finding = await db.complianceIssue.findUnique({
    where: { id },
    select: { ...FINDING_SELECT, followUps: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, note: true, actorName: true, createdAt: true } } },
  });
  if (!finding) return null;
  return {
    ...toRow(finding),
    followUps: finding.followUps.map((followUp) => ({ ...followUp, createdAt: followUp.createdAt.toISOString() })),
  };
}

/** Findings are only recorded on submitted VIU Konsumsi applications (the workspace's scope). */
export async function isKonsumsiCase(applicationId: string): Promise<boolean> {
  const app = await db.application.findUnique({ where: { id: applicationId }, select: { verificationType: true, status: true, payload: true } });
  if (!app || app.status === "DRAFT" || app.status === "WITHDRAWN") return false;
  return applicationMatchesViuScheme(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes, KONSUMSI_SCHEME);
}

/** An owner must be an active COMPLIANCE user; returns its name, or null when not allowed. */
export async function complianceUserName(userId: string): Promise<string | null> {
  const user = await db.user.findFirst({ where: { id: userId, role: "COMPLIANCE", NOT: { banned: true } }, select: { name: true } });
  return user?.name ?? null;
}
