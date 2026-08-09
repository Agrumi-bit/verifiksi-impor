import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import type { IndustryGroup, CommodityGroup } from "@/generated/prisma/client";

const rowSchema = z.object({
  industryGroupName: z.string().trim().min(1),
  industryGroupCode: z.string().trim().optional().default(""),
  commodityGroupName: z.string().trim().optional().default(""),
  commodityGroupCode: z.string().trim().optional().default(""),
  subGroupName: z.string().trim().optional().default(""),
  subGroupCode: z.string().trim().optional().default(""),
});

const importSchema = z.object({
  rows: z.array(rowSchema).min(1, "Tidak ada baris untuk diimpor"),
});

const norm = (value: string) => value.trim().toLowerCase();

/**
 * Fills all three hierarchy levels (Kelompok Industri > Commodity Group > Commodity Sub Group)
 * from a single spreadsheet in one pass. Each level is find-or-create by name (case/whitespace
 * insensitive) scoped to its parent — a name that already exists (in the DB, or created earlier
 * in this same import) is reused rather than duplicated; a genuinely new name requires its own
 * code column to be filled in, otherwise that row is skipped and reported back.
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

  const industryByName = new Map<string, IndustryGroup>(
    (await db.industryGroup.findMany()).map((g) => [norm(g.name), g]),
  );
  const groupByKey = new Map<string, CommodityGroup>(
    (await db.commodityGroup.findMany()).map((g) => [`${g.industryGroupId ?? ""}:${norm(g.name)}`, g]),
  );
  const subGroupByKey = new Map<string, { id: string }>(
    (await db.commoditySubGroup.findMany()).map((g) => [`${g.commodityGroupId}:${norm(g.name)}`, g]),
  );

  let industryGroupsCreated = 0;
  let commodityGroupsCreated = 0;
  let subGroupsCreated = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (const [index, row] of parsed.data.rows.entries()) {
    const rowNo = index + 1;
    const industryKey = norm(row.industryGroupName);
    let industryGroup = industryByName.get(industryKey);
    if (!industryGroup) {
      if (!row.industryGroupCode) {
        skipped.push({ row: rowNo, reason: `Kelompok Industri baru "${row.industryGroupName}" butuh Kode Kelompok Industri` });
        continue;
      }
      industryGroup = await db.industryGroup.create({ data: { name: row.industryGroupName, code: row.industryGroupCode } });
      industryByName.set(industryKey, industryGroup);
      industryGroupsCreated += 1;
    }

    if (!row.commodityGroupName) continue;

    const groupKey = `${industryGroup.id}:${norm(row.commodityGroupName)}`;
    let commodityGroup = groupByKey.get(groupKey);
    if (!commodityGroup) {
      if (!row.commodityGroupCode) {
        skipped.push({ row: rowNo, reason: `Commodity Group baru "${row.commodityGroupName}" butuh Kode Commodity Group` });
        continue;
      }
      commodityGroup = await db.commodityGroup.create({
        data: { name: row.commodityGroupName, code: row.commodityGroupCode, industryGroupId: industryGroup.id },
      });
      groupByKey.set(groupKey, commodityGroup);
      commodityGroupsCreated += 1;
    }

    if (!row.subGroupName) continue;

    const subGroupKey = `${commodityGroup.id}:${norm(row.subGroupName)}`;
    if (subGroupByKey.has(subGroupKey)) continue;

    if (!row.subGroupCode) {
      skipped.push({ row: rowNo, reason: `Commodity Sub Group baru "${row.subGroupName}" butuh Kode Sub Group` });
      continue;
    }
    const subGroup = await db.commoditySubGroup.create({
      data: { name: row.subGroupName, code: row.subGroupCode, commodityGroupId: commodityGroup.id },
    });
    subGroupByKey.set(subGroupKey, subGroup);
    subGroupsCreated += 1;
  }

  return NextResponse.json({
    data: { industryGroupsCreated, commodityGroupsCreated, subGroupsCreated, skipped },
  });
}
