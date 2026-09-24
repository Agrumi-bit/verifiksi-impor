import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireVerifikatorSession } from "@/lib/require-verifikator-session";
import { DOCUMENT_FIELD_KEYS } from "@/modules/company/document-fields";
import { resolveCurrentDocumentPath } from "@/modules/company/document-versions";

export async function GET() {
  const { session, error } = await requireVerifikatorSession();
  if (error) return error;
  void session;

  const companies = await db.company.findMany({
    orderBy: { companyName: "asc" },
  });

  const companyIds = companies.map((company) => company.id);
  const versionRows = companyIds.length
    ? await db.companyDocumentVersion.findMany({
        where: { companyId: { in: companyIds } },
        orderBy: { version: "desc" },
        select: { companyId: true, fieldKey: true, verificationStatus: true },
      })
    : [];

  const latestStatusByCompanyField = new Map<string, string>();
  for (const row of versionRows) {
    const key = `${row.companyId}:${row.fieldKey}`;
    if (!latestStatusByCompanyField.has(key)) {
      latestStatusByCompanyField.set(key, row.verificationStatus);
    }
  }

  const data = companies.map((company) => {
    const fieldKeys = [...DOCUMENT_FIELD_KEYS, ...taxProofFieldKeys(company.taxProofs)];
    let pendingCount = 0;
    for (const fieldKey of fieldKeys) {
      const path = resolveCurrentDocumentPath(company, fieldKey);
      if (!path) continue;
      const status = latestStatusByCompanyField.get(`${company.id}:${fieldKey}`) ?? "NOT_YET_VERIFIED";
      if (status === "NOT_YET_VERIFIED") pendingCount += 1;
    }
    return {
      id: company.id,
      companyName: company.companyName,
      pendingCount,
    };
  });

  return NextResponse.json({ data });
}

function taxProofFieldKeys(taxProofs: unknown): string[] {
  const entries = (taxProofs as { year?: string }[] | null) ?? [];
  return entries.filter((entry) => entry.year).map((entry) => `taxProof:${entry.year}`);
}
