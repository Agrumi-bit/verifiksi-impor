import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { electricityTariffMasterDataSchema } from "@/modules/master-data/schema";

const importSchema = z.object({
  rows: z.array(electricityTariffMasterDataSchema).min(1, "Tidak ada baris untuk diimpor"),
});

function normalizeKey(golongan: string, batasDaya: string): string {
  return `${golongan.trim().toLowerCase()}|${batasDaya.trim().toLowerCase()}`;
}

/**
 * Bulk import for Golongan Tarif Listrik master data. Duplicate check runs server-side against
 * every Golongan + Batas Daya combination already registered, and against duplicates within the
 * uploaded file itself, so a stale client list or a file with repeated rows can't slip duplicates
 * into the database.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const existing = await db.electricityTariffMasterData.findMany({ select: { golongan: true, batasDaya: true } });
  const existingKeys = new Set(existing.map((row) => normalizeKey(row.golongan, row.batasDaya)));

  const toCreate: (typeof parsed.data.rows)[number][] = [];
  const duplicates: string[] = [];
  const seenInFile = new Set<string>();

  for (const row of parsed.data.rows) {
    const key = normalizeKey(row.golongan, row.batasDaya);
    if (existingKeys.has(key) || seenInFile.has(key)) {
      duplicates.push(row.golongan);
      continue;
    }
    seenInFile.add(key);
    toCreate.push(row);
  }

  if (toCreate.length > 0) {
    await db.electricityTariffMasterData.createMany({ data: toCreate });
  }

  return NextResponse.json({
    data: { created: toCreate.length, duplicates },
  });
}
