import { db } from "@/lib/db";

export type ReportItemResultValue = "PASS" | "FAIL" | "NA";
export type ReportItemResult = { result: ReportItemResultValue | null; note: string | null };
export type ReportDecisionValue = "VERIFIED" | "REJECTED" | "REVISION";

export type ReportVerificationState = {
  items: Record<string, ReportItemResult>;
  decision: ReportDecisionValue | null;
  decisionNote: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
};

const EMPTY_STATE: ReportVerificationState = {
  items: {},
  decision: null,
  decisionNote: null,
  verifiedByName: null,
  verifiedAt: null,
};

export async function getReportVerification(locationId: string): Promise<ReportVerificationState> {
  const visit = await db.locationVisit.findUnique({ where: { id: locationId }, select: { reportVerification: true } });
  const stored = visit?.reportVerification as ReportVerificationState | null;
  return stored ?? EMPTY_STATE;
}

export async function patchReportVerificationItem(
  locationId: string,
  itemId: string,
  patch: Partial<ReportItemResult>,
): Promise<ReportVerificationState> {
  const current = await getReportVerification(locationId);
  const currentItem = current.items[itemId] ?? { result: null, note: null };
  const updated: ReportVerificationState = { ...current, items: { ...current.items, [itemId]: { ...currentItem, ...patch } } };
  await db.locationVisit.update({ where: { id: locationId }, data: { reportVerification: updated } });
  return updated;
}

export async function setReportVerificationDecision(
  locationId: string,
  decision: ReportDecisionValue,
  decisionNote: string | null,
  verifiedByName: string,
): Promise<ReportVerificationState> {
  const current = await getReportVerification(locationId);
  const updated: ReportVerificationState = {
    ...current,
    decision,
    decisionNote,
    verifiedByName,
    verifiedAt: new Date().toISOString(),
  };
  await db.locationVisit.update({ where: { id: locationId }, data: { reportVerification: updated } });
  return updated;
}
