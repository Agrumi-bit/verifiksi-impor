import { Prisma } from "@/generated/prisma/client";

/**
 * Maps a known Prisma write error into a readable, user-facing message —
 * returns `null` for anything else so the caller falls back to a generic
 * 500. Without this, a Prisma error (e.g. a foreign key pointing at a row
 * that doesn't exist) propagates uncaught out of the route handler; Next.js
 * then returns a bare 500 with an EMPTY body, which the client can't parse
 * into any message at all — see build-create-data.ts's `brandOwnerId` fix
 * for the actual bug this was written to stop recurring.
 */
export function mapPrismaWriteError(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;

  switch (error.code) {
    case "P2002": {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "data");
      return `Data dengan ${fields} yang sama sudah terdaftar.`;
    }
    case "P2003": {
      // Foreign key violation — field_name is formatted like
      // "Merk_brandOwnerId_fkey (index)" by the Postgres connector; strip it
      // down to just the column name so the message stays readable.
      const fieldName = String(error.meta?.field_name ?? "");
      const match = fieldName.match(/_([A-Za-z]+)_fkey/);
      const column = match?.[1] ?? "referensi";
      return `Data ${column} yang dipilih tidak valid atau tidak ditemukan.`;
    }
    case "P2025":
      return "Data yang dituju tidak ditemukan — mungkin sudah dihapus pihak lain.";
    default:
      return null;
  }
}
