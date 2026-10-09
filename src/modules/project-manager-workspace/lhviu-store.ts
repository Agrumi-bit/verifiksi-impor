import "server-only";

import { db } from "@/lib/db";

/** The Laporan Hasil VIU PDF the Project Manager uploads for an application. */
export type LhviuDocument = {
  path: string;
  fileName: string;
  uploadedAt: string;
  uploadedByName: string | null;
  /** Nomor LHVIU as printed on the document, e.g. "3/LHVIU/TBI/III/2026" — entered by the PM. */
  number: string | null;
  /** Tanggal terbit LHVIU (YYYY-MM-DD) — entered by the PM; LHVIU berlaku 1 tahun sejak terbit (Pasal 39 ayat (6)). */
  issuedAt: string | null;
};

function parse(value: unknown): LhviuDocument | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.path !== "string" || !raw.path) return null;
  return {
    path: raw.path,
    fileName: typeof raw.fileName === "string" ? raw.fileName : raw.path.split("/").pop() ?? "LHVIU.pdf",
    uploadedAt: typeof raw.uploadedAt === "string" ? raw.uploadedAt : new Date(0).toISOString(),
    uploadedByName: typeof raw.uploadedByName === "string" ? raw.uploadedByName : null,
    number: typeof raw.number === "string" && raw.number.trim() ? raw.number.trim() : null,
    issuedAt: typeof raw.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.issuedAt) ? raw.issuedAt : null,
  };
}

/*
 * Application.lhviuDocument (migration 36) is read/written with SQL rather than the generated Prisma
 * client so this compiles and runs against a client generated before the column existed.
 */
export async function readLhviuDocument(applicationId: string): Promise<LhviuDocument | null> {
  const rows = await db.$queryRaw<{ lhviuDocument: unknown }[]>`
    SELECT "lhviuDocument" FROM "application" WHERE "id" = ${applicationId}`;
  return parse(rows[0]?.lhviuDocument ?? null);
}

export async function writeLhviuDocument(applicationId: string, document: LhviuDocument): Promise<void> {
  await db.$executeRaw`
    UPDATE "application" SET "lhviuDocument" = ${JSON.stringify(document)}::jsonb WHERE "id" = ${applicationId}`;
}
