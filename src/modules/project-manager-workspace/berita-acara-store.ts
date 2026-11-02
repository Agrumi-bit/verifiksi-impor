import "server-only";

import { db } from "@/lib/db";
import { parseBeritaAcara, type BeritaAcara } from "./berita-acara";

/*
 * Application.beritaAcaraPelaksanaan (migration 44) is read/written with SQL rather than the generated
 * Prisma client, like lhviuDocument, so this runs against a client generated before the column existed.
 */
export async function readBeritaAcara(applicationId: string): Promise<BeritaAcara | null> {
  const rows = await db.$queryRaw<{ beritaAcaraPelaksanaan: unknown }[]>`
    SELECT "beritaAcaraPelaksanaan" FROM "application" WHERE "id" = ${applicationId}`;
  return parseBeritaAcara(rows[0]?.beritaAcaraPelaksanaan ?? null);
}

export async function writeBeritaAcara(applicationId: string, beritaAcara: BeritaAcara): Promise<void> {
  await db.$executeRaw`
    UPDATE "application" SET "beritaAcaraPelaksanaan" = ${JSON.stringify(beritaAcara)}::jsonb WHERE "id" = ${applicationId}`;
}
