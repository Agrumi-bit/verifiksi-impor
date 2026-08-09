import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hsCodeMasterDataSchema } from "@/modules/master-data/schema";

const importSchema = z.object({
  rows: z.array(hsCodeMasterDataSchema).min(1, "Tidak ada baris untuk diimpor"),
});

function normalizeHsCode(hsCode: string): string {
  return hsCode.trim().toLowerCase();
}

/**
 * Bulk import for HS Code master data. Duplicate check runs server-side (not just client-side)
 * against every HS Code already registered — case/whitespace-insensitive — and against duplicates
 * within the uploaded file itself, so a stale client list or a file with repeated rows can't slip
 * duplicates into the database.
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

  const existing = await db.hsCodeMasterData.findMany({ select: { hsCode: true } });
  const existingCodes = new Set(existing.map((row) => normalizeHsCode(row.hsCode)));

  const toCreate: (typeof parsed.data.rows)[number][] = [];
  const duplicates: string[] = [];
  const seenInFile = new Set<string>();

  for (const row of parsed.data.rows) {
    const normalized = normalizeHsCode(row.hsCode);
    if (existingCodes.has(normalized) || seenInFile.has(normalized)) {
      duplicates.push(row.hsCode);
      continue;
    }
    seenInFile.add(normalized);
    toCreate.push(row);
  }

  if (toCreate.length > 0) {
    await db.hsCodeMasterData.createMany({ data: toCreate });
  }

  return NextResponse.json({
    data: { created: toCreate.length, duplicates },
  });
}
