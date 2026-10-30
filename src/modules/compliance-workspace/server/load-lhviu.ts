import "server-only";

import { db } from "@/lib/db";
import { lhviuIsIssued } from "@/modules/project-manager-workspace/lhviu-completion";
import { applicationMatchesViuScheme } from "@/modules/project-manager-workspace/viu-schemes";
import { KONSUMSI_SCHEME } from "./load-cases";

export type IssuedLhviu = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  nib: string;
  number: string;
  issuedAt: string;
  uploadedByName: string | null;
  path: string;
  fileName: string;
};

/** Every LHVIU the Project Manager has issued for a VIU Konsumsi application — read only. */
export async function loadIssuedLhviu(): Promise<IssuedLhviu[]> {
  const applications = await db.application.findMany({
    where: { verificationType: "VIU", status: { notIn: ["DRAFT", "WITHDRAWN"] } },
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
    if (!applicationMatchesViuScheme(app.verificationType, payload?.importTypes, KONSUMSI_SCHEME)) return [];
    const document = app.lhviuDocument as { path?: string; fileName?: string; number?: string; issuedAt?: string; uploadedByName?: string } | null;
    if (!document?.path || !lhviuIsIssued(document)) return [];
    return [
      {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        companyName: app.company?.companyName ?? payload?.companyName ?? "—",
        nib: app.company?.nibNumber ?? payload?.nibNumber ?? "—",
        number: document.number!.trim(),
        issuedAt: document.issuedAt!,
        uploadedByName: document.uploadedByName ?? null,
        path: document.path,
        fileName: document.fileName ?? `${document.number}.pdf`,
      },
    ];
  });
}
