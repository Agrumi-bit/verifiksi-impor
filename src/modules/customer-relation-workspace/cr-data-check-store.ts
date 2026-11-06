import "server-only";

import { db } from "@/lib/db";
import { parseCrDataCheck, type CrDataCheck, type CrDataCheckInput } from "./vki-check";

/*
 * Application.crDataCheck (migration 45) is read/written with SQL rather than the generated Prisma
 * client, like beritaAcaraPelaksanaan, so this runs against a client generated before the column existed.
 */
export async function readCrDataCheck(applicationId: string): Promise<CrDataCheck> {
  const rows = await db.$queryRaw<{ crDataCheck: unknown }[]>`
    SELECT "crDataCheck" FROM "application" WHERE "id" = ${applicationId}`;
  return parseCrDataCheck(rows[0]?.crDataCheck ?? null);
}

export async function writeCrDataCheck(applicationId: string, value: CrDataCheckInput, updatedByName: string): Promise<void> {
  const stored = { ...value, updatedAt: new Date().toISOString(), updatedByName };
  await db.$executeRaw`
    UPDATE "application" SET "crDataCheck" = ${JSON.stringify(stored)}::jsonb WHERE "id" = ${applicationId}`;
}
