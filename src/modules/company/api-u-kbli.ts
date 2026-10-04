import { NextResponse } from "next/server";

import { db } from "@/lib/db";

import { API_U_KBLI_UTAMA_ERROR, findDisallowedApiUKbliUtama } from "./schema";

/**
 * Server-side check of the API-U KBLI Utama rule against the active rows of System
 * Configuration → KBLI Utama API-U. Lives outside `companyWizardSchema` because the list is in
 * the database, which the (client-shared, synchronous) Zod schema can't read. Returns a 400
 * response to send back, or null when the entries are fine.
 */
export async function checkApiUKbliUtama(
  apiType: string | null | undefined,
  kbliEntries: { code: string; category?: string; version?: string }[],
): Promise<NextResponse | null> {
  if (apiType !== "API-U") return null;
  const allowed = await db.apiUKbliUtama.findMany({
    where: { status: "ACTIVE" },
    select: { code: true, description: true, version: true },
  });
  if (findDisallowedApiUKbliUtama(kbliEntries, allowed) === -1) return null;
  return NextResponse.json({ error: API_U_KBLI_UTAMA_ERROR }, { status: 400 });
}
