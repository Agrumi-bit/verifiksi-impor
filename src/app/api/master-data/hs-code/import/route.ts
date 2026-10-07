import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { hsCodeMasterDataSchema } from "@/modules/master-data/schema";

const importSchema = z.object({
  rows: z.array(hsCodeMasterDataSchema).min(1, "Tidak ada baris untuk diimpor"),
  /** "skip" (default): HS Codes already registered are left untouched and reported as duplicates.
   *  "update": an HS Code registered exactly once is overwritten with the file's row. */
  mode: z.enum(["skip", "update"]).optional().default("skip"),
});

function normalizeHsCode(hsCode: string): string {
  return hsCode.trim().toLowerCase();
}

/**
 * Bulk import for HS Code master data. Duplicate check runs server-side (not just client-side)
 * against every HS Code already registered — case/whitespace-insensitive — and against duplicates
 * within the uploaded file itself, so a stale client list or a file with repeated rows can't slip
 * duplicates into the database.
 *
 * In "update" mode an existing HS Code is corrected in place (Uraian, Sub Kelompok, Komoditas,
 * Satuan) — the only way to fix rows imported earlier with a wrong Komoditas, since re-importing in
 * "skip" mode just reports them as duplicates. An HS Code registered more than once is never
 * guessed at; it is reported in `ambiguous` instead.
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
  const { rows, mode } = parsed.data;

  const existing = await db.hsCodeMasterData.findMany({
    select: { id: true, hsCode: true, description: true, commodityGroupId: true, commoditySubGroupId: true, unitOfMeasurementId: true },
  });
  const existingByCode = new Map<string, (typeof existing)[number][]>();
  for (const row of existing) {
    const key = normalizeHsCode(row.hsCode);
    existingByCode.set(key, [...(existingByCode.get(key) ?? []), row]);
  }

  const toCreate: (typeof rows)[number][] = [];
  const toUpdate: { id: string; data: Omit<(typeof rows)[number], "hsCode"> }[] = [];
  const duplicates: string[] = [];
  const unchanged: string[] = [];
  const ambiguous: string[] = [];
  const duplicatesInFile: string[] = [];
  const seenInFile = new Set<string>();

  for (const row of rows) {
    const normalized = normalizeHsCode(row.hsCode);
    if (seenInFile.has(normalized)) {
      duplicatesInFile.push(row.hsCode);
      continue;
    }
    seenInFile.add(normalized);

    const matches = existingByCode.get(normalized) ?? [];
    if (matches.length === 0) {
      toCreate.push(row);
      continue;
    }
    if (mode === "skip") {
      duplicates.push(row.hsCode);
      continue;
    }
    if (matches.length > 1) {
      ambiguous.push(row.hsCode);
      continue;
    }
    const current = matches[0];
    const data = {
      description: row.description,
      commodityGroupId: row.commodityGroupId,
      commoditySubGroupId: row.commoditySubGroupId,
      unitOfMeasurementId: row.unitOfMeasurementId,
    };
    const same =
      current.description === data.description &&
      current.commodityGroupId === data.commodityGroupId &&
      current.commoditySubGroupId === data.commoditySubGroupId &&
      current.unitOfMeasurementId === data.unitOfMeasurementId;
    if (same) unchanged.push(row.hsCode);
    else toUpdate.push({ id: current.id, data });
  }

  await db.$transaction([
    ...(toCreate.length > 0 ? [db.hsCodeMasterData.createMany({ data: toCreate })] : []),
    ...toUpdate.map((u) => db.hsCodeMasterData.update({ where: { id: u.id }, data: u.data })),
  ]);

  return NextResponse.json({
    data: {
      created: toCreate.length,
      updated: toUpdate.length,
      unchanged,
      duplicates,
      duplicatesInFile,
      ambiguous,
    },
  });
}
