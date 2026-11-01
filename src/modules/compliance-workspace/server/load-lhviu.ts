import "server-only";

import { db } from "@/lib/db";
import { lhviuIsIssued } from "@/modules/project-manager-workspace/lhviu-completion";
import type { ComplianceScheme } from "../scheme";
import { COMPLIANCE_APPLICATIONS, schemeOfCase } from "./load-cases";

export type IssuedLhviu = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  nib: string;
  scheme: ComplianceScheme;
  number: string;
  issuedAt: string;
  uploadedByName: string | null;
  path: string;
  fileName: string;
};

/** Every LHVIU (VIU Konsumsi) and LHVKI (VKI) the Project Manager has issued — read only. */
export async function loadIssuedLhviu(): Promise<IssuedLhviu[]> {
  const applications = await db.application.findMany({
    where: COMPLIANCE_APPLICATIONS,
    select: {
      id: true,
      applicationNumber: true,
      verificationType: true,
      payload: true,
      lhviuDocument: true,
      company: { select: { companyName: true, nibNumber: true } },
    },
  });
  return applications.flatMap((app) => {
    const payload = app.payload as { importTypes?: string[]; companyName?: string; nibNumber?: string } | null;
    const scheme = schemeOfCase(app);
    if (!scheme) return [];
    const document = app.lhviuDocument as { path?: string; fileName?: string; number?: string; issuedAt?: string; uploadedByName?: string } | null;
    if (!document?.path || !lhviuIsIssued(document)) return [];
    return [
      {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        companyName: app.company?.companyName ?? payload?.companyName ?? "—",
        nib: app.company?.nibNumber ?? payload?.nibNumber ?? "—",
        scheme,
        number: document.number!.trim(),
        issuedAt: document.issuedAt!,
        uploadedByName: document.uploadedByName ?? null,
        path: document.path,
        fileName: document.fileName ?? `${document.number}.pdf`,
      },
    ];
  });
}
