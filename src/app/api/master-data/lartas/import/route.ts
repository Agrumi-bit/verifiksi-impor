import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        hsCode: z.string().trim().min(1),
        apiP: z.boolean(),
        apiUIndustri: z.boolean(),
        apiUNonIndustri: z.boolean(),
        barangKonsumsi: z.boolean(),
        ppbb: z.boolean(),
      }),
    )
    .min(1, "Tidak ada baris untuk diimpor"),
});

// A full Lampiran runs to thousands of rows — Prisma's 5s interactive-transaction default is too short.
const IMPORT_TRANSACTION_TIMEOUT_MS = 120_000;

/** Lampiran writes HS Codes with or without dots ("5205.31.00" / "52053100") — compare digits only. */
function hsDigits(hsCode: string): string {
  return hsCode.replace(/\D/g, "");
}

/**
 * Bulk import of Lartas Impor from the Lampiran. HS Codes are resolved server-side against HS Code
 * master data (never trusted from the client). An HS Code that already has a Lartas relation gets
 * its applicant marks overwritten with the file's — the Lampiran is the source of truth, so
 * re-importing a revised Lampiran updates rather than duplicates.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const [hsCodes, existing] = await Promise.all([
    db.hsCodeMasterData.findMany({ select: { id: true, hsCode: true } }),
    db.lartasImpor.findMany({ select: { id: true, hsCodeId: true } }),
  ]);
  const hsIdByDigits = new Map(hsCodes.map((h) => [hsDigits(h.hsCode), h.id]));
  const lartasIdByHsId = new Map(existing.map((l) => [l.hsCodeId, l.id]));

  const unmatched: string[] = [];
  const duplicatesInFile: string[] = [];
  const seen = new Set<string>();
  let created = 0;
  let updated = 0;

  await db.$transaction(async (tx) => {
    for (const { hsCode, ...flags } of parsed.data.rows) {
      const hsCodeId = hsIdByDigits.get(hsDigits(hsCode));
      if (!hsCodeId) {
        unmatched.push(hsCode);
        continue;
      }
      if (seen.has(hsCodeId)) {
        duplicatesInFile.push(hsCode);
        continue;
      }
      seen.add(hsCodeId);

      const existingId = lartasIdByHsId.get(hsCodeId);
      if (existingId) {
        await tx.lartasImpor.update({ where: { id: existingId }, data: flags });
        updated += 1;
      } else {
        await tx.lartasImpor.create({ data: { hsCodeId, ...flags } });
        created += 1;
      }
    }
  }, { timeout: IMPORT_TRANSACTION_TIMEOUT_MS });

  return NextResponse.json({ data: { created, updated, unmatched, duplicatesInFile } });
}
